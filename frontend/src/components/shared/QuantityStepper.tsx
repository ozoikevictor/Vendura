import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  size?: "sm" | "md";
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
  size = "md",
}: QuantityStepperProps) {
  const btnSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-accent",
          btnSize,
        )}
      >
        <Minus className={iconSize} />
      </button>
      <span
        className={cn(
          "min-w-8 text-center font-medium tabular-nums text-foreground",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "flex items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-accent",
          btnSize,
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
