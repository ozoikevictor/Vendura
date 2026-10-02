type CategoryVisual = {
  code: string;
  imageUrl: string;
  fallback: string;
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

const fallback =
  "radial-gradient(circle at 22% 18%, rgba(255,255,255,.34), transparent 24%), linear-gradient(135deg, #065f46 0%, #10b981 52%, #d1fae5 100%)";

const visuals: Record<string, CategoryVisual> = {
  "phones-electronics": {
    code: "PH",
    imageUrl: img("photo-1511707171634-5f897ff02aa9"),
    fallback,
  },
  computers: {
    code: "PC",
    imageUrl: img("photo-1517336714731-489689fd1ca8"),
    fallback,
  },
  fashion: {
    code: "FS",
    imageUrl: img("photo-1445205170230-053b83016050"),
    fallback,
  },
  shoes: {
    code: "SH",
    imageUrl: img("photo-1542291026-7eec264c27ff"),
    fallback,
  },
  "beauty-hair": {
    code: "BH",
    imageUrl: img("photo-1596462502278-27bfdc403348"),
    fallback,
  },
  "jewelry-accessories": {
    code: "JW",
    imageUrl: img("photo-1515562141207-7a88fb7ce338"),
    fallback,
  },
  watches: {
    code: "WA",
    imageUrl: img("photo-1524592094714-0f0654e20314"),
    fallback,
  },
  perfumes: {
    code: "PF",
    imageUrl: img("photo-1541643600914-78b084683601"),
    fallback,
  },
  "home-furniture": {
    code: "HM",
    imageUrl: img("photo-1555041469-a586c61ea9bc"),
    fallback,
  },
  "kitchen-equipment": {
    code: "KT",
    imageUrl: img("photo-1556911220-bff31c812dba"),
    fallback,
  },
  "building-materials": {
    code: "BL",
    imageUrl: img("photo-1503387762-592deb58ef4e"),
    fallback,
  },
  "plumbing-materials": {
    code: "PL",
    imageUrl: img("photo-1585704032915-c3400ca199e7"),
    fallback,
  },
  automotive: {
    code: "AU",
    imageUrl: img("photo-1503376780353-7e6692767b70"),
    fallback,
  },
  "engine-oil-car-accessories": {
    code: "EO",
    imageUrl: img("photo-1487754180451-c456f719a1fc"),
    fallback,
  },
  books: {
    code: "BK",
    imageUrl: img("photo-1495446815901-a7297e633e8d"),
    fallback,
  },
  groceries: {
    code: "GR",
    imageUrl: img("photo-1542838132-92c53300491e"),
    fallback,
  },
  sports: {
    code: "SP",
    imageUrl: img("photo-1517649763962-0c623066013b"),
    fallback,
  },
  "baby-products": {
    code: "BB",
    imageUrl: img("photo-1519689680058-324335c77eba"),
    fallback,
  },
  "office-supplies": {
    code: "OF",
    imageUrl: img("photo-1497366754035-f200968a6e72"),
    fallback,
  },
  tools: {
    code: "TL",
    imageUrl: img("photo-1530124566582-a618bc2615dc"),
    fallback,
  },
  appliances: {
    code: "AP",
    imageUrl: img("photo-1586208958839-06c17cacdf08"),
    fallback,
  },
};

export function getCategoryVisual(slug: string): CategoryVisual {
  return (
    visuals[slug] ?? {
      code: slug.slice(0, 2).toUpperCase(),
      imageUrl: img("photo-1556742049-0cfed4f6a45d"),
      fallback,
    }
  );
}
