"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Eye, Loader2, Search } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import type { CompatibilityCheck, ImageSearchResult, ProductInput } from "@/lib/types";

type HostedResponse = {
  duplicate: boolean;
  steps: string[];
  hostedImage: { publicUrl: string; width: number; height: number; mimeType: string; fileSize: number };
  compatibility: CompatibilityCheck;
};

const emptyProduct: ProductInput = { name: "", brand: "", model: "", sku: "", color: "", variant: "" };

function fileSize(value?: number) {
  if (!value) return "غير معروف";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function ProductSearchClient({ initialName = "" }: { initialName?: string }) {
  const [product, setProduct] = useState<ProductInput>({ ...emptyProduct, name: initialName });
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingUrl, setApprovingUrl] = useState<string | null>(null);
  const [hosted, setHosted] = useState<HostedResponse | null>(null);
  const [error, setError] = useState("");

  async function searchImages() {
    setLoading(true);
    setError("");
    setHosted(null);
    try {
      const response = await fetch("/api/search/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل البحث عن الصور.");
    } finally {
      setLoading(false);
    }
  }

  async function approve(result: ImageSearchResult) {
    setApprovingUrl(result.originalUrl);
    setError("");
    setHosted(null);
    try {
      const response = await fetch("/api/images/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product,
          sourceUrl: result.originalUrl,
          searchEvidence: [result.title, result.source, result.fileName].filter(Boolean).join(" "),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setHosted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل اعتماد الصورة.");
    } finally {
      setApprovingUrl(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-bold text-slate-700">اسم المنتج</span>
            <input
              value={product.name}
              onChange={(event) => setProduct({ ...product, name: event.target.value })}
              placeholder="Samsung Galaxy A56 5G"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600"
            />
          </label>
          {[
            ["brand", "Brand"],
            ["model", "Model"],
            ["sku", "SKU"],
            ["color", "Color"],
            ["variant", "Variant"],
          ].map(([key, label]) => (
            <label key={key}>
              <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
              <input
                value={String(product[key as keyof ProductInput] ?? "")}
                onChange={(event) => setProduct({ ...product, [key]: event.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600"
              />
            </label>
          ))}
        </div>
        <button
          onClick={searchImages}
          disabled={loading || product.name.trim().length < 2}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 font-extrabold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          بحث عن الصور
        </button>
      </section>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div> : null}

      {hosted ? (
        <section className="rounded-lg border border-emerald-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-slate-950">الرابط جاهز للاستخدام</h2>
            <StatusPill value={`E-commerce Compatibility: ${hosted.compatibility.status}`} />
          </div>
          <div className="ltr rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800">{hosted.hostedImage.publicUrl}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard.writeText(hosted.hostedImage.publicUrl)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              <Copy className="h-4 w-4" />
              Copy URL
            </button>
            <a href={hosted.hostedImage.publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
              <ExternalLink className="h-4 w-4" />
              Open URL
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["HTTPS", hosted.compatibility.https],
              ["HTTP Status: 200", hosted.compatibility.httpStatus === 200],
              ["Public Access", hosted.compatibility.publicAccess],
              ["Direct Image", hosted.compatibility.directImage],
              ["Server Fetch", hosted.compatibility.serverFetch],
              [`Dimensions: ${hosted.compatibility.dimensions ?? "-"}`, hosted.compatibility.dimensions !== null],
              ["Permanent URL", hosted.compatibility.permanentUrl],
              [`Content-Type: ${hosted.compatibility.contentType ?? "-"}`, hosted.compatibility.contentType?.startsWith("image/")],
            ].map(([label, pass]) => (
              <div key={String(label)} className="rounded-md border border-slate-200 p-3 text-sm font-bold">
                {label} <StatusPill value={pass ? "PASS" : "FAILED"} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((result) => (
          <article key={result.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="aspect-square bg-slate-100">
              <img src={result.thumbnailUrl || result.originalUrl} alt={result.title} className="h-full w-full object-contain" />
            </div>
            <div className="space-y-3 p-4">
              <h3 className="line-clamp-2 min-h-12 text-sm font-extrabold text-slate-950">{result.title}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                <div>الأبعاد: {result.width && result.height ? `${result.width}×${result.height}` : "غير معروف"}</div>
                <div>النوع: {result.mimeType ?? "غير معروف"}</div>
                <div>Match: {result.matchScore}/100</div>
                <div>Quality: {result.qualityScore}/100</div>
                <div>الحجم: {fileSize(result.fileSize)}</div>
                <div>المصدر: {result.source}</div>
              </div>
              <StatusPill value={result.watermarkStatus} />
              {result.rejectionReason ? <p className="rounded-md bg-rose-50 p-2 text-sm font-bold text-rose-700">{result.rejectionReason}</p> : null}
              <div className="flex gap-2">
                <a href={result.originalUrl} target="_blank" className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
                  <Eye className="h-4 w-4" />
                  معاينة
                </a>
                <button
                  disabled={!result.isAcceptable || approvingUrl === result.originalUrl}
                  onClick={() => approve(result)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {approvingUrl === result.originalUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  اعتماد الصورة
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
