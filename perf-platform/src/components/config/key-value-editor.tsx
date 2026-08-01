"use client";

import { v4 as uuid } from "uuid";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyValue } from "@/lib/types";

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  function update(id: string, patch: Partial<KeyValue>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }
  function add() {
    onChange([...items, { id: uuid(), key: "", value: "", enabled: true }]);
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Checkbox
            checked={item.enabled}
            onCheckedChange={(v) => update(item.id, { enabled: !!v })}
          />
          <Input
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => update(item.id, { key: e.target.value })}
            className="flex-1"
          />
          <Input
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => update(item.id, { value: e.target.value })}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => remove(item.id)}>
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="size-3.5" /> Add row
      </Button>
    </div>
  );
}
