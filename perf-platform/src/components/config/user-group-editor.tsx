"use client";

import * as React from "react";
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { UserGroup, UserGroupPreset } from "@/lib/types";
import { ACTION_LABELS, USER_GROUP_LABELS } from "@/lib/presets";
import { cn } from "@/lib/utils";

export function UserGroupEditor({
  group,
  onChange,
  onRemove,
}: {
  group: UserGroup;
  onChange: (group: UserGroup) => void;
  onRemove: () => void;
}) {
  const [showActions, setShowActions] = React.useState(false);

  function patch(p: Partial<UserGroup>) {
    onChange({ ...group, ...p });
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <GripVertical className="size-4 text-muted-foreground shrink-0" />
        <Input
          value={group.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-8 max-w-[220px] font-medium"
        />
        <Select
          value={group.preset}
          onValueChange={(v) => v && patch({ preset: v as UserGroupPreset })}
        >
          <SelectTrigger className="h-8 w-[160px] ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(USER_GROUP_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Number of users</Label>
            <Input
              type="number"
              min={1}
              value={group.users}
              onChange={(e) => patch({ users: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ramp up (sec)</Label>
            <Input
              type="number"
              min={0}
              value={group.rampUpSec}
              onChange={(e) => patch({ rampUpSec: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Session duration (sec)</Label>
            <Input
              type="number"
              min={1}
              value={group.sessionDurationSec}
              onChange={(e) => patch({ sessionDurationSec: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Session timeout (sec)</Label>
            <Input
              type="number"
              min={1}
              value={group.sessionTimeoutSec}
              onChange={(e) => patch({ sessionTimeoutSec: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Think time: {group.thinkTimeMs[0]}–{group.thinkTimeMs[1]}ms
            </Label>
            <Slider
              min={0}
              max={10000}
              step={100}
              value={group.thinkTimeMs}
              onValueChange={(v) => {
                const arr = v as number[];
                patch({ thinkTimeMs: [arr[0], arr[1]] });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Random wait: {group.randomWaitMs[0]}–{group.randomWaitMs[1]}ms
            </Label>
            <Slider
              min={0}
              max={6000}
              step={100}
              value={group.randomWaitMs}
              onValueChange={(v) => {
                const arr = v as number[];
                patch({ randomWaitMs: [arr[0], arr[1]] });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Click speed</Label>
            <Select
              value={group.clickSpeed}
              onValueChange={(v) => v && patch({ clickSpeed: v as UserGroup["clickSpeed"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={group.randomNavigation}
            onCheckedChange={(v) => patch({ randomNavigation: v })}
          />
          <Label className="text-sm">Random navigation between pages</Label>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground py-2"
          >
            <span>Behavior mix ({group.actions.length} actions)</span>
            <ChevronDown className={cn("size-3.5 transition-transform", showActions && "rotate-180")} />
          </button>
          {showActions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
              {group.actions.map((action) => (
                <div key={action.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{ACTION_LABELS[action.type]}</span>
                    <span className="text-muted-foreground">{action.probability}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[action.probability]}
                    onValueChange={(v) => {
                      const arr = v as number[];
                      patch({
                        actions: group.actions.map((a) =>
                          a.type === action.type ? { ...a, probability: arr[0] } : a
                        ),
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
