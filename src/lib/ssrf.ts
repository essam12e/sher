import dns from "node:dns/promises";
import net from "node:net";

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inRange(ip: string, start: string, end: string) {
  const value = ipv4ToNumber(ip);
  return value >= ipv4ToNumber(start) && value <= ipv4ToNumber(end);
}

const blockedV4: [string, string][] = [
  ["0.0.0.0", "0.255.255.255"],
  ["10.0.0.0", "10.255.255.255"],
  ["100.64.0.0", "100.127.255.255"],
  ["127.0.0.0", "127.255.255.255"],
  ["169.254.0.0", "169.254.255.255"],
  ["172.16.0.0", "172.31.255.255"],
  ["192.0.0.0", "192.0.0.255"],
  ["192.0.2.0", "192.0.2.255"],
  ["192.168.0.0", "192.168.255.255"],
  ["198.18.0.0", "198.19.255.255"],
  ["198.51.100.0", "198.51.100.255"],
  ["203.0.113.0", "203.0.113.255"],
  ["224.0.0.0", "255.255.255.255"],
];

/** يستخرج عنوان IPv4 من صيغ IPv6 المدمجة مثل ::ffff:127.0.0.1 أو ::ffff:7f00:1 */
function embeddedIpv4(ipv6: string) {
  const match = ipv6.match(/^(?:0*:)*:?(?:ffff:)?(?:0*:)?((?:\d{1,3}\.){3}\d{1,3})$/i);
  if (match && net.isIPv4(match[1])) return match[1];
  const hex = ipv6.match(/^(?:0*:)*:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join(".");
  }
  return null;
}

export function isBlockedIp(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, "").split("%")[0];

  if (net.isIPv4(address)) {
    return blockedV4.some(([start, end]) => inRange(address, start, end));
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    const mapped = embeddedIpv4(normalized);
    if (mapped) return isBlockedIp(mapped);
    return (
      normalized === "::1" ||
      normalized === "::" ||
      /^f[cd]/.test(normalized) ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8") ||
      normalized.startsWith("64:ff9b:")
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

  if (url.username || url.password) {
    throw new Error("لا يسمح بروابط تحتوي على اسم مستخدم أو كلمة مرور.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("الرابط يشير إلى وجهة محلية أو محظورة.");
  }

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new Error("الرابط يشير إلى عنوان IP خاص أو محظور.");
    }
    return url;
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("تعذر اعتماد الرابط لأن DNS يشير إلى شبكة خاصة أو محظورة.");
  }

  return url;
}
