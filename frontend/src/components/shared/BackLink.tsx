import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type BackLinkProps = {
  fallback?:
    | "/"
    | "/marketplace"
    | "/categories"
    | "/stores"
    | "/wishlist"
    | "/customer/ai"
    | "/customer/orders";
  label?: string;
  className?: string;
};

export function BackLink({ fallback = "/marketplace", label = "Back", className }: BackLinkProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate({ to: fallback });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
