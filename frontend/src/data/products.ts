import type { Product, ProductVariant, DeliveryOption } from "@/types";
import phone from "@/assets/products/phone.jpg";
import earbuds from "@/assets/products/earbuds.jpg";
import laptop from "@/assets/products/laptop.jpg";
import tv from "@/assets/products/tv.jpg";
import ankaraDress from "@/assets/products/ankara-dress.jpg";
import senator from "@/assets/products/senator.jpg";
import sneakers from "@/assets/products/sneakers.jpg";
import loafers from "@/assets/products/loafers.jpg";
import earrings from "@/assets/products/earrings.jpg";
import necklace from "@/assets/products/necklace.jpg";
import watch from "@/assets/products/watch.jpg";
import perfume from "@/assets/products/perfume.jpg";
import hairCream from "@/assets/products/hair-cream.jpg";
import skillet from "@/assets/products/skillet.jpg";
import sofa from "@/assets/products/sofa.jpg";
import kettle from "@/assets/products/kettle.jpg";
import pvcPipes from "@/assets/products/pvc-pipes.jpg";
import faucet from "@/assets/products/faucet.jpg";
import cement from "@/assets/products/cement.jpg";
import engineOil from "@/assets/products/engine-oil.jpg";
import tyre from "@/assets/products/tyre.jpg";
import drill from "@/assets/products/drill.jpg";
import rice from "@/assets/products/rice.jpg";
import book from "@/assets/products/book.jpg";
import stroller from "@/assets/products/stroller.jpg";
import officeChair from "@/assets/products/office-chair.jpg";
import football from "@/assets/products/football.jpg";
import blender from "@/assets/products/blender.jpg";

export const productImages = {
  phone, earbuds, laptop, tv, ankaraDress, senator, sneakers, loafers, earrings, necklace, watch, perfume,
  hairCream, skillet, sofa, kettle, pvcPipes, faucet, cement, engineOil, tyre, drill, rice, book, stroller,
  officeChair, football, blender,
};

const standardDelivery: DeliveryOption[] = [
  { id: "del-standard", label: "Standard delivery", fee: 2500, etaDays: [2, 5] },
  { id: "del-express", label: "Express delivery", fee: 5000, etaDays: [1, 2] },
  { id: "del-pickup", label: "Pickup from store", fee: 0, etaDays: [0, 1] },
];

const heavyDelivery: DeliveryOption[] = [
  { id: "del-freight", label: "Freight delivery", fee: 15000, etaDays: [3, 7] },
  { id: "del-pickup", label: "Pickup from warehouse", fee: 0, etaDays: [0, 1] },
];

type Seed = Omit<Product, "currency" | "createdAt" | "updatedAt" | "status" | "deliveryOptions" | "tags" | "lowStockThreshold"> &
  Partial<Pick<Product, "status" | "deliveryOptions" | "tags" | "lowStockThreshold">>;

const seed = (p: Seed, daysOld: number): Product => {
  const created = new Date();
  created.setDate(created.getDate() - daysOld);
  return {
    currency: "NGN",
    status: p.stock === 0 ? "out_of_stock" : "active",
    deliveryOptions: standardDelivery,
    tags: [],
    lowStockThreshold: 5,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    ...p,
  };
};

const v = (id: string, sku: string, attributes: Record<string, string>, stock: number, price?: number): ProductVariant => {
  const variant: ProductVariant = { id, sku, attributes, stock };
  if (price !== undefined) variant.price = price;
  return variant;
};

export const products: Product[] = [
  seed({
    id: "p-aurora-5g", slug: "aurora-5g-smartphone-256gb", name: "Aurora 5G Smartphone · 256GB · Dual SIM",
    description: "A flagship-grade 6.7\" AMOLED display, 50MP triple camera and two-day battery. Ships with Nigerian charger and 12-month TechNaija warranty.",
    images: [phone, phone, phone], price: 245000, oldPrice: 299000, categoryId: "cat-electronics", subcategoryId: "phones-electronics-phones",
    storeId: "store-technaija", sku: "TN-AUR-256", stock: 14, rating: 4.8, reviewCount: 212, soldCount: 890, negotiable: true, featured: true,
    variantOptions: [{ name: "Color", values: ["Graphite", "Lagoon", "Silver"] }, { name: "Storage", values: ["128GB", "256GB"] }],
    variants: [
      v("p-aurora-5g-gr-128", "TN-AUR-128-GR", { Color: "Graphite", Storage: "128GB" }, 6, 215000),
      v("p-aurora-5g-gr-256", "TN-AUR-256-GR", { Color: "Graphite", Storage: "256GB" }, 5),
      v("p-aurora-5g-lg-256", "TN-AUR-256-LG", { Color: "Lagoon", Storage: "256GB" }, 3),
      v("p-aurora-5g-sv-256", "TN-AUR-256-SV", { Color: "Silver", Storage: "256GB" }, 0),
    ],
    specifications: [{ label: "Display", value: "6.7\" AMOLED, 120Hz" }, { label: "RAM", value: "8GB" }, { label: "Battery", value: "5000mAh" }, { label: "Camera", value: "50MP + 12MP + 8MP" }, { label: "Warranty", value: "12 months" }],
    tags: ["phone", "android", "5g"],
  }, 12),
  seed({
    id: "p-nova-buds", slug: "nova-wireless-earbuds", name: "Nova ANC Wireless Earbuds",
    description: "Active noise cancellation, 30-hour total battery with case, IPX4 sweat resistance.",
    images: [earbuds], price: 32500, oldPrice: 39000, categoryId: "cat-electronics", subcategoryId: "phones-electronics-audio",
    storeId: "store-technaija", sku: "TN-NOVA-01", stock: 42, rating: 4.6, reviewCount: 98, soldCount: 460, negotiable: false, featured: true,
    variantOptions: [{ name: "Color", values: ["White", "Black"] }],
    variants: [v("p-nova-buds-w", "TN-NOVA-01-W", { Color: "White" }, 30), v("p-nova-buds-b", "TN-NOVA-01-B", { Color: "Black" }, 12)],
    specifications: [{ label: "Battery", value: "8h + 22h case" }, { label: "Bluetooth", value: "5.3" }, { label: "Water resistance", value: "IPX4" }],
  }, 30),
  seed({
    id: "p-zenbook-14", slug: "zenbook-14-laptop", name: "ZenBook 14\" Ultrabook · Core i7 · 16GB · 512GB SSD",
    description: "Lightweight 1.2kg aluminium ultrabook for professionals. Backlit keyboard, Wi-Fi 6, Windows 11 Pro.",
    images: [laptop], price: 985000, categoryId: "cat-computers", subcategoryId: "computers-laptops",
    storeId: "store-technaija", sku: "TN-ZB14-I7", stock: 4, rating: 4.9, reviewCount: 41, soldCount: 120, negotiable: true,
    variantOptions: [{ name: "RAM", values: ["16GB", "32GB"] }],
    variants: [v("p-zenbook-14-16", "TN-ZB14-I7-16", { RAM: "16GB" }, 3), v("p-zenbook-14-32", "TN-ZB14-I7-32", { RAM: "32GB" }, 1, 1150000)],
    specifications: [{ label: "Processor", value: "Intel Core i7 13th Gen" }, { label: "Display", value: "14\" 2.8K OLED" }, { label: "Weight", value: "1.2kg" }],
  }, 5),
  seed({
    id: "p-smart-tv-43", slug: "43-inch-smart-tv", name: "43\" 4K Smart TV with Netflix & YouTube",
    description: "Ultra HD LED panel with built-in streaming apps, 3 HDMI ports and Bluetooth audio.",
    images: [tv], price: 265000, oldPrice: 310000, categoryId: "cat-electronics", subcategoryId: "phones-electronics-tvs",
    storeId: "store-technaija", sku: "TN-TV43-4K", stock: 9, rating: 4.5, reviewCount: 67, soldCount: 210, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Resolution", value: "3840 × 2160" }, { label: "Ports", value: "3× HDMI, 2× USB" }],
    deliveryOptions: heavyDelivery,
  }, 45),
  seed({
    id: "p-ankara-midi", slug: "ankara-print-midi-dress", name: "Ankara Print Midi Dress with Tie Waist",
    description: "100% cotton Ankara, fully lined, with side pockets. Made to order in 5 working days for custom sizes.",
    images: [ankaraDress], price: 24500, oldPrice: 32000, categoryId: "cat-fashion", subcategoryId: "fashion-women-s-clothing",
    storeId: "store-ada-fashion", sku: "AF-ANK-MD", stock: 22, rating: 4.7, reviewCount: 156, soldCount: 720, negotiable: true, featured: true,
    variantOptions: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
    variants: [v("p-ankara-midi-s", "AF-ANK-MD-S", { Size: "S" }, 4), v("p-ankara-midi-m", "AF-ANK-MD-M", { Size: "M" }, 8), v("p-ankara-midi-l", "AF-ANK-MD-L", { Size: "L" }, 7), v("p-ankara-midi-xl", "AF-ANK-MD-XL", { Size: "XL" }, 3)],
    specifications: [{ label: "Fabric", value: "100% cotton Ankara" }, { label: "Length", value: "Midi" }, { label: "Care", value: "Hand wash cold" }],
  }, 20),
  seed({
    id: "p-senator-set", slug: "mens-senator-kaftan-set", name: "Men's Embroidered Senator Kaftan Set with Cap",
    description: "Premium cashmere-blend senator material with tonal embroidery. Includes matching cap.",
    images: [senator], price: 48000, categoryId: "cat-fashion", subcategoryId: "fashion-traditional-wear",
    storeId: "store-ada-fashion", sku: "AF-SEN-01", stock: 15, rating: 4.8, reviewCount: 88, soldCount: 310, negotiable: true,
    variantOptions: [{ name: "Color", values: ["Navy", "Black", "Wine"] }, { name: "Size", values: ["M", "L", "XL", "XXL"] }],
    variants: [v("p-senator-set-nv-l", "AF-SEN-01-NV-L", { Color: "Navy", Size: "L" }, 5), v("p-senator-set-nv-xl", "AF-SEN-01-NV-XL", { Color: "Navy", Size: "XL" }, 4), v("p-senator-set-bk-l", "AF-SEN-01-BK-L", { Color: "Black", Size: "L" }, 3), v("p-senator-set-wn-xl", "AF-SEN-01-WN-XL", { Color: "Wine", Size: "XL" }, 3)],
    specifications: [{ label: "Material", value: "Cashmere blend" }, { label: "Includes", value: "Top, trousers, cap" }],
  }, 8),
  seed({
    id: "p-vela-run", slug: "vela-cloud-run-sneakers", name: "Vela Cloud Run Sneakers · Cream",
    description: "Breathable mesh upper with cushioned foam sole. True to size. Free size exchange within Lagos.",
    images: [sneakers], price: 38500, oldPrice: 51000, categoryId: "cat-shoes", subcategoryId: "shoes-sneakers",
    storeId: "store-stride", sku: "SL-VELA-CR", stock: 31, rating: 4.6, reviewCount: 204, soldCount: 1130, negotiable: true, featured: true,
    variantOptions: [{ name: "Size", values: ["40", "41", "42", "43", "44", "45"] }],
    variants: ["40", "41", "42", "43", "44", "45"].map((s, i) => v(`p-vela-run-${s}`, `SL-VELA-CR-${s}`, { Size: s }, [3, 6, 8, 7, 5, 2][i]!)),
    specifications: [{ label: "Upper", value: "Engineered mesh" }, { label: "Sole", value: "EVA foam" }],
  }, 15),
  seed({
    id: "p-oxford-loafers", slug: "leather-penny-loafers", name: "Handmade Leather Penny Loafers · Tan",
    description: "Full-grain leather with leather sole and cushioned insole. Made in Aba.",
    images: [loafers], price: 29000, categoryId: "cat-shoes", subcategoryId: "shoes-formal-shoes",
    storeId: "store-stride", sku: "SL-LOAF-TN", stock: 12, rating: 4.7, reviewCount: 63, soldCount: 280, negotiable: true,
    variantOptions: [{ name: "Size", values: ["41", "42", "43", "44"] }],
    variants: ["41", "42", "43", "44"].map((s, i) => v(`p-oxford-loafers-${s}`, `SL-LOAF-TN-${s}`, { Size: s }, [2, 4, 4, 2][i]!)),
    specifications: [{ label: "Leather", value: "Full grain" }, { label: "Origin", value: "Aba, Nigeria" }],
  }, 50),
  seed({
    id: "p-gold-hoops", slug: "kano-gold-hoop-earrings", name: "Kano Gold-Plated Hoop Earrings · 30mm",
    description: "18k gold-plated brass hoops, hypoallergenic posts. Comes in a gift pouch.",
    images: [earrings], price: 12000, oldPrice: 17000, categoryId: "cat-jewelry", subcategoryId: "jewelry-accessories-earrings",
    storeId: "store-beadworks", sku: "BW-HOOP-30", stock: 60, rating: 4.9, reviewCount: 312, soldCount: 1900, negotiable: false, featured: true,
    variantOptions: [{ name: "Size", values: ["20mm", "30mm", "40mm"] }],
    variants: [v("p-gold-hoops-20", "BW-HOOP-20", { Size: "20mm" }, 20, 10000), v("p-gold-hoops-30", "BW-HOOP-30", { Size: "30mm" }, 25), v("p-gold-hoops-40", "BW-HOOP-40", { Size: "40mm" }, 15, 14000)],
    specifications: [{ label: "Plating", value: "18k gold" }, { label: "Base", value: "Brass" }],
  }, 60),
  seed({
    id: "p-coral-necklace", slug: "coral-bead-necklace", name: "Traditional Coral Bead Necklace · 5 Strand",
    description: "Authentic Edo-style coral beads with brass clasp. Perfect for traditional weddings.",
    images: [necklace], price: 85000, categoryId: "cat-jewelry", subcategoryId: "jewelry-accessories-beads",
    storeId: "store-beadworks", sku: "BW-CORAL-5", stock: 3, rating: 5, reviewCount: 44, soldCount: 90, negotiable: false,
    variantOptions: [], variants: [], specifications: [{ label: "Strands", value: "5" }, { label: "Length", value: "18 inches" }], lowStockThreshold: 5,
  }, 25),
  seed({
    id: "p-chronos-watch", slug: "chronos-steel-automatic-watch", name: "Chronos Steel Automatic Watch · 40mm",
    description: "Automatic movement, sapphire crystal, 100m water resistance and a solid steel bracelet.",
    images: [watch], price: 145000, oldPrice: 175000, categoryId: "cat-watches", subcategoryId: "watches-men-s-watches",
    storeId: "store-technaija", sku: "TN-CHR-40", stock: 7, rating: 4.7, reviewCount: 52, soldCount: 140, negotiable: true, featured: true,
    variantOptions: [], variants: [], specifications: [{ label: "Movement", value: "Automatic" }, { label: "Crystal", value: "Sapphire" }, { label: "Water resistance", value: "100m" }],
  }, 18),
  seed({
    id: "p-zaria-noir", slug: "zaria-noir-eau-de-parfum", name: "Zaria Noir Eau de Parfum · 100ml",
    description: "Oud, amber and bergamot. Long-lasting unisex fragrance, sealed and authentic.",
    images: [perfume], price: 45000, categoryId: "cat-perfumes", subcategoryId: "perfumes-unisex",
    storeId: "store-essence", sku: "EC-ZAR-100", stock: 18, rating: 4.7, reviewCount: 120, soldCount: 540, negotiable: false, featured: true,
    variantOptions: [{ name: "Size", values: ["50ml", "100ml"] }],
    variants: [v("p-zaria-noir-50", "EC-ZAR-50", { Size: "50ml" }, 10, 28000), v("p-zaria-noir-100", "EC-ZAR-100", { Size: "100ml" }, 8)],
    specifications: [{ label: "Notes", value: "Oud, amber, bergamot" }, { label: "Concentration", value: "EDP" }],
  }, 40),
  seed({
    id: "p-shea-cream", slug: "shea-butter-hair-cream", name: "Whipped Shea Butter Hair Cream · 250g",
    description: "Raw unrefined shea whipped with coconut and castor oil. No parabens.",
    images: [hairCream], price: 6500, oldPrice: 8000, categoryId: "cat-beauty", subcategoryId: "beauty-hair-hair-care",
    storeId: "store-essence", sku: "EC-SHEA-250", stock: 75, rating: 4.6, reviewCount: 240, soldCount: 2100, negotiable: false,
    variantOptions: [], variants: [], specifications: [{ label: "Weight", value: "250g" }, { label: "Ingredients", value: "Shea, coconut oil, castor oil" }],
  }, 70),
  seed({
    id: "p-chefline-skillet", slug: "chefline-cast-iron-skillet", name: "Chefline Cast Iron Skillet · 26cm",
    description: "Pre-seasoned cast iron for stovetop, oven and open flame. Lasts a lifetime.",
    images: [skillet], price: 28750, oldPrice: 33900, categoryId: "cat-kitchen", subcategoryId: "kitchen-equipment-cookware",
    storeId: "store-homekraft", sku: "HK-CI-26", stock: 26, rating: 4.5, reviewCount: 77, soldCount: 380, negotiable: true, featured: true,
    variantOptions: [{ name: "Size", values: ["20cm", "26cm", "30cm"] }],
    variants: [v("p-chefline-skillet-20", "HK-CI-20", { Size: "20cm" }, 10, 21000), v("p-chefline-skillet-26", "HK-CI-26", { Size: "26cm" }, 12), v("p-chefline-skillet-30", "HK-CI-30", { Size: "30cm" }, 4, 36000)],
    specifications: [{ label: "Material", value: "Cast iron" }, { label: "Compatible", value: "Gas, electric, induction, oven" }],
  }, 33),
  seed({
    id: "p-luma-sofa", slug: "luma-3-seater-fabric-sofa", name: "Luma 3-Seater Fabric Sofa · Ash Grey",
    description: "Solid wood frame, high-density foam and removable washable covers. Assembled on delivery in Lagos, Abuja and PH.",
    images: [sofa], price: 385000, oldPrice: 450000, categoryId: "cat-home", subcategoryId: "home-furniture-living-room",
    storeId: "store-homekraft", sku: "HK-LUMA-3", stock: 5, rating: 4.6, reviewCount: 31, soldCount: 60, negotiable: true,
    variantOptions: [{ name: "Color", values: ["Ash Grey", "Navy", "Sand"] }],
    variants: [v("p-luma-sofa-ash", "HK-LUMA-3-ASH", { Color: "Ash Grey" }, 3), v("p-luma-sofa-nav", "HK-LUMA-3-NAV", { Color: "Navy" }, 1), v("p-luma-sofa-snd", "HK-LUMA-3-SND", { Color: "Sand" }, 1)],
    specifications: [{ label: "Dimensions", value: "210 × 88 × 85cm" }, { label: "Frame", value: "Kiln-dried hardwood" }],
    deliveryOptions: heavyDelivery,
  }, 22),
  seed({
    id: "p-stellar-kettle", slug: "stellar-electric-kettle-1-7l", name: "Stellar 1.7L Stainless Electric Kettle",
    description: "2200W rapid boil, auto shut-off and concealed element for easy cleaning.",
    images: [kettle], price: 15200, oldPrice: 19000, categoryId: "cat-kitchen", subcategoryId: "kitchen-equipment-small-appliances",
    storeId: "store-homekraft", sku: "HK-KET-17", stock: 0, rating: 4.4, reviewCount: 143, soldCount: 900, negotiable: false,
    variantOptions: [], variants: [], specifications: [{ label: "Capacity", value: "1.7L" }, { label: "Power", value: "2200W" }],
  }, 90),
  seed({
    id: "p-pvc-pipe", slug: "pvc-pressure-pipe-1-inch", name: "PVC Pressure Pipe 1\" × 6m (Bundle of 10)",
    description: "Class D uPVC pressure pipe for cold water supply. Bulk pricing for contractors on request.",
    images: [pvcPipes], price: 42000, categoryId: "cat-plumbing", subcategoryId: "plumbing-materials-pipes",
    storeId: "store-buildright", sku: "BR-PVC-1-10", stock: 120, rating: 4.5, reviewCount: 38, soldCount: 410, negotiable: true,
    variantOptions: [{ name: "Diameter", values: ["3/4\"", "1\"", "1 1/2\"", "2\""] }],
    variants: [v("p-pvc-pipe-34", "BR-PVC-34-10", { Diameter: "3/4\"" }, 40, 34000), v("p-pvc-pipe-1", "BR-PVC-1-10", { Diameter: "1\"" }, 40), v("p-pvc-pipe-15", "BR-PVC-15-10", { Diameter: "1 1/2\"" }, 25, 61000), v("p-pvc-pipe-2", "BR-PVC-2-10", { Diameter: "2\"" }, 15, 78000)],
    specifications: [{ label: "Class", value: "D (12 bar)" }, { label: "Length", value: "6m" }],
    deliveryOptions: heavyDelivery,
  }, 11),
  seed({
    id: "p-chrome-faucet", slug: "chrome-basin-mixer-faucet", name: "Chrome Single-Lever Basin Mixer Faucet",
    description: "Solid brass body with ceramic disc cartridge. Includes flexible hoses.",
    images: [faucet], price: 18500, oldPrice: 22000, categoryId: "cat-plumbing", subcategoryId: "plumbing-materials-faucets",
    storeId: "store-buildright", sku: "BR-FCT-CH", stock: 34, rating: 4.6, reviewCount: 59, soldCount: 300, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Body", value: "Solid brass" }, { label: "Finish", value: "Chrome" }],
  }, 28),
  seed({
    id: "p-cement-50kg", slug: "portland-cement-50kg", name: "Portland Cement 42.5R · 50kg Bag",
    description: "High-strength grade 42.5R cement. Minimum order 10 bags. Delivered by truck within Enugu and neighbouring states.",
    images: [cement], price: 9800, categoryId: "cat-building", subcategoryId: "building-materials-cement",
    storeId: "store-buildright", sku: "BR-CEM-50", stock: 800, rating: 4.4, reviewCount: 120, soldCount: 5600, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Grade", value: "42.5R" }, { label: "Weight", value: "50kg" }],
    deliveryOptions: heavyDelivery,
  }, 6),
  seed({
    id: "p-engine-oil-5w30", slug: "5w-30-synthetic-engine-oil-4l", name: "5W-30 Fully Synthetic Engine Oil · 4L",
    description: "API SN fully synthetic oil for petrol engines. Suitable for Toyota, Honda, Lexus and more.",
    images: [engineOil], price: 24000, oldPrice: 27500, categoryId: "cat-engine-oil", subcategoryId: "engine-oil-car-accessories-engine-oil",
    storeId: "store-automax", sku: "AM-OIL-5W30", stock: 58, rating: 4.5, reviewCount: 96, soldCount: 780, negotiable: false,
    variantOptions: [{ name: "Grade", values: ["5W-30", "5W-40", "10W-40"] }],
    variants: [v("p-engine-oil-5w30-a", "AM-OIL-5W30", { Grade: "5W-30" }, 30), v("p-engine-oil-5w40", "AM-OIL-5W40", { Grade: "5W-40" }, 18), v("p-engine-oil-10w40", "AM-OIL-10W40", { Grade: "10W-40" }, 10, 19500)],
    specifications: [{ label: "Type", value: "Fully synthetic" }, { label: "Volume", value: "4L" }],
  }, 14),
  seed({
    id: "p-tyre-205", slug: "car-tyre-205-55-r16", name: "All-Season Car Tyre 205/55 R16",
    description: "Quiet, fuel-efficient all-season tyre. Free fitting at our Apapa workshop.",
    images: [tyre], price: 68000, categoryId: "cat-automotive", subcategoryId: "automotive-tyres",
    storeId: "store-automax", sku: "AM-TYR-205", stock: 16, rating: 4.6, reviewCount: 48, soldCount: 260, negotiable: true,
    variantOptions: [{ name: "Size", values: ["195/65 R15", "205/55 R16", "215/60 R17"] }],
    variants: [v("p-tyre-195", "AM-TYR-195", { Size: "195/65 R15" }, 8, 58000), v("p-tyre-205-a", "AM-TYR-205", { Size: "205/55 R16" }, 6), v("p-tyre-215", "AM-TYR-215", { Size: "215/60 R17" }, 2, 82000)],
    specifications: [{ label: "Season", value: "All-season" }, { label: "Load index", value: "91V" }],
  }, 36),
  seed({
    id: "p-cordless-drill", slug: "cordless-drill-20v", name: "20V Cordless Drill Driver with 2 Batteries",
    description: "Brushless motor, 13mm keyless chuck, 2× 2.0Ah batteries and carry case.",
    images: [drill], price: 54000, oldPrice: 62000, categoryId: "cat-tools", subcategoryId: "tools-power-tools",
    storeId: "store-buildright", sku: "BR-DRL-20V", stock: 11, rating: 4.7, reviewCount: 72, soldCount: 320, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Voltage", value: "20V" }, { label: "Chuck", value: "13mm keyless" }],
  }, 19),
  seed({
    id: "p-basmati-10kg", slug: "premium-basmati-rice-10kg", name: "Premium Long Grain Basmati Rice · 10kg",
    description: "Aged, aromatic basmati. Stone-free and double polished.",
    images: [rice], price: 21500, oldPrice: 24000, categoryId: "cat-groceries", subcategoryId: "groceries-rice-grains",
    storeId: "store-freshmart", sku: "FM-BAS-10", stock: 140, rating: 4.5, reviewCount: 410, soldCount: 4300, negotiable: false, featured: true,
    variantOptions: [{ name: "Weight", values: ["5kg", "10kg", "25kg"] }],
    variants: [v("p-basmati-5", "FM-BAS-5", { Weight: "5kg" }, 60, 11500), v("p-basmati-10", "FM-BAS-10", { Weight: "10kg" }, 60), v("p-basmati-25", "FM-BAS-25", { Weight: "25kg" }, 20, 51000)],
    specifications: [{ label: "Origin", value: "Imported" }, { label: "Grain", value: "Extra long" }],
  }, 4),
  seed({
    id: "p-lagos-ledger", slug: "the-lagos-ledger-hardcover", name: "The Lagos Ledger · Hardcover",
    description: "A sweeping novel of commerce and family across three generations in Lagos Island.",
    images: [book], price: 9500, categoryId: "cat-books", subcategoryId: "books-fiction",
    storeId: "store-pageturn", sku: "PT-LL-HC", stock: 48, rating: 4.9, reviewCount: 88, soldCount: 610, negotiable: false,
    variantOptions: [{ name: "Format", values: ["Hardcover", "Paperback"] }],
    variants: [v("p-lagos-ledger-hc", "PT-LL-HC", { Format: "Hardcover" }, 28), v("p-lagos-ledger-pb", "PT-LL-PB", { Format: "Paperback" }, 20, 6500)],
    specifications: [{ label: "Pages", value: "412" }, { label: "Publisher", value: "Harmattan Press" }],
  }, 55),
  seed({
    id: "p-stroller", slug: "cruise-lite-baby-stroller", name: "CruiseLite Foldable Baby Stroller · Grey",
    description: "One-hand fold, reclining seat, large storage basket and 5-point harness. Suitable from birth to 22kg.",
    images: [stroller], price: 96000, oldPrice: 115000, categoryId: "cat-baby", subcategoryId: "baby-products-strollers",
    storeId: "store-homekraft", sku: "HK-STR-CL", stock: 6, rating: 4.7, reviewCount: 39, soldCount: 130, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Max weight", value: "22kg" }, { label: "Folded size", value: "60 × 45 × 30cm" }],
  }, 27),
  seed({
    id: "p-office-chair", slug: "ergomesh-office-chair", name: "ErgoMesh High-Back Office Chair",
    description: "Adjustable lumbar support, 4D armrests and breathable mesh. 5-year frame warranty.",
    images: [officeChair], price: 128000, categoryId: "cat-office", subcategoryId: "office-supplies-furniture",
    storeId: "store-homekraft", sku: "HK-CHR-EM", stock: 9, rating: 4.8, reviewCount: 56, soldCount: 190, negotiable: true,
    variantOptions: [], variants: [], specifications: [{ label: "Max load", value: "150kg" }, { label: "Warranty", value: "5 years" }],
  }, 41),
  seed({
    id: "p-football", slug: "match-football-size-5", name: "Match Football · Size 5 · Thermo-bonded",
    description: "FIFA-quality thermo-bonded match ball with butyl bladder for air retention.",
    images: [football], price: 14500, oldPrice: 18000, categoryId: "cat-sports", subcategoryId: "sports-football",
    storeId: "store-stride", sku: "SL-FB-5", stock: 40, rating: 4.6, reviewCount: 61, soldCount: 450, negotiable: false,
    variantOptions: [{ name: "Size", values: ["4", "5"] }],
    variants: [v("p-football-4", "SL-FB-4", { Size: "4" }, 15, 12500), v("p-football-5", "SL-FB-5", { Size: "5" }, 25)],
    specifications: [{ label: "Size", value: "5" }, { label: "Construction", value: "Thermo-bonded" }],
  }, 16),
  seed({
    id: "p-blender", slug: "powerblend-1-5l-blender", name: "PowerBlend 1.5L Glass Jug Blender · 800W",
    description: "800W motor with ice-crush mode, 1.5L thermal glass jug and grinder attachment.",
    images: [blender], price: 34000, oldPrice: 39500, categoryId: "cat-appliances", subcategoryId: "kitchen-equipment-small-appliances",
    storeId: "store-homekraft", sku: "HK-BLD-15", stock: 2, rating: 4.5, reviewCount: 102, soldCount: 640, negotiable: false,
    variantOptions: [], variants: [], specifications: [{ label: "Power", value: "800W" }, { label: "Jug", value: "1.5L glass" }],
    lowStockThreshold: 5,
  }, 9),
];
