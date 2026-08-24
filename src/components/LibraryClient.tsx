"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
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

export function LibraryClient() {
  const [images, setImages] = useState<HostedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
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
    const response = await fetch(`/api/images/${id}/retest`, { method: "POST" });
    const data = await response.json();
    if (response.ok) setImages((prev) => prev.map((image) => (image.id === id ? data.image : image)));
  }

  async function remove(id: string) {
    if (!confirm("حذف الصورة المستضافة؟")) return;
    const response = await fetch(`/api/images/${id}`, { method: "DELETE" });
    if (response.ok) setImages((prev) => prev.filter((image) => image.id !== id));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <div className="flex items-center gap-2 font-bold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> تحميل المكتبة</div>;
  if (error) return <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-100 text-right text-xs font-extrabold text-slate-600">
            <tr>
              <th className="p-3">Preview</th>
              <th className="p-3">المنتج</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Resolution</th>
              <th className="p-3">File Size</th>
              <th className="p-3">Hosted URL</th>
              <th className="p-3">Compatibility</th>
              <th className="p-3">تاريخ الإضافة</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image) => (
              <tr key={image.id} className="border-t border-slate-200">
                <td className="p-3"><img src={image.publicUrl} alt={image.product.name} className="h-16 w-16 rounded-md object-contain" /></td>
                <td className="p-3 font-bold">{image.product.name}</td>
                <td className="p-3">{image.product.sku ?? "-"}</td>
                <td className="p-3 ltr">{image.width}×{image.height}</td>
                <td className="p-3">{(image.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                <td className="p-3"><div className="ltr max-w-xs truncate">{image.publicUrl}</div></td>
                <td className="p-3"><StatusPill value={image.compatibilityStatus} /></td>
                <td className="p-3">{new Date(image.createdAt).toLocaleString("ar-SA")}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button title="Copy URL" onClick={() => navigator.clipboard.writeText(image.publicUrl)} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50"><Copy className="h-4 w-4" /></button>
                    <a title="Open URL" href={image.publicUrl} target="_blank" className="rounded-md border border-slate-200 p-2 hover:bg-slate-50"><ExternalLink className="h-4 w-4" /></a>
                    <button title="Re-test" onClick={() => retest(image.id)} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
                    <button title="Delete" onClick={() => remove(image.id)} className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
