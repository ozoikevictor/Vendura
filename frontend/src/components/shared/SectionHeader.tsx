import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  leading,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-6", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className="flex min-w-0 items-start gap-2">
          {leading}
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
