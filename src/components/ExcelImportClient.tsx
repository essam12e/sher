"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";

type Preview = {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
  totalRows: number;
  suggestedMapping: Partial<Mapping>;
};

type Mapping = { productNameColumn: string; skuColumn: string; imageUrlColumn: string };

const emptyMapping: Mapping = { productNameColumn: "", skuColumn: "", imageUrlColumn: "" };

const mappingFields: { key: keyof Mapping; label: string; hint: string; required: boolean }[] = [
  { key: "productNameColumn", label: "عمود اسم المنتج", hint: "مطلوب", required: true },
  { key: "skuColumn", label: "عمود SKU", hint: "اختياري — الأدق في الربط", required: false },
  { key: "imageUrlColumn", label: "عمود رابط الصورة", hint: "مطلوب — سيتم تعبئته", required: true },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-extrabold text-slate-950">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ExcelImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [overwrite, setOverwrite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function loadPreview(nextFile: File, sheetName?: string) {
    setLoading(true);
    setError("");
    setResult("");
    const form = new FormData();
    form.append("file", nextFile);
    if (sheetName) form.append("sheetName", sheetName);
    try {
      const response = await fetch("/api/excel/preview", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFile(nextFile);
      setPreview(data);
      setMapping({
        productNameColumn: data.suggestedMapping?.productNameColumn ?? "",
        skuColumn: data.suggestedMapping?.skuColumn ?? "",
        imageUrlColumn: data.suggestedMapping?.imageUrlColumn ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل قراءة ملف Excel.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setMapping(emptyMapping);
    setError("");
    setResult("");
  }

  async function exportFile() {
    if (!preview || !file) return;
    setExporting(true);
    setError("");
    setResult("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sheetName", preview.activeSheet);
      form.append("overwriteExisting", String(overwrite));
      form.append(
        "mapping",
        JSON.stringify({
          productNameColumn: mapping.productNameColumn,
          imageUrlColumn: mapping.imageUrlColumn,
          skuColumn: mapping.skuColumn || undefined,
        }),
      );
      const response = await fetch("/api/excel/export", { method: "POST", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "فشل تصدير ملف Excel.");
      }
      const changed = Number(response.headers.get("x-changed-rows") ?? 0);
      const unmatched = Number(response.headers.get("x-unmatched-rows") ?? 0);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products-with-images.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResult(
        changed
          ? `تم تحميل الملف. تمت تعبئة ${changed} صف${unmatched ? `، و${unmatched} صف بدون صورة في المكتبة` : ""}.`
          : "تم تحميل الملف، لكن لم يتطابق أي صف مع صور المكتبة. تأكد من اختيار عمود SKU أو الاسم الصحيح.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تصدير ملف Excel.");
    } finally {
      setExporting(false);
    }
  }

  const canExport = Boolean(mapping.productNameColumn && mapping.imageUrlColumn) && !exporting;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm font-bold leading-7 text-emerald-900">
        ارفع ملف منتجات متجرك، وسيتم تعبئة عمود الصورة تلقائيًا من الصور التي اعتمدتها في المكتبة (بالمطابقة عبر SKU ثم اسم المنتج).
        الملف الأصلي لا يتغير، وتحصل على نسخة جديدة جاهزة للرفع في سلة أو زد.
      </div>

      <Step n={1} title="ارفع ملف المنتجات">
        {file ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-700" />
              <span className="ltr truncate">{file.name}</span>
              {preview ? <span className="shrink-0 text-xs text-slate-500">({preview.totalRows} صف)</span> : null}
            </div>
            <button type="button" onClick={reset} className="btn-outline min-h-10 py-2">
              <RotateCcw className="h-4 w-4" />
              ملف آخر
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
            {loading ? (
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-700" />
            ) : (
              <FileSpreadsheet className="mb-3 h-8 w-8 text-emerald-700" />
            )}
            <span className="font-extrabold text-slate-900">{loading ? "جاري قراءة الملف..." : "اضغط لاختيار ملف xlsx"}</span>
            <span className="mt-1 text-xs font-bold text-slate-500">الحد الأقصى 10MB</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={loading}
              onChange={(event) => {
                const picked = event.target.files?.[0];
                event.target.value = "";
                if (picked) void loadPreview(picked);
              }}
            />
          </label>
        )}
      </Step>

      {error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : null}

      {preview && file ? (
        <>
          <Step n={2} title="اختر الأعمدة">
            {preview.sheetNames.length > 1 ? (
              <label className="mb-4 block sm:max-w-xs">
                <span className="field-label">الورقة</span>
                <select
                  value={preview.activeSheet}
                  onChange={(event) => void loadPreview(file, event.target.value)}
                  className="field"
                  disabled={loading}
                >
                  {preview.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {mappingFields.map(({ key, label, hint, required }) => (
                <label key={key}>
                  <span className="field-label">
                    {label} <span className="text-xs font-medium text-slate-500">({hint})</span>
                  </span>
                  <select
                    value={mapping[key]}
                    onChange={(event) => setMapping({ ...mapping, [key]: event.target.value })}
                    className="field"
                  >
                    <option value="">{required ? "اختر العمود" : "بدون"}</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-bold text-slate-500">معاينة أول {Math.min(preview.rows.length, 10)} صفوف (اسحب أفقيًا لرؤية كل الأعمدة)</div>
              <div className="-mx-4 overflow-x-auto border-y border-slate-200 sm:mx-0 sm:rounded-lg sm:border">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-slate-100 text-right text-xs font-extrabold text-slate-600">
                    <tr>
                      {preview.headers.map((header) => {
                        const role = (Object.keys(mapping) as (keyof Mapping)[]).find((key) => mapping[key] === header);
                        return (
                          <th
                            key={header}
                            className={["whitespace-nowrap p-3", role ? "bg-emerald-100 text-emerald-900" : ""].join(" ")}
                          >
                            {header}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        {preview.headers.map((header) => (
                          <td key={header} className="max-w-56 truncate whitespace-nowrap p-3" title={String(row[header] ?? "")}>
                            {String(row[header] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Step>

          <Step n={3} title="صدّر الملف الجديد">
            <label className="mb-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(event) => setOverwrite(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              />
              <span>استبدال الروابط الموجودة في الملف إذا وُجدت صورة أحدث في المكتبة</span>
            </label>
            <button type="button" onClick={exportFile} disabled={!canExport} className="btn-primary w-full sm:w-auto">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "جاري التجهيز..." : "تصدير products-with-images.xlsx"}
            </button>
            {result ? (
              <div className="alert-success mt-4" role="status">
                {result}
              </div>
            ) : null}
          </Step>
        </>
      ) : null}
    </div>
  );
}
