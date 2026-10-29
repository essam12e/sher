"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // نكمل بالطريقة البديلة
  }
  // بديل لمتصفحات الجوال القديمة أو الصفحات غير الآمنة
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

export function CopyButton({
  text,
  label = "نسخ الرابط",
  iconOnly = false,
  className,
}: {
  text: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function onClick() {
    const ok = await copyText(text);
    setState(ok ? "done" : "failed");
    window.setTimeout(() => setState("idle"), 1800);
  }

  const Icon = state === "done" ? Check : Copy;
  const text_ = state === "done" ? "تم النسخ" : state === "failed" ? "تعذر النسخ" : label;

  if (iconOnly) {
    return (
      <button type="button" onClick={onClick} title={text_} aria-label={text_} className={className ?? "icon-btn"}>
        <Icon className={["h-4 w-4", state === "done" ? "text-brand-600" : ""].join(" ")} />
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className ?? "btn-dark"} aria-live="polite">
      <Icon className="h-4 w-4" />
      {text_}
    </button>
  );
}
