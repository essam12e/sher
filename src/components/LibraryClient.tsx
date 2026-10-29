"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { StatusPill } from "@/components/StatusPill";

type HostedImage = {
  id: string;
  publicUrl: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  compatibilityStatus: string;
  createdAt: string;
  product: { name: string; sku?: string | null };
};

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function LibraryClient() {
  const [images, setImages] = useState<HostedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/images/library");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل مكتبة الصور.");
    } finally {
      setLoading(false);
    }
  }

  async function retest(id: string) {
    setBusyId(id);
    setNotice("");
    try {
      const response = await fetch(`/api/images/${id}/retest`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setImages((prev) => prev.map((image) => (image.id === id ? data.image : image)));
      setNotice(data.report?.status === "READY" ? "الرابط يعمل ويجتاز كل الفحوص." : `الرابط لم يجتز الفحص: ${data.report?.reason ?? ""}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "تعذر إعادة الفحص.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف الصورة المستضافة؟ سيتوقف الرابط عن العمل في أي متجر يستخدمه.")) return;
    setBusyId(id);
    setNotice("");
    try {
      const response = await fetch(`/api/images/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setImages((prev) => prev.filter((image) => image.id !== id));
      setNotice("تم حذف الصورة.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "تعذر حذف الصورة.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter(
      (image) => image.product.name.toLowerCase().includes(q) || (image.product.sku ?? "").toLowerCase().includes(q),
    );
  }, [images, query]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> تحميل المكتبة...
      </div>
    );
  }
  if (error) return <div className="alert-error">{error}</div>;

  if (!images.length) {
    return (
      <div className="empty-state">
        لا توجد صور مستضافة بعد.{" "}
        <Link href="/" className="text-emerald-700 underline underline-offset-4">
          ابحث عن منتج واعتمد صورته
        </Link>{" "}
        لتظهر هنا.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">بحث في المكتبة</span>
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المنتج أو SKU"
            className="field pr-9"
            type="search"
          />
        </label>
        <span className="text-sm font-bold text-slate-500">
          {filtered.length} من {images.length} صورة
        </span>
      </div>

      {notice ? (
        <div className="alert-success" role="status">
          {notice}
        </div>
      ) : null}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((image) => {
          const busy = busyId === image.id;
          return (
            <li key={image.id} className="card flex min-w-0 flex-col gap-3 p-3 sm:p-4">
              <div className="flex gap-3">
                <a
                  href={image.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- الصورة مستضافة في Blob ولا تحتاج إعادة معالجة */}
                  <img src={image.publicUrl} alt={image.product.name} loading="lazy" className="h-full w-full object-contain" />
                </a>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-6 text-slate-950">{image.product.name}</h3>
                    <StatusPill value={image.compatibilityStatus} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                    {image.product.sku ? <span className="ltr">SKU: {image.product.sku}</span> : null}
                    <span className="ltr">
                      {image.width}×{image.height}
                    </span>
                    <span className="ltr">{sizeLabel(image.fileSize)}</span>
                    <span>{new Date(image.createdAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              </div>
              <div className="ltr truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600" title={image.publicUrl}>
                {image.publicUrl}
              </div>
              <div className="flex gap-2">
                <CopyButton text={image.publicUrl} className="btn-dark flex-1" />
                <a
                  href={image.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  title="فتح الرابط"
                  aria-label="فتح الرابط"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => retest(image.id)}
                  className="icon-btn disabled:opacity-50"
                  title="إعادة فحص الرابط"
                  aria-label="إعادة فحص الرابط"
                >
                  <RefreshCw className={["h-4 w-4", busy ? "animate-spin" : ""].join(" ")} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(image.id)}
                  className="icon-btn border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  title="حذف"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {!filtered.length ? <div className="empty-state">لا توجد نتائج مطابقة.</div> : null}
    </div>
  );
}
