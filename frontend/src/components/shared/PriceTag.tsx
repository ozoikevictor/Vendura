import { cn } from "@/lib/utils";
import { formatNaira, discountPercent } from "@/utils/format";

interface PriceTagProps {
  price: number;
  oldPrice?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceTag({ price, oldPrice, className, size = "md" }: PriceTagProps) {
  const discount = discountPercent(price, oldPrice);
  const sizeClass = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-bold text-foreground", sizeClass)}>
        {formatNaira(price)}
      </span>
      {oldPrice && oldPrice > price && (
        <span className="text-sm text-muted-foreground line-through">
          {formatNaira(oldPrice)}
        </span>
      )}
      {discount != null && (
        <span className="text-xs font-semibold text-clay-foreground bg-clay-soft px-1.5 py-0.5 rounded">
          -{discount}%
        </span>
      )}
    </div>
  );
}
