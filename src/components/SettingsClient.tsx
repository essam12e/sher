"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

export function SettingsClient() {
  const [settings, setSettings] = useState({ minWidth: 500, minHeight: 500, maxFileSizeMb: 15 });
  const [message, setMessage] = useState("");

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

  async function save() {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMessage(response.ok ? "تم حفظ الإعدادات." : "فشل حفظ الإعدادات.");
  }

  return (
    <section className="max-w-3xl rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["minWidth", "Minimum Width"],
          ["minHeight", "Minimum Height"],
          ["maxFileSizeMb", "Maximum File Size MB"],
        ].map(([key, label]) => (
          <label key={key}>
            <span className="mb-1 block text-sm font-bold">{label}</span>
            <input type="number" value={settings[key as keyof typeof settings]} onChange={(event) => setSettings({ ...settings, [key]: Number(event.target.value) })} className="w-full rounded-md border border-slate-300 px-3 py-2.5" />
          </label>
        ))}
      </div>
      <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 font-extrabold text-white">
        <Save className="h-4 w-4" />
        حفظ الإعدادات
      </button>
      {message ? <p className="mt-3 font-bold text-emerald-700">{message}</p> : null}
    </section>
  );
}
