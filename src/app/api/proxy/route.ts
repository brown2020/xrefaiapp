import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import net from "net";
import https from "https";
import { requireAuthedUidFromRequest } from "@/utils/requireAuthedRequest";
import { rateLimitMiddleware } from "@/utils/rateLimit";

export const runtime = "nodejs";

/** Maximum bytes of the remote response to relay to the client. */
const MAX_RESPONSE_BYTES = 1_000_000;
/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Non-public IPv4 ranges (private, local, reserved, etc.).
 * Used to prevent SSRF into internal networks via the proxy endpoint.
 */
const NON_PUBLIC_IPV4_CIDRS = [
  { subnet: "0.0.0.0", mask: 8 },
  { subnet: "127.0.0.0", mask: 8 },
  { subnet: "10.0.0.0", mask: 8 },
  { subnet: "100.64.0.0", mask: 10 },
  { subnet: "172.16.0.0", mask: 12 },
  { subnet: "192.168.0.0", mask: 16 },
  { subnet: "169.254.0.0", mask: 16 },
  { subnet: "192.0.0.0", mask: 24 },
  { subnet: "198.18.0.0", mask: 15 },
  { subnet: "224.0.0.0", mask: 4 },
  { subnet: "240.0.0.0", mask: 4 },
];

const ipv4ToUint32 = (ip: string): number =>
  ip
    .split(".")
    .reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);

const isNonPublicIPv4 = (address: string): boolean => {
  if (!net.isIPv4(address)) return false;
  const addr = ipv4ToUint32(address);
  return NON_PUBLIC_IPV4_CIDRS.some(({ subnet, mask }) => {
    const subnetLong = ipv4ToUint32(subnet);
    const maskBits = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0;
    return (addr & maskBits) === (subnetLong & maskBits);
  });
};

const isNonPublicIPv6 = (address: string): boolean => {
  if (!net.isIPv6(address)) return false;
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) {
    const maybeIpv4 = normalized.slice("::ffff:".length);
    if (net.isIPv4(maybeIpv4)) return isNonPublicIPv4(maybeIpv4);
  }
  return false;
};

const isNonPublicIp = (address: string): boolean =>
  isNonPublicIPv4(address) || isNonPublicIPv6(address);

async function resolvePublicIp(hostname: string): Promise<string> {
  const records = await dns.lookup(hostname, { all: true });
  const publicRecord = records.find(
    ({ address }) => net.isIP(address) && !isNonPublicIp(address)
  );
  if (!publicRecord) {
    throw new Error("Host resolves to a private or unsupported address.");
  }
  return publicRecord.address;
}

/**
 * Fetches the URL by connecting directly to the resolved public IP. This
 * closes the TOCTOU window that exists when Node's `fetch` does its own DNS
 * lookup after our verification: the IP we verified is the IP we talk to.
 * The original hostname is preserved for SNI and the `Host` header so TLS
 * certificate verification and HTTP virtual-host routing still work.
 */
function fetchFromVerifiedIp(
  targetUrl: URL,
  publicIp: string,
  signal: AbortSignal
): Promise<{ status: number; headers: Map<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: publicIp,
        servername: targetUrl.hostname, // SNI
        port: 443,
        method: "GET",
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers: {
          Host: targetUrl.hostname,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
          "User-Agent": "XrefAi-Scraper/1.0",
        },
        signal,
      },
      (res) => {
        const headers = new Map<string, string>();
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") headers.set(key, value);
          else if (Array.isArray(value)) headers.set(key, value.join(", "));
        }

        const chunks: Buffer[] = [];
        let received = 0;
        let aborted = false;

        res.on("data", (chunk: Buffer) => {
          if (aborted) return;
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            aborted = true;
            const remaining = MAX_RESPONSE_BYTES - (received - chunk.length);
            if (remaining > 0) chunks.push(chunk.slice(0, remaining));
            req.destroy();
            resolve({
              status: res.statusCode ?? 502,
              headers,
              body: Buffer.concat(chunks),
            });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (aborted) return;
          resolve({
            status: res.statusCode ?? 502,
            headers,
            body: Buffer.concat(chunks),
          });
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  let uid: string;
  try {
    uid = await requireAuthedUidFromRequest(req);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const rateLimited = await rateLimitMiddleware(uid, "default");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const targetParam = searchParams.get("url");

  if (!targetParam) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetParam);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL parameter." },
      { status: 400 }
    );
  }

  if (targetUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only HTTPS requests are allowed." },
      { status: 400 }
    );
  }

  if (targetUrl.username || targetUrl.password) {
    return NextResponse.json(
      { error: "Credentials in URLs are not allowed." },
      { status: 400 }
    );
  }

  if (targetUrl.port && targetUrl.port !== "443") {
    return NextResponse.json(
      { error: "Only the default HTTPS port is allowed." },
      { status: 400 }
    );
  }

  const hostname = targetUrl.hostname.toLowerCase();
  if (net.isIP(hostname)) {
    return NextResponse.json(
      { error: "IP address targets are not allowed." },
      { status: 400 }
    );
  }

  let publicIp: string;
  try {
    publicIp = await resolvePublicIp(hostname);
  } catch (error) {
    console.error("Blocked proxy target:", hostname, error);
    return NextResponse.json(
      { error: "Host is not allowed." },
      { status: 403 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchFromVerifiedIp(targetUrl, publicIp, controller.signal);
    clearTimeout(timeout);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      return NextResponse.json(
        { error: "Redirects are not allowed." },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "text/plain";

    // Node's `Buffer` is not always recognized as a `BodyInit` depending on
    // which DOM/BodyInit types are in scope. Wrap into a Blob which is
    // universally accepted as a Response body.
    const bodyBlob = new Blob([new Uint8Array(response.body)], {
      type: contentType,
    });
    return new NextResponse(bodyBlob, {
      status: response.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("Error fetching the URL:", error);
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.message === "aborted");
    return NextResponse.json(
      { error: "Failed to fetch the content." },
      { status: isAbort ? 504 : 502 }
    );
  }
}
