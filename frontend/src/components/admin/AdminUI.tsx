import type { ReactNode } from "react";
import { DataLoader } from "@/components/shared/DataLoader";

export function AdminHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-2xl font-bold text-foreground">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

export function Metric({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon: ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className="text-primary">{icon}</span></div><p className="mt-3 text-2xl font-bold text-foreground">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}

export function Status({ value }: { value: string }) {
  const good = ["paid", "active", "verified", "delivered", "released", "payment_confirmed"].includes(value);
  const bad = ["failed", "suspended", "cancelled", "refunded", "disputed"].includes(value);
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${good ? "bg-success-soft text-success" : bad ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{value.replaceAll("_", " ")}</span>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-border bg-card"><div className="overflow-x-auto">{children}</div></div>;
}

export function LoadingRows() { return <DataLoader label="Loading dashboard data" />; }
