const labels: Record<string, string> = {
  READY: "جاهز",
  FAILED: "فشل",
  PASS: "ناجح",
  "No Watermark Detected": "بدون علامة مائية",
  "Possible Watermark": "علامة مائية محتملة",
  "Watermark Detected": "علامة مائية",
};

export function StatusPill({ value, label }: { value: string; label?: string }) {
  const good = ["READY", "PASS", "No Watermark Detected"].includes(value);
  const warn = ["Possible Watermark"].includes(value);
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-extrabold",
        good ? "bg-brand-50 text-brand-600" : warn ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700",
      ].join(" ")}
    >
      {label ?? labels[value] ?? value}
    </span>
  );
}
