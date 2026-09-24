import { useIsFetching } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DataLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-40 items-center justify-center", className)} role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <Store className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function GlobalDataLoader() {
  const fetching = useIsFetching();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fetching) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [fetching]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15" role="progressbar" aria-label="Loading page data">
      <span className="block h-full w-1/3 animate-[vendura-loading_1.1s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}

