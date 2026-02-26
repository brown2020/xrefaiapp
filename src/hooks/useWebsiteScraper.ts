import { useState, useCallback } from "react";
import toast from "react-hot-toast";

const MAX_SCRAPED_CHARS = 20_000;

function normalizeUrl(value: string): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    return `https://${value.replace(/^https?:\/\//i, "")}`;
  }
}

function extractTextFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const tag of Array.from(doc.querySelectorAll("script, style, noscript"))) {
    tag.remove();
  }
  return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Hook for scraping website content via the server-side proxy.
 * Uses native fetch + DOMParser instead of axios + cheerio to keep the client bundle lean.
 */
export function useWebsiteScraper() {
  const [progress, setProgress] = useState(0);

  const scrapeWebsite = useCallback(async (rawUrl: string): Promise<string> => {
    try {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        toast.error("Website URL is invalid");
        return "";
      }
      setProgress(20);

      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      setProgress(50);

      if (!res.ok) {
        throw new Error(`Proxy returned ${res.status}`);
      }

      const html = await res.text();
      const text = extractTextFromHtml(html);

      return text.length > MAX_SCRAPED_CHARS
        ? text.slice(0, MAX_SCRAPED_CHARS).trim()
        : text;
    } catch (err) {
      console.error("Error scraping website:", err);
      toast.error("Failed to scrape website");
      return "";
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
  }, []);

  return {
    scrapeWebsite,
    progress,
    setProgress,
    resetProgress,
    normalizeUrl,
  };
}
