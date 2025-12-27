import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import net from "net";

/**
 * Non-public IPv4 ranges (private, local, reserved, etc.).
 * This is used to prevent SSRF into internal networks via the proxy endpoint.
 */
const NON_PUBLIC_IPV4_CIDRS = [
  { subnet: "0.0.0.0", mask: 8 }, // "this" network
  { subnet: "127.0.0.0", mask: 8 },
  { subnet: "10.0.0.0", mask: 8 },
  { subnet: "100.64.0.0", mask: 10 }, // CGNAT
  { subnet: "172.16.0.0", mask: 12 },
  { subnet: "192.168.0.0", mask: 16 },
  { subnet: "169.254.0.0", mask: 16 }, // link-local
  { subnet: "192.0.0.0", mask: 24 }, // IETF Protocol Assignments
  { subnet: "198.18.0.0", mask: 15 }, // benchmark testing
  { subnet: "224.0.0.0", mask: 4 }, // multicast
  { subnet: "240.0.0.0", mask: 4 }, // reserved
];

const ipv4ToUint32 = (ip: string) =>
  ip
    .split(".")
    .reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);

const isNonPublicIPv4 = (address: string) => {
  if (!net.isIPv4(address)) return false;

  const addr = ipv4ToUint32(address);
  return NON_PUBLIC_IPV4_CIDRS.some(({ subnet, mask }) => {
    const subnetLong = ipv4ToUint32(subnet);
    const maskBits = (0xffffffff << (32 - mask)) >>> 0;
    return (addr & maskBits) === (subnetLong & maskBits);
  });
};

const isNonPublicIPv6 = (address: string) => {
  if (!net.isIPv6(address)) return false;

  const normalized = address.toLowerCase();

  // Loopback / unspecified
  if (normalized === "::1" || normalized === "::") return true;

  // Unique local: fc00::/7
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local: fe80::/10 (fe8*, fe9*, fea*, feb*)
  if (/^fe[89ab]/.test(normalized)) return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:")) {
    const maybeIpv4 = normalized.slice("::ffff:".length);
    if (net.isIPv4(maybeIpv4)) return isNonPublicIPv4(maybeIpv4);
  }

  return false;
};

const isNonPublicIp = (address: string) =>
  isNonPublicIPv4(address) || isNonPublicIPv6(address);

const resolvePublicIp = async (hostname: string) => {
  const records = await dns.lookup(hostname, { all: true });
  const publicRecord = records.find(
    ({ address }) => net.isIP(address) && !isNonPublicIp(address)
  );

  if (!publicRecord) {
    throw new Error("Host resolves to a private or unsupported address.");
  }

  return publicRecord.address;
};

export async function GET(req: NextRequest) {
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

  const hostname = targetUrl.hostname.toLowerCase();
  try {
    await resolvePublicIp(hostname);
  } catch (error) {
    console.error("Blocked proxy target:", hostname, error);
    return NextResponse.json(
      { error: "Host is not allowed." },
      { status: 403 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json, text/plain;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "text/plain";
    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("Error fetching the URL:", error);
    const status = error instanceof Error && error.name === "AbortError" ? 504 : 502;
    return NextResponse.json(
      { error: "Failed to fetch the content." },
      { status }
    );
  }
}
