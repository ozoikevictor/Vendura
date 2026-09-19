import type { Category } from "@/types";

const sub = (categorySlug: string, names: string[]) =>
  names.map((name) => ({
    id: `${categorySlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name,
  }));

export const categories: Category[] = [
  { id: "cat-electronics", slug: "phones-electronics", name: "Phones & Electronics", icon: "Smartphone", productCount: 12400, subcategories: sub("phones-electronics", ["Phones", "Laptops", "TVs", "Audio", "Accessories"]) },
  { id: "cat-computers", slug: "computers", name: "Computers", icon: "Laptop", productCount: 4300, subcategories: sub("computers", ["Laptops", "Desktops", "Monitors", "Printers", "Storage"]) },
  { id: "cat-fashion", slug: "fashion", name: "Fashion", icon: "Shirt", productCount: 38900, subcategories: sub("fashion", ["Men's Clothing", "Women's Clothing", "Traditional Wear", "Bags", "Kids"]) },
  { id: "cat-shoes", slug: "shoes", name: "Shoes", icon: "Footprints", productCount: 9800, subcategories: sub("shoes", ["Sneakers", "Formal Shoes", "Sandals", "Boots", "Slippers"]) },
  { id: "cat-beauty", slug: "beauty-hair", name: "Beauty & Hair", icon: "Sparkles", productCount: 9200, subcategories: sub("beauty-hair", ["Hair Care", "Skin Care", "Makeup", "Wigs & Extensions", "Tools"]) },
  { id: "cat-jewelry", slug: "jewelry-accessories", name: "Jewelry & Accessories", icon: "Gem", productCount: 5100, subcategories: sub("jewelry-accessories", ["Earrings", "Necklaces", "Bracelets", "Rings", "Beads"]) },
  { id: "cat-watches", slug: "watches", name: "Watches", icon: "Watch", productCount: 3100, subcategories: sub("watches", ["Men's Watches", "Women's Watches", "Smart Watches", "Straps"]) },
  { id: "cat-perfumes", slug: "perfumes", name: "Perfumes", icon: "SprayCan", productCount: 2700, subcategories: sub("perfumes", ["Men", "Women", "Unisex", "Oils"]) },
  { id: "cat-home", slug: "home-furniture", name: "Home & Furniture", icon: "Sofa", productCount: 21700, subcategories: sub("home-furniture", ["Living Room", "Bedroom", "Decor", "Lighting", "Storage"]) },
  { id: "cat-kitchen", slug: "kitchen-equipment", name: "Kitchen Equipment", icon: "CookingPot", productCount: 6400, subcategories: sub("kitchen-equipment", ["Cookware", "Small Appliances", "Utensils", "Tableware"]) },
  { id: "cat-building", slug: "building-materials", name: "Building Materials", icon: "BrickWall", productCount: 3800, subcategories: sub("building-materials", ["Cement", "Roofing", "Tiles", "Paint", "Steel"]) },
  { id: "cat-plumbing", slug: "plumbing-materials", name: "Plumbing Materials", icon: "Droplets", productCount: 2200, subcategories: sub("plumbing-materials", ["Pipes", "Faucets", "Fittings", "Tools", "Water Heaters"]) },
  { id: "cat-automotive", slug: "automotive", name: "Automotive", icon: "Car", productCount: 5600, subcategories: sub("automotive", ["Tyres", "Batteries", "Spare Parts", "Car Care"]) },
  { id: "cat-engine-oil", slug: "engine-oil-car-accessories", name: "Engine Oil & Car Accessories", icon: "Fuel", productCount: 1900, subcategories: sub("engine-oil-car-accessories", ["Engine Oil", "Filters", "Interior", "Electronics"]) },
  { id: "cat-books", slug: "books", name: "Books", icon: "BookOpen", productCount: 7200, subcategories: sub("books", ["Fiction", "Business", "Education", "Children"]) },
  { id: "cat-groceries", slug: "groceries", name: "Groceries", icon: "ShoppingBasket", productCount: 8800, subcategories: sub("groceries", ["Rice & Grains", "Oils", "Beverages", "Snacks", "Spices"]) },
  { id: "cat-sports", slug: "sports", name: "Sports", icon: "Dumbbell", productCount: 2600, subcategories: sub("sports", ["Football", "Fitness", "Outdoor", "Apparel"]) },
  { id: "cat-baby", slug: "baby-products", name: "Baby Products", icon: "Baby", productCount: 3400, subcategories: sub("baby-products", ["Strollers", "Feeding", "Diapers", "Toys"]) },
  { id: "cat-office", slug: "office-supplies", name: "Office Supplies", icon: "Briefcase", productCount: 2900, subcategories: sub("office-supplies", ["Furniture", "Stationery", "Printing", "Storage"]) },
  { id: "cat-tools", slug: "tools", name: "Tools", icon: "Wrench", productCount: 2100, subcategories: sub("tools", ["Power Tools", "Hand Tools", "Measuring", "Safety"]) },
  { id: "cat-appliances", slug: "appliances", name: "Appliances", icon: "Refrigerator", productCount: 4700, subcategories: sub("appliances", ["Refrigerators", "Washing Machines", "Air Conditioners", "Generators"]) },
  { id: "cat-other", slug: "other", name: "Other", icon: "Package", productCount: 1200, subcategories: sub("other", ["Miscellaneous"]) },
];

export const popularCategorySlugs = [
  "phones-electronics",
  "fashion",
  "beauty-hair",
  "watches",
  "home-furniture",
  "automotive",
  "plumbing-materials",
  "groceries",
];
