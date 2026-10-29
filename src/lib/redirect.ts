/** يسمح فقط بمسارات داخلية مثل /library لمنع التحويل إلى مواقع خارجية بعد الدخول. */
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/login") || value.startsWith("/api/")) return "/";
  return value;
}
