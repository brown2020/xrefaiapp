import toast from "react-hot-toast";

const COPY_SUCCESS_MESSAGE = "Image URL copied to clipboard.";
const COPY_ERROR_MESSAGE = "Failed to copy image URL.";

const isBrowser = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined";

const toUrlString = (imageUrlData: string | URL) =>
  imageUrlData instanceof URL ? imageUrlData.toString() : imageUrlData;

const copyViaInputFallback = (text: string) => {
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

export const copyImageToClipboard = async (
  imageUrlData: string | URL
): Promise<{ success: boolean; message: string }> => {
  if (!isBrowser()) {
    return { success: false, message: COPY_ERROR_MESSAGE };
  }

  const imageUrl = toUrlString(imageUrlData);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(imageUrl);
      toast.success(COPY_SUCCESS_MESSAGE);
      return { success: true, message: COPY_SUCCESS_MESSAGE };
    }

    const successful = copyViaInputFallback(imageUrl);
    const message = successful ? COPY_SUCCESS_MESSAGE : COPY_ERROR_MESSAGE;
    toast[successful ? "success" : "error"](message);

    return { success: successful, message };
  } catch (error) {
    console.error(error);
    toast.error(COPY_ERROR_MESSAGE);
    return { success: false, message: COPY_ERROR_MESSAGE };
  }
};

export const downloadImage = async (imageUrlData: string | URL) => {
  if (!isBrowser()) {
    return;
  }

  try {
    const response = await fetch(toUrlString(imageUrlData), {
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

    toast.success("Image download started.");
  } catch (error) {
    console.error("Error downloading the image", error);
    toast.error("Failed to download image.");
  }
};

export const shareImage = async () => {
  if (!isBrowser()) {
    return;
  }

  try {
    toast.success("Coming Soon");
  } catch (error) {
    console.error(error, "shareImage error");
    toast.error("Failed to share image.");
  }
};
