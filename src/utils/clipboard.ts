import toast from "react-hot-toast";

const isBrowser = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined";

const copyViaInputFallback = (text: string): boolean => {
  const input = document.createElement("input");
  input.type = "text";
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";

  document.body.appendChild(input);
  input.select();
  let successful: boolean;
  try {
    successful = document.execCommand("copy");
  } catch {
    successful = false;
  }
  document.body.removeChild(input);

  return successful;
};

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(
  text: string,
  successMessage = "Copied to clipboard"
): Promise<boolean> {
  if (!isBrowser()) {
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    }

    const successful = copyViaInputFallback(text);
    if (successful) toast.success(successMessage);
    else toast.error("Failed to copy to clipboard");
    return successful;
  } catch (error) {
    console.error("Copy failed:", error);
    toast.error("Failed to copy to clipboard");
    return false;
  }
}

/**
 * Copy image URL to clipboard
 */
export async function copyImageToClipboard(
  imageUrl: string | URL
): Promise<boolean> {
  const url = imageUrl instanceof URL ? imageUrl.toString() : imageUrl;
  return copyToClipboard(url, "Image URL copied to clipboard");
}

/**
 * Download an image from a URL. Generates a unique filename to avoid
 * collisions when multiple downloads happen in the same second.
 */
export async function downloadImage(imageUrl: string | URL): Promise<void> {
  if (!isBrowser()) return;

  const url = imageUrl instanceof URL ? imageUrl.toString() : imageUrl;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "image/*" },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blobUrl = window.URL.createObjectURL(await response.blob());
    const link = document.createElement("a");

    const uniqueSuffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");

    link.href = blobUrl;
    link.setAttribute("download", `image_${timestamp}_${uniqueSuffix}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    toast.success("Image download started");
  } catch (error) {
    console.error("Error downloading image:", error);
    toast.error("Failed to download image");
  }
}
