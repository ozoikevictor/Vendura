import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}

export function RatingStars({
  rating,
  size = 14,
  className,
  showValue = false,
  count,
}: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              i <= Math.round(rating)
                ? "fill-clay text-clay"
                : "fill-muted text-muted-foreground/40",
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-medium text-muted-foreground">
          {rating.toFixed(1)}
          {count != null && ` (${count})`}
        </span>
      )}
    </div>
  );
}
