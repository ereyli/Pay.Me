"use client";

import { Delete } from "lucide-react";

type NumericKeypadProps = {
  value: string;
  onChange: (next: string) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

export function NumericKeypad({ value, onChange }: NumericKeypadProps) {
  const push = (key: string) => {
    if (key === "." && value.includes(".")) return;
    if (key === "." && value.length === 0) {
      onChange("0.");
      return;
    }
    if (value.includes(".") && value.split(".")[1]?.length >= 6) return;
    onChange(`${value}${key}`);
  };

  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => push(key)}
            className="h-10 rounded-lg bg-card border border-border/70 text-base font-semibold active:scale-[0.98] transition"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          className="h-10 rounded-lg bg-card border border-border/70 flex items-center justify-center active:scale-[0.98] transition"
          aria-label="Delete"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={clear}
        className="w-full h-9 rounded-lg text-sm text-muted-foreground border border-border/60 bg-card"
      >
        Clear
      </button>
    </div>
  );
}
