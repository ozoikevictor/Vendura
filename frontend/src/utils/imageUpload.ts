export async function resizeProductImage(file: File) {
  const isHeic = /^image\/(heic|heif)$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic && !/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Choose a JPG, PNG, WebP, HEIC, or HEIF image.");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("This photo is larger than 25 MB. Choose a smaller version.");
  }

  let source: Blob = file;
  if (isHeic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      source = Array.isArray(converted) ? converted[0]! : converted;
    } catch {
      throw new Error("This HEIC photo could not be converted. Try selecting it again or use JPG.");
    }
  }

  const image = await decodeImage(source);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  const dataUrl = canvas.toDataURL("image/webp", 0.8);
  if (dataUrl.length > 5_500_000) {
    throw new Error("This picture is still too large after compression. Choose a smaller photo.");
  }
  return dataUrl;
}

type DecodedImage = CanvasImageSource & { width: number; height: number; close?: () => void };

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // Older mobile browsers are handled by the object URL fallback below.
    }
  }
  return new Promise<DecodedImage>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image as DecodedImage);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened."));
    };
    image.src = url;
  });
}

export function scrollToFirstFormError() {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-form-error="true"], [aria-invalid="true"]',
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = target.matches("input, select, textarea, button")
      ? target
      : target.closest("div")?.querySelector<HTMLElement>("input, select, textarea, button");
    field?.focus({ preventScroll: true });
  });
}
