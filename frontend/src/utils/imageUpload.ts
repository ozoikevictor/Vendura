export async function resizeProductImage(file: File) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }

  const image = await loadImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/webp", 0.8);
  if (dataUrl.length > 5_500_000) {
    throw new Error("This picture is still too large after compression. Choose a smaller photo.");
  }
  return dataUrl;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened."));
    };
    image.src = url;
  });
}
