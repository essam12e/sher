"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

type Settings = { minWidth: number; minHeight: number; maxFileSizeMb: number };

const fields: { key: keyof Settings; label: string; hint: string; min: number; max: number }[] = [
  { key: "minWidth", label: "أقل عرض للصورة (px)", hint: "بين 100 و 4000", min: 100, max: 4000 },
  { key: "minHeight", label: "أقل ارتفاع للصورة (px)", hint: "بين 100 و 4000", min: 100, max: 4000 },
  { key: "maxFileSizeMb", label: "أقصى حجم للملف (MB)", hint: "بين 1 و 50", min: 1, max: 50 },
];

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings>({ minWidth: 500, minHeight: 500, maxFileSizeMb: 15 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (
          data &&
          typeof data.minWidth === "number" &&
          typeof data.minHeight === "number" &&
          typeof data.maxFileSizeMb === "number"
        ) {
          setSettings(data);
        }
      })
      .catch(() => undefined);
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? { ok: true, text: "تم حفظ الإعدادات." } : { ok: false, text: data.error ?? "فشل حفظ الإعدادات." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map(({ key, label, hint, min, max }) => (
          <label key={key}>
            <span className="field-label">{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              required
              value={Number.isFinite(settings[key]) ? settings[key] : ""}
              onChange={(event) => setSettings({ ...settings, [key]: event.target.valueAsNumber })}
              className="field ltr"
            />
            <span className="mt-1 block text-xs font-medium text-slate-500">{hint}</span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold leading-6 text-slate-500">
        الصور الأصغر من هذه الأبعاد أو الأكبر من الحجم المحدد لن تكون قابلة للاعتماد. معظم المتاجر تفضّل صورًا مربعة بدقة 800×800 أو أعلى.
      </p>
      <button type="submit" disabled={saving} className="btn-primary mt-4 w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ الإعدادات
      </button>
      {message ? <p className={[message.ok ? "alert-success" : "alert-error", "mt-4"].join(" ")}>{message.text}</p> : null}
    </form>
  );
}
