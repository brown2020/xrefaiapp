import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import net from "net";

const PRIVATE_CIDRS = [
  { subnet: "127.0.0.0", mask: 8 },
  { subnet: "10.0.0.0", mask: 8 },
  { subnet: "172.16.0.0", mask: 12 },
  { subnet: "192.168.0.0", mask: 16 },
  { subnet: "169.254.0.0", mask: 16 }, // link-local
];

const isPrivateIPv4 = (address: string) => {
  if (!net.isIPv4(address)) return false;

  const toLong = (ip: string) =>
    ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0);

  const addr = toLong(address);
  return PRIVATE_CIDRS.some(({ subnet, mask }) => {
    const subnetLong = toLong(subnet);
    const maskBits = -1 << (32 - mask);
    return (addr & maskBits) === (subnetLong & maskBits);
  });
};

const resolvePublicIp = async (hostname: string) => {
  const records = await dns.lookup(hostname, { all: true });
  const publicRecord = records.find(
    ({ address }) => net.isIP(address) && !isPrivateIPv4(address)
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
