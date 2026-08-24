import dns from "node:dns/promises";
import net from "node:net";

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inRange(ip: string, start: string, end: string) {
  const value = ipv4ToNumber(ip);
  return value >= ipv4ToNumber(start) && value <= ipv4ToNumber(end);
}

export function isBlockedIp(ip: string) {
  if (net.isIPv4(ip)) {
    return (
      inRange(ip, "0.0.0.0", "0.255.255.255") ||
      inRange(ip, "10.0.0.0", "10.255.255.255") ||
      inRange(ip, "127.0.0.0", "127.255.255.255") ||
      inRange(ip, "169.254.0.0", "169.254.255.255") ||
      inRange(ip, "172.16.0.0", "172.31.255.255") ||
      inRange(ip, "192.168.0.0", "192.168.255.255") ||
      inRange(ip, "100.64.0.0", "100.127.255.255") ||
      inRange(ip, "224.0.0.0", "239.255.255.255") ||
      ip === "255.255.255.255"
    );
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.") ||
      normalized.startsWith("::ffff:169.254.")
    );
  }

  return true;
}

export async function assertPublicUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("الرابط غير صالح.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("يسمح فقط بروابط HTTP أو HTTPS.");
  }

  if (!url.hostname || ["localhost", "metadata.google.internal"].includes(url.hostname.toLowerCase())) {
    throw new Error("الرابط يشير إلى وجهة محلية أو محظورة.");
  }

  if (net.isIP(url.hostname)) {
    if (isBlockedIp(url.hostname)) {
      throw new Error("الرابط يشير إلى عنوان IP خاص أو محظور.");
    }
    return url;
  }

  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("تعذر اعتماد الرابط لأن DNS يشير إلى شبكة خاصة أو محظورة.");
  }

  return url;
}
