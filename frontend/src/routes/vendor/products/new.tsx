import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save, Eye, ImagePlus, X, AlertCircle, Link as LinkIcon } from "lucide-react";
import { createVendorProduct } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  oldPrice: string;
  sku: string;
  stock: string;
  lowStockThreshold: string;
  categoryId: string;
  negotiable: boolean;
};

type FieldErrors = Partial<Record<keyof ProductForm | "image", string | undefined>>;

export const Route = createFileRoute("/vendor/products/new")({
  head: () => ({
    meta: [
      { title: "Add Product — Vendor — Vendura" },
      { name: "description", content: "Create a new product." },
      { property: "og:title", content: "Add Product — Vendura" },
      { property: "og:description", content: "Create a new product." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [image, setImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    sku: "",
    stock: "",
    lowStockThreshold: "5",
    categoryId: "",
    negotiable: false,
  });

  const set =
    (k: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((current) => ({ ...current, [k]: undefined }));
      setError("");
    };

  function validate() {
    const next: FieldErrors = {};
    const price = Number(form.price);
    const oldPrice = Number(form.oldPrice);
    if (form.name.trim().length < 2) next.name = "Enter a product name.";
    if (form.description.trim().length < 5)
      next.description = "Describe the product in at least 5 characters.";
    if (!form.price || !Number.isFinite(price) || price <= 0)
      next.price = "Enter a price greater than zero.";
    if (form.oldPrice && (!Number.isFinite(oldPrice) || oldPrice <= price))
      next.oldPrice = "The old price must be higher than the current price.";
    if (!form.categoryId) next.categoryId = "Select a category.";
    if (form.stock === "" || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
      next.stock = "Enter the number of items available.";
    if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0)
      next.lowStockThreshold = "Enter zero or a whole number.";
    if (!image) next.image = "Add a clear product image.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, image: "Choose an image file." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({ ...current, image: "Image must be smaller than 2 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setImageUrl("");
      setErrors((current) => ({ ...current, image: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function applyImageUrl() {
    const value = imageUrl.trim();
    if (!/^https?:\/\//i.test(value)) {
      setErrors((current) => ({
        ...current,
        image: "Enter a complete image URL beginning with http:// or https://.",
      }));
      return;
    }
    setImage(value);
    setErrors((current) => ({ ...current, image: undefined }));
  }

  async function handleSubmit(status: "draft" | "active") {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      const sku = form.sku.trim() || `VND-${Date.now().toString().slice(-8)}`;
      await createVendorProduct("", {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        ...(form.oldPrice ? { oldPrice: Number(form.oldPrice) } : {}),
        sku,
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        categoryId: form.categoryId,
        negotiable: form.negotiable,
        status,
        images: [image],
        variantOptions: [],
        variants: [],
        specifications: [],
        deliveryOptions: [],
        tags: [],
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      toast.success(status === "draft" ? "Draft saved" : "Product published");
      navigate({ to: "/vendor/products" });
    } catch (caught) {
      const message = getErrorMessage(caught, "Could not save this product. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/vendor/products" className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Add Product</h1>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Product image *</label>
          {image ? (
            <div className="relative h-48 w-48 overflow-hidden rounded-lg border border-border">
              <img
                src={image}
                alt="Product preview"
                onLoad={() => setErrors((current) => ({ ...current, image: undefined }))}
                onError={() => setErrors((current) => ({ ...current, image: "This image URL could not be loaded. Try another URL or upload a file." }))}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImage("");
                  setImageUrl("");
                }}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background text-sm text-muted-foreground hover:border-primary hover:text-primary",
                errors.image && "border-destructive text-destructive",
              )}
            >
              <ImagePlus className="h-6 w-6" />
              <span>Choose product image</span>
              <span className="text-xs">JPG, PNG or WebP, up to 2 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                className="sr-only"
              />
            </label>
          )}
          {image && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              <ImagePlus className="h-4 w-4" />
              Replace from device
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                className="sr-only"
              />
            </label>
          )}
          <div className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  setErrors((current) => ({ ...current, image: undefined }));
                }}
                placeholder="Or paste an image URL"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={applyImageUrl}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Use URL
            </button>
          </div>
          {errors.image && <p className="mt-1 text-xs text-destructive">{errors.image}</p>}
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
            Product name *
          </label>
          <input
            id="name"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Aurora 5G Smartphone"
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1",
              errors.name
                ? "border-destructive focus:ring-destructive"
                : "border-input focus:border-primary focus:ring-primary",
            )}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="desc" className="mb-1 block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="desc"
            rows={4}
            value={form.description}
            onChange={set("description")}
            placeholder="Describe your product..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="mb-1 block text-sm font-medium text-foreground">
              Price (₦) *
            </label>
            <input
              id="price"
              type="number"
              required
              value={form.price}
              onChange={set("price")}
              placeholder="245000"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
          </div>
          <div>
            <label htmlFor="oldPrice" className="mb-1 block text-sm font-medium text-foreground">
              Old price (₦)
            </label>
            <input
              id="oldPrice"
              type="number"
              value={form.oldPrice}
              onChange={set("oldPrice")}
              placeholder="280000"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {errors.oldPrice && <p className="mt-1 text-xs text-destructive">{errors.oldPrice}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="sku" className="mb-1 block text-sm font-medium text-foreground">
              SKU
            </label>
            <input
              id="sku"
              value={form.sku}
              onChange={set("sku")}
              placeholder="AUTO"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="stock" className="mb-1 block text-sm font-medium text-foreground">
              Stock
            </label>
            <input
              id="stock"
              type="number"
              value={form.stock}
              onChange={set("stock")}
              placeholder="50"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock}</p>}
          </div>
          <div>
            <label htmlFor="lowStock" className="mb-1 block text-sm font-medium text-foreground">
              Low stock alert
            </label>
            <input
              id="lowStock"
              type="number"
              value={form.lowStockThreshold}
              onChange={set("lowStockThreshold")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {errors.lowStockThreshold && (
              <p className="mt-1 text-xs text-destructive">{errors.lowStockThreshold}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="cat" className="mb-1 block text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="cat"
            value={form.categoryId}
            onChange={set("categoryId")}
            disabled={categoriesLoading}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">
              {categoriesLoading ? "Loading categories..." : "Select category"}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-destructive">{errors.categoryId}</p>
          )}
        </div>

        {/* Negotiation toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Allow price negotiation</p>
            <p className="text-xs text-muted-foreground">
              Let customers make offers on this product
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, negotiable: !f.negotiable }))}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              form.negotiable ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                form.negotiable ? "left-[1.375rem]" : "left-0.5",
              )}
            />
          </button>
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> Save as Draft
        </button>
        <button
          onClick={() => handleSubmit("active")}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Eye className="h-4 w-4" /> Publish Product
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Prices and stock are validated by the backend. You can edit variants, specs, and delivery
        options after creation.
      </p>
    </div>
  );
}
