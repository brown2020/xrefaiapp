/**
 * Headers for bodies fetched by the website proxy.
 * The summarizer reads the text. Browsers must not execute it as a page on this origin.
 */
export function safeProxyHeaders(): Record<string, string> {
  return {
    "content-type": "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
    "content-disposition": "attachment",
  };
}
