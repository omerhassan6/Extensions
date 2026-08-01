"use client";

import { create } from "zustand";
import { LoadTestSimulator, buildReport } from "./simulator";
import { MetricSnapshot, RequestLogEntry, TestConfig, TestReport } from "./types";
import { saveHistoryEntry } from "./storage";

export type RunStatus = "idle" | "running" | "completed" | "stopped";

interface TestRunState {
  config: TestConfig | null;
  status: RunStatus;
  elapsedSec: number;
  series: MetricSnapshot[];
  logs: RequestLogEntry[];
  report: TestReport | null;
  intervalId: ReturnType<typeof setInterval> | null;
  simulator: LoadTestSimulator | null;
  startedAt: number;

  start: (config: TestConfig) => void;
  stop: () => void;
  reset: () => void;
}

const MAX_LOG_ENTRIES = 500;

export const useTestRunStore = create<TestRunState>((set, get) => ({
  config: null,
  status: "idle",
  elapsedSec: 0,
  series: [],
  logs: [],
  report: null,
  intervalId: null,
  simulator: null,
  startedAt: 0,

  start: (config: TestConfig) => {
    const existing = get().intervalId;
    if (existing) clearInterval(existing);

    const simulator = new LoadTestSimulator(config);
    const startedAt = Date.now();

    set({
      config,
      status: "running",
      elapsedSec: 0,
      series: [],
      logs: [],
      report: null,
      simulator,
      startedAt,
    });

    const intervalId = setInterval(() => {
      const state = get();
      if (!state.simulator || !state.config) return;
      const nextElapsed = state.elapsedSec + 1;
      const { snapshot, logs } = state.simulator.tick(nextElapsed);
      const series = [...state.series, snapshot];
      const combinedLogs = [...logs, ...state.logs].slice(0, MAX_LOG_ENTRIES);

      set({ elapsedSec: nextElapsed, series, logs: combinedLogs });

      if (nextElapsed >= state.config.concurrency.testDurationSec) {
        get().stop();
      }
    }, 1000);

    set({ intervalId });
  },

  stop: () => {
    const state = get();
    if (state.intervalId) clearInterval(state.intervalId);
    if (!state.config) {
      set({ intervalId: null, status: "idle" });
      return;
    }
    const finishedAt = Date.now();
    const report = buildReport(
      state.config,
      state.series,
      state.logs,
      state.startedAt,
      finishedAt
    );
    const wasCompleted =
      state.elapsedSec >= state.config.concurrency.testDurationSec;
    set({
      intervalId: null,
      status: wasCompleted ? "completed" : "stopped",
      report,
    });
    saveHistoryEntry({
      id: state.config.id + "-" + finishedAt,
      config: state.config,
      report,
      status: wasCompleted ? "completed" : "stopped",
    });
  },

  reset: () => {
    const state = get();
    if (state.intervalId) clearInterval(state.intervalId);
    set({
      config: null,
      status: "idle",
      elapsedSec: 0,
      series: [],
      logs: [],
      report: null,
      intervalId: null,
      simulator: null,
      startedAt: 0,
    });
  },
}));
