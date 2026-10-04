import phone from "@/assets/products/phone.jpg";
import earbuds from "@/assets/products/earbuds.jpg";
import tv from "@/assets/products/tv.jpg";
import laptop from "@/assets/products/laptop.jpg";
import senator from "@/assets/products/senator.jpg";
import ankaraDress from "@/assets/products/ankara-dress.jpg";
import sneakers from "@/assets/products/sneakers.jpg";
import loafers from "@/assets/products/loafers.jpg";
import hairCream from "@/assets/products/hair-cream.jpg";
import earrings from "@/assets/products/earrings.jpg";
import necklace from "@/assets/products/necklace.jpg";
import watch from "@/assets/products/watch.jpg";
import perfume from "@/assets/products/perfume.jpg";
import sofa from "@/assets/products/sofa.jpg";
import skillet from "@/assets/products/skillet.jpg";
import blender from "@/assets/products/blender.jpg";
import cement from "@/assets/products/cement.jpg";
import faucet from "@/assets/products/faucet.jpg";
import pvcPipes from "@/assets/products/pvc-pipes.jpg";
import tyre from "@/assets/products/tyre.jpg";
import engineOil from "@/assets/products/engine-oil.jpg";
import book from "@/assets/products/book.jpg";
import rice from "@/assets/products/rice.jpg";
import football from "@/assets/products/football.jpg";
import stroller from "@/assets/products/stroller.jpg";
import officeChair from "@/assets/products/office-chair.jpg";
import drill from "@/assets/products/drill.jpg";
import kettle from "@/assets/products/kettle.jpg";

type CategoryArtworkProps = {
  slug: string;
  name: string;
};

type ArtworkItem = {
  src: string;
  className: string;
};

const artwork: Record<string, ArtworkItem> = {
  "phones-electronics": { src: phone, className: "h-[70%]" },
  computers: { src: laptop, className: "h-[66%]" },
  fashion: { src: senator, className: "h-[74%]" },
  shoes: { src: sneakers, className: "h-[58%]" },
  "beauty-hair": { src: hairCream, className: "h-[70%]" },
  "jewelry-accessories": { src: necklace, className: "h-[68%]" },
  watches: { src: watch, className: "h-[76%]" },
  perfumes: { src: perfume, className: "h-[72%]" },
  "home-furniture": { src: sofa, className: "h-[62%]" },
  "kitchen-equipment": { src: blender, className: "h-[72%]" },
  "building-materials": { src: cement, className: "h-[72%]" },
  "plumbing-materials": { src: faucet, className: "h-[70%]" },
  automotive: { src: tyre, className: "h-[70%]" },
  "engine-oil-car-accessories": { src: engineOil, className: "h-[76%]" },
  books: { src: book, className: "h-[70%]" },
  groceries: { src: rice, className: "h-[74%]" },
  sports: { src: football, className: "h-[70%]" },
  "baby-products": { src: stroller, className: "h-[76%]" },
  "office-supplies": { src: officeChair, className: "h-[76%]" },
  tools: { src: drill, className: "h-[70%]" },
  appliances: { src: kettle, className: "h-[70%]" },
  other: { src: phone, className: "h-[68%]" },
};

export function CategoryArtwork({ slug, name }: CategoryArtworkProps) {
  const item = artwork[slug] ?? artwork.other;

  return (
    <div
      role="img"
      aria-label={`${name} category image`}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-transparent"
    >
      <img
        src={item.src}
        alt=""
        loading="lazy"
        className={`max-w-[78%] object-contain drop-shadow-[0_5px_8px_rgba(18,53,36,0.14)] ${item.className}`}
      />
    </div>
  );
}
