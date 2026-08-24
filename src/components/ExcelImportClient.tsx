"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

type Preview = {
  workbookId: string;
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
};

export function ExcelImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState({ productNameColumn: "", skuColumn: "", productIdColumn: "", imageUrlColumn: "" });
  const [updatesJson, setUpdatesJson] = useState("[]");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/excel/preview", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreview(data);
      setMapping({
        productNameColumn: "",
        skuColumn: "",
        productIdColumn: "",
        imageUrlColumn: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل قراءة ملف Excel.");
    } finally {
      setLoading(false);
    }
  }

  async function exportFile() {
    if (!preview) return;
    setError("");
    try {
      const updates = JSON.parse(updatesJson);
      const response = await fetch("/api/excel/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workbookId: preview.workbookId,
          sheetName: preview.activeSheet,
          mapping: {
            ...mapping,
            skuColumn: mapping.skuColumn || undefined,
            productIdColumn: mapping.productIdColumn || undefined,
          },
          updates,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products-with-images.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تصدير ملف Excel.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center hover:bg-slate-50">
          {loading ? <Loader2 className="mb-3 h-7 w-7 animate-spin text-emerald-700" /> : <FileSpreadsheet className="mb-3 h-7 w-7 text-emerald-700" />}
          <span className="font-extrabold text-slate-900">ارفع ملف xlsx</span>
          <span className="mt-1 text-sm text-slate-500">سيتم عرض Preview ثم تختار الأعمدة يدويًا.</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </section>
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div> : null}
      {preview ? (
        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["productNameColumn", "Product Name Column"],
              ["skuColumn", "SKU Column"],
              ["productIdColumn", "Product ID Column"],
              ["imageUrlColumn", "Image URL Column"],
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-sm font-bold">{label}</span>
                <select value={mapping[key as keyof typeof mapping]} onChange={(event) => setMapping({ ...mapping, [key]: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5">
                  <option value="">اختر العمود</option>
                  {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-100 text-right font-extrabold">
                <tr>{preview.headers.map((header) => <th key={header} className="p-3">{header}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-t border-slate-200">
                    {preview.headers.map((header) => <td key={header} className="p-3">{String(row[header] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Hosted URL Updates JSON</span>
            <textarea value={updatesJson} onChange={(event) => setUpdatesJson(event.target.value)} rows={5} className="ltr w-full rounded-md border border-slate-300 p-3 text-sm" />
          </label>
          <button onClick={exportFile} disabled={!mapping.productNameColumn || !mapping.imageUrlColumn} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 font-extrabold text-white disabled:opacity-60">
            <Download className="h-4 w-4" />
            تصدير products-with-images.xlsx
          </button>
        </section>
      ) : null}
    </div>
  );
}
