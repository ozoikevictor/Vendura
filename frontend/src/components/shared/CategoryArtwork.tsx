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

const artwork: Record<string, ArtworkItem[]> = {
  "phones-electronics": [
    { src: phone, className: "left-[18%] top-[14%] h-[70%] -rotate-2" },
    { src: earbuds, className: "right-[15%] top-[22%] h-[54%] rotate-3" },
  ],
  computers: [
    { src: laptop, className: "left-[15%] top-[20%] h-[60%] -rotate-2" },
    { src: tv, className: "right-[12%] top-[19%] h-[58%] rotate-2" },
  ],
  fashion: [
    { src: senator, className: "left-[17%] top-[14%] h-[72%]" },
    { src: ankaraDress, className: "right-[14%] top-[10%] h-[78%]" },
  ],
  shoes: [
    { src: sneakers, className: "left-[13%] top-[25%] h-[52%] -rotate-3" },
    { src: loafers, className: "right-[13%] top-[27%] h-[50%] rotate-3" },
  ],
  "beauty-hair": [
    { src: hairCream, className: "left-[18%] top-[16%] h-[68%] -rotate-3" },
    { src: perfume, className: "right-[17%] top-[18%] h-[64%] rotate-3" },
  ],
  "jewelry-accessories": [
    { src: necklace, className: "left-[18%] top-[16%] h-[68%] -rotate-5" },
    { src: earrings, className: "right-[17%] top-[17%] h-[66%] rotate-5" },
  ],
  watches: [{ src: watch, className: "left-[30%] top-[10%] h-[80%] -rotate-3" }],
  perfumes: [
    { src: perfume, className: "left-[20%] top-[13%] h-[74%] -rotate-2" },
    { src: hairCream, className: "right-[18%] top-[31%] h-[46%] rotate-5" },
  ],
  "home-furniture": [
    { src: sofa, className: "left-[9%] top-[30%] h-[50%]" },
    { src: officeChair, className: "right-[15%] top-[17%] h-[67%] rotate-4" },
  ],
  "kitchen-equipment": [
    { src: skillet, className: "left-[13%] top-[27%] h-[54%] -rotate-5" },
    { src: blender, className: "right-[17%] top-[15%] h-[70%] rotate-3" },
  ],
  "building-materials": [
    { src: cement, className: "left-[17%] top-[15%] h-[70%] -rotate-3" },
    { src: drill, className: "right-[15%] top-[25%] h-[54%] rotate-8" },
  ],
  "plumbing-materials": [
    { src: faucet, className: "left-[15%] top-[18%] h-[65%] -rotate-2" },
    { src: pvcPipes, className: "right-[12%] top-[27%] h-[50%] rotate-4" },
  ],
  automotive: [
    { src: tyre, className: "left-[18%] top-[18%] h-[66%] -rotate-6" },
    { src: engineOil, className: "right-[18%] top-[14%] h-[72%] rotate-4" },
  ],
  "engine-oil-car-accessories": [
    { src: engineOil, className: "left-[18%] top-[12%] h-[76%] -rotate-3" },
    { src: tyre, className: "right-[18%] top-[25%] h-[52%] rotate-7" },
  ],
  books: [
    { src: book, className: "left-[19%] top-[14%] h-[70%] -rotate-5" },
    { src: book, className: "right-[22%] top-[19%] h-[62%] rotate-7" },
  ],
  groceries: [
    { src: rice, className: "left-[17%] top-[14%] h-[72%] -rotate-4" },
    { src: kettle, className: "right-[18%] top-[28%] h-[50%] rotate-5" },
  ],
  sports: [
    { src: football, className: "left-[18%] top-[17%] h-[67%] -rotate-5" },
    { src: sneakers, className: "right-[13%] top-[32%] h-[45%] rotate-5" },
  ],
  "baby-products": [
    { src: stroller, className: "left-[12%] top-[13%] h-[74%] -rotate-2" },
    { src: football, className: "right-[20%] top-[31%] h-[45%] rotate-7" },
  ],
  "office-supplies": [
    { src: officeChair, className: "left-[16%] top-[10%] h-[78%] -rotate-3" },
    { src: laptop, className: "right-[15%] top-[27%] h-[52%] rotate-3" },
  ],
  tools: [
    { src: drill, className: "left-[15%] top-[22%] h-[60%] -rotate-12" },
    { src: pvcPipes, className: "right-[16%] top-[32%] h-[43%] rotate-7" },
  ],
  appliances: [
    { src: blender, className: "left-[18%] top-[12%] h-[74%] -rotate-3" },
    { src: kettle, className: "right-[15%] top-[22%] h-[60%] rotate-3" },
  ],
  other: [
    { src: phone, className: "left-[18%] top-[18%] h-[62%] -rotate-4" },
    { src: rice, className: "right-[18%] top-[20%] h-[58%] rotate-4" },
  ],
};

export function CategoryArtwork({ slug, name }: CategoryArtworkProps) {
  const items = artwork[slug] ?? artwork.other;

  return (
    <div
      role="img"
      aria-label={`${name} category image`}
      className="relative h-full w-full overflow-hidden bg-[#0b5d35]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_35%,rgba(188,245,208,.38)_0,rgba(188,245,208,.38)_31%,transparent_32%),radial-gradient(circle_at_70%_46%,rgba(219,255,231,.28)_0,rgba(219,255,231,.28)_29%,transparent_30%),linear-gradient(135deg,#064524_0%,#0b5d35_52%,#11965a_100%)]" />
      {items.map((item, index) => (
        <img
          key={`${item.src}-${index}`}
          src={item.src}
          alt=""
          loading="lazy"
          className={`absolute object-contain drop-shadow-[0_10px_16px_rgba(2,29,16,0.24)] ${item.className}`}
        />
      ))}
    </div>
  );
}
