"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, ImageOff, Loader2, Search } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { StatusPill } from "@/components/StatusPill";
import type { CompatibilityCheck, ImageSearchResult, ProductInput } from "@/lib/types";

type HostedResponse = {
  duplicate: boolean;
  steps: string[];
  hostedImage: { publicUrl: string; width: number; height: number; mimeType: string; fileSize: number };
  compatibility: CompatibilityCheck;
};

const emptyProduct: ProductInput = { name: "", brand: "", model: "", sku: "", color: "", variant: "" };

const optionalFields: { key: keyof ProductInput; label: string; placeholder: string }[] = [
  { key: "brand", label: "العلامة التجارية", placeholder: "Samsung" },
  { key: "model", label: "الموديل", placeholder: "A56" },
  { key: "sku", label: "SKU / رمز المنتج", placeholder: "SAM-A56-BLK" },
  { key: "color", label: "اللون", placeholder: "Black" },
  { key: "variant", label: "الخيار / السعة", placeholder: "256GB" },
];

function fileSize(value?: number) {
  if (!value) return "غير معروف";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function mimeLabel(value?: string) {
  return value ? value.replace("image/", "").toUpperCase() : "غير معروف";
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { error: `استجابة غير متوقعة من الخادم (HTTP ${response.status}).` };
  }
}

function ResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center text-slate-400">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- صور خارجية من نتائج البحث لا تمر عبر next/image
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
}

export function ProductSearchClient({ initialName = "", autoSearch = false }: { initialName?: string; autoSearch?: boolean }) {
  const [product, setProduct] = useState<ProductInput>({ ...emptyProduct, name: initialName });
  const [results, setResults] = useState<ImageSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [approvingUrl, setApprovingUrl] = useState<string | null>(null);
  const [hosted, setHosted] = useState<HostedResponse | null>(null);
  const [error, setError] = useState("");
  const hostedRef = useRef<HTMLElement>(null);
  const autoStarted = useRef(false);

  const canSearch = product.name.trim().length >= 2;

  async function searchImages(event?: React.FormEvent) {
    event?.preventDefault();
    if (!canSearch || loading) return;
    setLoading(true);
    setError("");
    setHosted(null);
    try {
      const response = await fetch("/api/search/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل البحث عن الصور.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSearch && initialName && !autoStarted.current) {
      autoStarted.current = true;
      void searchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch, initialName]);

  useEffect(() => {
    if (hosted) hostedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hosted]);

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
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error);
      setHosted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل اعتماد الصورة.");
    } finally {
      setApprovingUrl(null);
    }
  }

  const acceptableCount = results?.filter((result) => result.isAcceptable).length ?? 0;

  return (
    <div className="space-y-5">
      <form onSubmit={searchImages} className="card">
        <label className="block">
          <span className="field-label">اسم المنتج</span>
          <input
            value={product.name}
            onChange={(event) => setProduct({ ...product, name: event.target.value })}
            placeholder="مثال: Samsung Galaxy A56 5G"
            enterKeyHint="search"
            autoComplete="off"
            className="field"
          />
        </label>

        <details className="group mt-3 rounded-lg border border-slate-200 open:bg-slate-50/60">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
            بيانات إضافية لدقة أعلى (اختياري)
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
            {optionalFields.map(({ key, label, placeholder }) => (
              <label key={key}>
                <span className="field-label">{label}</span>
                <input
                  value={String(product[key] ?? "")}
                  onChange={(event) => setProduct({ ...product, [key]: event.target.value })}
                  placeholder={placeholder}
                  autoComplete="off"
                  className="field"
                />
              </label>
            ))}
          </div>
        </details>

        <button type="submit" disabled={loading || !canSearch} className="btn-primary mt-4 w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "جاري البحث وفحص الصور..." : "بحث عن الصور"}
        </button>
      </form>

      {error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : null}

      {hosted ? (
        <section ref={hostedRef} className="card scroll-mt-20 border-emerald-200">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-slate-950 sm:text-xl">
              {hosted.duplicate ? "الصورة مستضافة مسبقًا — الرابط جاهز" : "الرابط جاهز للاستخدام"}
            </h2>
            <StatusPill value={hosted.compatibility.status} />
          </div>
          <div className="ltr break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800">
            {hosted.hostedImage.publicUrl}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
            <CopyButton text={hosted.hostedImage.publicUrl} />
            <a href={hosted.hostedImage.publicUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <ExternalLink className="h-4 w-4" />
              فتح الرابط
            </a>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["HTTPS", hosted.compatibility.https],
              ["HTTP 200", hosted.compatibility.httpStatus === 200],
              ["وصول عام", hosted.compatibility.publicAccess],
              ["صورة مباشرة", hosted.compatibility.directImage],
              ["جلب من الخادم", hosted.compatibility.serverFetch],
              [`الأبعاد ${hosted.compatibility.dimensions ?? "-"}`, hosted.compatibility.dimensions !== null],
              ["رابط دائم", hosted.compatibility.permanentUrl],
              [`النوع ${mimeLabel(hosted.compatibility.contentType ?? undefined)}`, Boolean(hosted.compatibility.contentType?.startsWith("image/"))],
            ].map(([label, pass]) => (
              <div key={String(label)} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-xs font-bold sm:text-sm">
                <span className="min-w-0 truncate">{label}</span>
                <StatusPill value={pass ? "PASS" : "FAILED"} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {results !== null && !loading ? (
        results.length ? (
          <p className="text-sm font-bold text-slate-600">
            {results.length} نتيجة — {acceptableCount} منها صالحة للاعتماد. النتائج مرتبة من الأفضل.
          </p>
        ) : (
          <div className="empty-state">لم يتم العثور على صور. جرّب كتابة اسم المنتج بالإنجليزية أو أضف العلامة التجارية والموديل.</div>
        )
      ) : null}

      {loading && !results?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : null}

      {results?.length ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => {
            const approving = approvingUrl === result.originalUrl;
            return (
              <article
                key={result.id}
                className={[
                  "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm",
                  result.isAcceptable ? "border-slate-200" : "border-slate-200 opacity-80",
                ].join(" ")}
              >
                <div className="aspect-[4/3] bg-slate-100 sm:aspect-square">
                  <ResultImage src={result.thumbnailUrl || result.originalUrl} alt={result.title} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <h3 className="line-clamp-2 text-sm font-extrabold leading-6 text-slate-950">{result.title}</h3>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-bold text-slate-600">
                    <div>
                      <dt className="inline text-slate-400">الأبعاد: </dt>
                      <dd className="ltr inline">{result.width && result.height ? `${result.width}×${result.height}` : "غير معروف"}</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-400">النوع: </dt>
                      <dd className="inline">{mimeLabel(result.mimeType)}</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-400">التطابق: </dt>
                      <dd className="inline">{result.matchScore}/100</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-400">الجودة: </dt>
                      <dd className="inline">{result.qualityScore}/100</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-400">الحجم: </dt>
                      <dd className="ltr inline">{fileSize(result.fileSize)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="inline text-slate-400">المصدر: </dt>
                      <dd className="ltr inline break-all">{result.source}</dd>
                    </div>
                  </dl>
                  <div>
                    <StatusPill value={result.watermarkStatus} />
                  </div>
                  {result.rejectionReason ? (
                    <p className="rounded-lg bg-rose-50 p-2.5 text-xs font-bold leading-5 text-rose-700">{result.rejectionReason}</p>
                  ) : null}
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                    <a href={result.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3">
                      <ExternalLink className="h-4 w-4" />
                      معاينة
                    </a>
                    <button
                      type="button"
                      disabled={!result.isAcceptable || approvingUrl !== null}
                      onClick={() => approve(result)}
                      className="btn-primary px-3"
                    >
                      {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {approving ? "جاري الرفع..." : "اعتماد"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
