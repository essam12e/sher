export function StatusPill({ value }: { value: string }) {
  const good = ["READY", "PASS", "No Watermark Detected"].includes(value);
  const warn = ["Possible Watermark"].includes(value);
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-extrabold",
        good ? "bg-emerald-50 text-emerald-700" : warn ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700",
      ].join(" ")}
    >
      {value}
    </span>
  );
}
