/**
 * Resize and center-crop an image to a fixed 1024x1024 PNG canvas.
 * Returns a Blob suitable for upload to storage.
 */
export async function resizeImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return await canvasBlob(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = objectUrl;
  });
}

function canvasBlob(img: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D context is not available."));
  }
  canvas.width = 1024;
  canvas.height = 1024;

  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const offsetX = (canvas.width - scaledWidth) / 2;
  const offsetY = (canvas.height - scaledHeight) / 2;

  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob from image."));
    }, "image/png");
  });
}
