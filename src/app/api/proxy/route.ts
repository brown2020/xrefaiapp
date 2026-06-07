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

/**
 * Expands any valid IPv6 textual form (compressed `::`, zone id, embedded
 * IPv4) into its 16 raw bytes. Returns null if the input is not IPv6 or cannot
 * be parsed. Expanding before classification prevents SSRF bypasses where a
 * private address is written in a non-prefixed compressed form (e.g.
 * `::fd00:1`, which does not start with "fc"/"fd").
 */
const expandIPv6ToBytes = (address: string): number[] | null => {
  if (!net.isIPv6(address)) return null;
  let addr = address.toLowerCase();

  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  // Pull out a trailing embedded IPv4 (e.g. ::ffff:127.0.0.1) and replace it
  // with two placeholder 16-bit groups so group counting stays correct.
  let ipv4Tail: number[] | null = null;
  const lastColon = addr.lastIndexOf(":");
  const tail = addr.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (!net.isIPv4(tail)) return null;
    ipv4Tail = tail.split(".").map((o) => Number(o));
    addr = `${addr.slice(0, lastColon + 1)}0:0`;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const back =
    halves.length === 2 && halves[1] ? halves[1].split(":").filter(Boolean) : [];

  const groups: number[] = [...head.map((g) => parseInt(g, 16))];
  if (halves.length === 2) {
    const missing = 8 - head.length - back.length;
    if (missing < 0) return null;
    for (let i = 0; i < missing; i++) groups.push(0);
  }
  groups.push(...back.map((g) => parseInt(g, 16)));

  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    if (!Number.isFinite(g) || g < 0 || g > 0xffff) return null;
    bytes.push((g >> 8) & 0xff, g & 0xff);
  }

  if (ipv4Tail && ipv4Tail.length === 4) {
    bytes[12] = ipv4Tail[0];
    bytes[13] = ipv4Tail[1];
    bytes[14] = ipv4Tail[2];
    bytes[15] = ipv4Tail[3];
  }

  return bytes;
};

const isNonPublicIPv6 = (address: string): boolean => {
  if (!net.isIPv6(address)) return false;
  const bytes = expandIPv6ToBytes(address);
  // If we cannot confidently parse it, fail closed (treat as non-public).
  if (!bytes) return true;

  // Unspecified ::
  if (bytes.every((b) => b === 0)) return true;
  // Loopback ::1
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true;
  // Unique local addresses fc00::/7
  if ((bytes[0] & 0xfe) === 0xfc) return true;
  // Link-local / site-local / other fe00::/8 reserved space
  if (bytes[0] === 0xfe) return true;
  // Multicast ff00::/8
  if (bytes[0] === 0xff) return true;

  // Embedded IPv4: mapped (::ffff:0:0/96) or compatible (::/96)
  const first10Zero = bytes.slice(0, 10).every((b) => b === 0);
  const isMapped = bytes[10] === 0xff && bytes[11] === 0xff;
  const isCompat = bytes[10] === 0 && bytes[11] === 0;
  if (first10Zero && (isMapped || isCompat)) {
    const v4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    if (net.isIPv4(v4)) return isNonPublicIPv4(v4);
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
