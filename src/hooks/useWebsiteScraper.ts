import { useState, useCallback } from "react";
import axios from "axios";
import { load } from "cheerio";
import toast from "react-hot-toast";

/**
 * Hook for scraping website content
 * Normalizes URLs and extracts text content from web pages
 */
export function useWebsiteScraper() {
  const [progress, setProgress] = useState(0);
  const MAX_SCRAPED_CHARS = 20000;

  const normalizeUrl = useCallback((value: string): string => {
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
  }, []);

  const scrapeWebsite = useCallback(
    async (rawUrl: string): Promise<string> => {
      try {
        const url = normalizeUrl(rawUrl);
        if (!url) {
          toast.error("Website URL is invalid");
          return "";
        }
        setProgress(20);

        const response = await axios.get("/api/proxy", { params: { url } });
        setProgress(50);

        const html = response.data;
        const $ = load(html);
        const scrapedContent = $("body").text().replace(/\s+/g, " ").trim();
        if (scrapedContent.length > MAX_SCRAPED_CHARS) {
          return scrapedContent.slice(0, MAX_SCRAPED_CHARS).trim();
        }

        return scrapedContent;
      } catch (err) {
        console.error("Error scraping website:", err);
        toast.error("Failed to scrape website");
        return "";
      }
    },
    [normalizeUrl]
  );

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
