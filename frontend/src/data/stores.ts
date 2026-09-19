import type { Store } from "@/types";
import banner from "@/assets/store-banner-1.jpg";

const policies = {
  returns: "7-day returns on unused items in original packaging.",
  shipping: "Orders dispatched within 1–2 business days.",
  warranty: "Manufacturer warranty where applicable.",
};

export const stores: Store[] = [
  {
    id: "store-technaija", slug: "technaija", name: "TechNaija", tagline: "Genuine gadgets, fair prices.",
    description: "Lagos' trusted source for phones, laptops and audio. Every device is tested and comes with a receipt and warranty card.",
    bannerUrl: banner, ownerId: "user-vendor-1", categoryIds: ["cat-electronics", "cat-computers"],
    location: { city: "Ikeja", state: "Lagos" }, rating: 4.8, reviewCount: 1240, productCount: 1200, followers: 8400,
    verified: true, allowNegotiation: true, policies, contact: { phone: "+234 802 000 1111", email: "hello@technaija.ng", whatsapp: "+2348020001111" }, joinedAt: "2023-02-14T00:00:00Z",
  },
  {
    id: "store-ada-fashion", slug: "ada-fashion", name: "Ada Fashion Store", tagline: "Made in Nigeria. Worn everywhere.",
    description: "Contemporary Ankara, senator styles and ready-to-wear pieces tailored in Abuja. Custom sizing available on request.",
    bannerUrl: banner, ownerId: "user-vendor-2", categoryIds: ["cat-fashion"],
    location: { city: "Wuse", state: "Abuja" }, rating: 4.7, reviewCount: 860, productCount: 860, followers: 5600,
    verified: true, allowNegotiation: true, policies, contact: { phone: "+234 803 000 2222", whatsapp: "+2348030002222" }, joinedAt: "2023-05-02T00:00:00Z",
  },
  {
    id: "store-beadworks", slug: "beadworks", name: "Beadworks", tagline: "Handcrafted in Kano.",
    description: "Coral beads, gold-plated hoops and traditional accessories made by local artisans.",
    bannerUrl: banner, ownerId: "user-vendor-3", categoryIds: ["cat-jewelry"],
    location: { city: "Kano", state: "Kano" }, rating: 4.9, reviewCount: 430, productCount: 430, followers: 3100,
    verified: true, allowNegotiation: false, policies, contact: { phone: "+234 805 000 3333" }, joinedAt: "2023-08-19T00:00:00Z",
  },
  {
    id: "store-homekraft", slug: "homekraft", name: "HomeKraft", tagline: "Everything for the modern Nigerian home.",
    description: "Furniture, cookware and kitchen appliances delivered nationwide from our Port Harcourt warehouse.",
    bannerUrl: banner, ownerId: "user-vendor-4", categoryIds: ["cat-home", "cat-kitchen", "cat-appliances"],
    location: { city: "Port Harcourt", state: "Rivers" }, rating: 4.6, reviewCount: 1040, productCount: 1040, followers: 6200,
    verified: true, allowNegotiation: true, policies, contact: { phone: "+234 806 000 4444", email: "care@homekraft.ng" }, joinedAt: "2022-11-30T00:00:00Z",
  },
  {
    id: "store-stride", slug: "stride-lagos", name: "Stride Lagos", tagline: "Step out.",
    description: "Sneakers, loafers and sandals for men and women. Original brands with size exchange.",
    bannerUrl: banner, ownerId: "user-vendor-5", categoryIds: ["cat-shoes", "cat-fashion"],
    location: { city: "Lekki", state: "Lagos" }, rating: 4.6, reviewCount: 720, productCount: 540, followers: 4700,
    verified: true, allowNegotiation: true, policies, contact: { whatsapp: "+2348070005555" }, joinedAt: "2023-03-10T00:00:00Z",
  },
  {
    id: "store-essence", slug: "essence-co", name: "Essence Co.", tagline: "Scent & self-care.",
    description: "Designer perfumes, oils and natural hair care sourced directly from distributors.",
    bannerUrl: banner, ownerId: "user-vendor-6", categoryIds: ["cat-perfumes", "cat-beauty"],
    location: { city: "Ibadan", state: "Oyo" }, rating: 4.7, reviewCount: 510, productCount: 380, followers: 2900,
    verified: false, allowNegotiation: false, policies, contact: { phone: "+234 808 000 6666" }, joinedAt: "2024-01-22T00:00:00Z",
  },
  {
    id: "store-buildright", slug: "buildright", name: "BuildRight Materials", tagline: "Build once. Build right.",
    description: "Cement, pipes, fittings and hardware for contractors and home builders. Bulk pricing available.",
    bannerUrl: banner, ownerId: "user-vendor-7", categoryIds: ["cat-building", "cat-plumbing", "cat-tools"],
    location: { city: "Enugu", state: "Enugu" }, rating: 4.5, reviewCount: 290, productCount: 610, followers: 1800,
    verified: true, allowNegotiation: true, policies, contact: { phone: "+234 809 000 7777" }, joinedAt: "2023-09-05T00:00:00Z",
  },
  {
    id: "store-automax", slug: "automax", name: "AutoMax", tagline: "Keep moving.",
    description: "Tyres, engine oil, batteries and genuine spare parts for popular Nigerian road cars.",
    bannerUrl: banner, ownerId: "user-vendor-8", categoryIds: ["cat-automotive", "cat-engine-oil"],
    location: { city: "Apapa", state: "Lagos" }, rating: 4.4, reviewCount: 340, productCount: 720, followers: 2100,
    verified: true, allowNegotiation: true, policies, contact: { phone: "+234 810 000 8888" }, joinedAt: "2023-06-15T00:00:00Z",
  },
  {
    id: "store-freshmart", slug: "freshmart", name: "FreshMart", tagline: "Groceries, delivered same day.",
    description: "Rice, oils, spices and household staples with same-day delivery within Lagos.",
    bannerUrl: banner, ownerId: "user-vendor-9", categoryIds: ["cat-groceries"],
    location: { city: "Surulere", state: "Lagos" }, rating: 4.5, reviewCount: 980, productCount: 450, followers: 7300,
    verified: true, allowNegotiation: false, policies, contact: { phone: "+234 811 000 9999" }, joinedAt: "2022-12-01T00:00:00Z",
  },
  {
    id: "store-pageturn", slug: "pageturn-books", name: "PageTurn Books", tagline: "Read more.",
    description: "New and bestselling titles, textbooks and children's books shipped nationwide.",
    bannerUrl: banner, ownerId: "user-vendor-10", categoryIds: ["cat-books", "cat-office"],
    location: { city: "Kano", state: "Kano" }, rating: 4.8, reviewCount: 210, productCount: 1900, followers: 1500,
    verified: false, allowNegotiation: false, policies, contact: { email: "orders@pageturn.ng" }, joinedAt: "2024-03-08T00:00:00Z",
  },
];

/** The store owned by the mock logged-in vendor (used by the vendor dashboard). */
export const CURRENT_VENDOR_STORE_ID = "store-technaija";
