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
  const successful = document.execCommand("copy");
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
    if (successful) {
      toast.success(successMessage);
    } else {
      toast.error("Failed to copy to clipboard");
    }
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
 * Download an image from a URL
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

    link.href = blobUrl;
    link.setAttribute(
      "download",
      `image_${new Date().toISOString().replace(/[-:.]/g, "")}.png`
    );
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





