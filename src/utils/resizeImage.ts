/**
 * Resize and center-crop an image to a fixed 1024x1024 PNG canvas.
 * Returns a Blob suitable for upload to storage.
 */
export function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not an image."));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.src = objectUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas 2D context is not available."));
          return;
        }
        canvas.width = 1024;
        canvas.height = 1024;

        const scale = Math.max(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

        canvas.toBlob((blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob from image."));
        }, "image/png");
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Image processing failed."));
      }
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to load image."));
    };
  });
}
