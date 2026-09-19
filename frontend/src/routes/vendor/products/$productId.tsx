import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Link as LinkIcon, Save, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorProducts, updateVendorProduct, deleteVendorProduct } from "@/services/productService";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { formatNaira } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/api";

export const Route = createFileRoute("/vendor/products/$productId")({
  head: () => ({
    meta: [
      { title: "Edit Product — Vendor — Vendura" },
      { name: "description", content: "Edit product details." },
      { property: "og:title", content: "Edit Product — Vendura" },
      { property: "og:description", content: "Edit product details." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditProductPage,
});

function EditProductPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: () => getVendorProducts(CURRENT_VENDOR_STORE_ID),
  });
  const product = products?.find((p) => p.id === productId);

  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price.toString() ?? "",
    stock: product?.stock.toString() ?? "",
    negotiable: product?.negotiable ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        negotiable: product.negotiable,
      });
      setImage(product.images[0] ?? "");
      setImageUrl(product.images[0]?.startsWith("http") ? product.images[0] : "");
    }
  }, [product]);

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Image must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setImageUrl("");
      setImageError("");
    };
    reader.readAsDataURL(file);
  }

  function applyImageUrl() {
    const value = imageUrl.trim();
    if (!/^https?:\/\//i.test(value)) {
      setImageError("Enter a complete image URL beginning with http:// or https://.");
      return;
    }
    setImage(value);
    setImageError("");
  }

  if (productsLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-foreground">Product not found</h1>
        <Link to="/vendor/products" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Back to products</Link>
      </div>
    );
  }

  async function handleSave() {
    if (!image) {
      setImageError("Add a product image before saving.");
      return;
    }
    setLoading(true);
    try {
      await updateVendorProduct(productId, {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        negotiable: form.negotiable,
        images: [image],
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      toast.success("Product updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update product"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    await deleteVendorProduct(productId);
    queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
    toast.success("Product deleted");
    navigate({ to: "/vendor/products" });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/vendor/products" className="text-muted-foreground hover:text-primary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Edit Product</h1>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <img src={product.images[0]} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
        <div>
          <p className="text-sm font-semibold text-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">SKU: {product.sku} · {formatNaira(product.price)}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Product image</label>
          {image ? (
            <div className="relative h-56 w-full max-w-sm overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={image}
                alt="Product preview"
                onLoad={() => setImageError("")}
                onError={() => setImageError("This image URL could not be loaded. Try another URL or upload a file.")}
                className="h-full w-full object-cover"
              />
              <button type="button" onClick={() => { setImage(""); setImageUrl(""); }} aria-label="Remove product image" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-40 max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <ImagePlus className="h-6 w-6" />
              <span>Choose a new product image</span>
              <span className="text-xs">JPG, PNG or WebP, up to 2 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="sr-only" />
            </label>
          )}
          {image && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              <ImagePlus className="h-4 w-4" /> Replace from device
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="sr-only" />
            </label>
          )}
          <div className="mt-3 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Or paste an image URL" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <button type="button" onClick={applyImageUrl} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">Use URL</button>
          </div>
          {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">Product name</label>
          <input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label htmlFor="desc" className="mb-1 block text-sm font-medium text-foreground">Description</label>
          <textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="mb-1 block text-sm font-medium text-foreground">Price (₦)</label>
            <input id="price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="stock" className="mb-1 block text-sm font-medium text-foreground">Stock</label>
            <input id="stock" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Allow price negotiation</p>
            <p className="text-xs text-muted-foreground">Let customers make offers</p>
          </div>
          <button type="button" onClick={() => setForm((f) => ({ ...f, negotiable: !f.negotiable }))} className={cn("relative h-6 w-11 rounded-full transition-colors", form.negotiable ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", form.negotiable ? "left-[1.375rem]" : "left-0.5")} />
          </button>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> Save Changes
        </button>
        <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive-soft">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}
