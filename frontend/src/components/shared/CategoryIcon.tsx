import {
  Smartphone, Laptop, Shirt, Footprints, Sparkles, Gem, Watch,
  SprayCan, Sofa, CookingPot, BrickWall, Droplets, Car, Fuel,
  BookOpen, ShoppingBasket, Dumbbell, Baby, Briefcase, Wrench,
  Refrigerator, Package, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Shirt, Footprints, Sparkles, Gem, Watch,
  SprayCan, Sofa, CookingPot, BrickWall, Droplets, Car, Fuel,
  BookOpen, ShoppingBasket, Dumbbell, Baby, Briefcase, Wrench,
  Refrigerator, Package,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = iconMap[name] ?? Package;
  return <Icon className={className} />;
}
