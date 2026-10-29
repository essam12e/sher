"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, ImageOff, Link2, Loader2, Search, Upload } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { StatusPill } from "@/components/StatusPill";
import { prepareImageForUpload } from "@/lib/client-image";
import { buildSearchQuery } from "@/lib/query";
import type { CompatibilityCheck, ImageSearchResult, ProductInput } from "@/lib/types";

type HostedResponse = {
  duplicate: boolean;
  steps: string[];
  hostedImage: { publicUrl: string; width: number; height: number; mimeType: string; fileSize: number };
  compatibility: CompatibilityCheck;
};

type Mode = "search" | "url" | "upload";

const emptyProduct: ProductInput = { name: "", brand: "", model: "", sku: "", color: "", variant: "" };

const optionalFields: { key: keyof ProductInput; label: string; placeholder: string }[] = [
  { key: "brand", label: "العلامة التجارية", placeholder: "Samsung" },
  { key: "model", label: "الموديل", placeholder: "A56" },
  { key: "sku", label: "SKU / رمز المنتج", placeholder: "SAM-A56-BLK" },
  { key: "color", label: "اللون", placeholder: "Black" },
  { key: "variant", label: "الخيار / السعة", placeholder: "256GB" },
];

const modes: { id: Mode; label: string; icon: typeof Search }[] = [
  { id: "search", label: "بحث تلقائي", icon: Search },
  { id: "url", label: "لصق رابط", icon: Link2 },
  { id: "upload", label: "رفع صورة", icon: Upload },
];

function fileSize(value?: number) {
  if (!value) return "غير معروف";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function mimeLabel(value?: string | null) {
  return value ? value.split(";")[0].replace("image/", "").toUpperCase() : "غير معروف";
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {
      error:
        response.status === 413
          ? "حجم الملف أكبر من المسموح."
          : response.status === 504
            ? "استغرقت العملية وقتًا طويلًا. حاول مرة أخرى."
            : `استجابة غير متوقعة من الخادم (HTTP ${response.status}).`,
    };
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
    // eslint-disable-next-line @next/next/no-img-element -- صور خارجية من نتائج البحث
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

export function ProductSearchClient({
  initialName = "",
  autoSearch = false,
  showModes = true,
}: {
  initialName?: string;
  autoSearch?: boolean;
  showModes?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [product, setProduct] = useState<ProductInput>({ ...emptyProduct, name: initialName });
  const [results, setResults] = useState<ImageSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [approvingUrl, setApprovingUrl] = useState<string | null>(null);
  const [hosted, setHosted] = useState<HostedResponse | null>(null);
  const [error, setError] = useState("");
  const [pastedUrl, setPastedUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const hostedRef = useRef<HTMLElement>(null);
  const autoStarted = useRef(false);

  const query = buildSearchQuery(product);
  const canSearch = product.name.trim().length >= 2;

  function pickFile(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setError("");
  }

  async function searchImages(event?: React.SyntheticEvent) {
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
          fallbackUrl: result.fallbackUrl,
          pageUrl: result.pageUrl,
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

  async function convertUrl(event: React.FormEvent) {
    event.preventDefault();
    const value = pastedUrl.trim();
    if (!value || converting) return;
    setConverting(true);
    setError("");
    setHosted(null);
    try {
      const response = await fetch("/api/images/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, sourceUrl: value }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error);
      setHosted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحويل الرابط.");
    } finally {
      setConverting(false);
    }
  }

  async function convertFile(event: React.FormEvent) {
    event.preventDefault();
    if (!file || converting) return;
    setConverting(true);
    setError("");
    setHosted(null);
    try {
      const ready = await prepareImageForUpload(file);
      const form = new FormData();
      form.append("file", ready);
      form.append("product", JSON.stringify(product));
      const response = await fetch("/api/images/upload", { method: "POST", body: form });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error);
      setHosted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصورة.");
    } finally {
      setConverting(false);
    }
  }

  const acceptableCount = results?.filter((result) => result.isAcceptable).length ?? 0;
  const busy = loading || converting || approvingUrl !== null;

  return (
    <div className="space-y-5">
      <section className="card">
        {showModes ? (
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="طريقة الحصول على الصورة">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id);
                  setError("");
                }}
                className={[
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-extrabold transition sm:text-sm",
                  mode === id ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <label className="block">
          <span className="field-label">
            اسم المنتج{" "}
            {mode !== "search" ? <span className="text-xs font-medium text-slate-500">(اختياري — يظهر في المكتبة)</span> : null}
          </span>
          <input
            value={product.name}
            onChange={(event) => setProduct({ ...product, name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && mode === "search") void searchImages(event);
            }}
            placeholder="مثال: Samsung Galaxy A56 5G"
            enterKeyHint={mode === "search" ? "search" : "next"}
            autoComplete="off"
            className="field"
          />
        </label>

        <details className="group mt-3 rounded-lg border border-slate-200 open:bg-slate-50/60">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
            {mode === "search" ? "بيانات إضافية لدقة أعلى (اختياري)" : "SKU وبيانات إضافية (اختياري)"}
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

        {mode === "search" ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void searchImages()} disabled={busy || !canSearch} className="btn-primary sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "جاري البحث وفحص الصور..." : "بحث عن الصور"}
            </button>
            <a
              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query || product.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canSearch}
              className={["btn-outline", canSearch ? "" : "pointer-events-none opacity-50"].join(" ")}
            >
              <ExternalLink className="h-4 w-4" />
              افتح في صور جوجل
            </a>
          </div>
        ) : null}

        {mode === "url" ? (
          <form onSubmit={convertUrl} className="mt-4">
            <label className="block">
              <span className="field-label">رابط الصورة أو صفحة المنتج</span>
              <input
                value={pastedUrl}
                onChange={(event) => setPastedUrl(event.target.value)}
                placeholder="https://..."
                type="url"
                inputMode="url"
                enterKeyHint="go"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="field ltr"
              />
            </label>
            <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">
              من صور جوجل: افتح الصورة، اضغط عليها مطولًا (أو بالزر الأيمن) واختر &quot;نسخ عنوان الصورة&quot;. يقبل أيضًا رابط صفحة المنتج.
            </p>
            <button type="submit" disabled={busy || !pastedUrl.trim()} className="btn-primary mt-3 w-full sm:w-auto">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {converting ? "جاري التحويل..." : "تحويل إلى رابط"}
            </button>
          </form>
        ) : null}

        {mode === "upload" ? (
          <form onSubmit={convertFile} className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- معاينة محلية
                <img src={preview} alt="معاينة" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <Upload className="h-8 w-8 text-emerald-700" />
              )}
              <span className="break-all text-sm font-extrabold text-slate-900">{file ? file.name : "اختر صورة من جهازك أو التقط صورة"}</span>
              <span className="text-xs font-bold text-slate-500">JPG, PNG, WEBP, HEIC — الصور الكبيرة تُضغط تلقائيًا</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" disabled={busy || !file} className="btn-primary mt-3 w-full sm:w-auto">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {converting ? "جاري الرفع..." : "رفع وتحويل إلى رابط"}
            </button>
          </form>
        ) : null}
      </section>

      {error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : null}

      {hosted ? (
        <section ref={hostedRef} className="card scroll-mt-20 border-emerald-200">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-slate-950 sm:text-xl">
              {hosted.duplicate ? "الصورة محفوظة مسبقًا — الرابط جاهز" : "الرابط جاهز للاستخدام"}
            </h2>
            <StatusPill value={hosted.compatibility.status} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={hosted.hostedImage.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- الصورة المستضافة */}
              <img src={hosted.hostedImage.publicUrl} alt={product.name || "الصورة"} className="h-full w-full object-contain" />
            </a>
            <div className="min-w-0 flex-1">
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
            </div>
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
              [`النوع ${mimeLabel(hosted.compatibility.contentType)}`, Boolean(hosted.compatibility.contentType?.startsWith("image/"))],
            ].map(([label, pass]) => (
              <div key={String(label)} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-xs font-bold sm:text-sm">
                <span className="min-w-0 truncate">{label}</span>
                <StatusPill value={pass ? "PASS" : "FAILED"} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "search" && results !== null && !loading ? (
        results.length ? (
          <p className="text-sm font-bold text-slate-600">
            {results.length} نتيجة — {acceptableCount} منها صالحة للاعتماد. النتائج مرتبة من الأفضل.
          </p>
        ) : (
          <div className="empty-state">
            لم يتم العثور على صور. جرّب كتابة الاسم بالإنجليزية أو أضف العلامة التجارية والموديل، أو افتح صور جوجل وانسخ رابط
            الصورة إلى تبويب &quot;لصق رابط&quot;.
          </div>
        )
      ) : null}

      {mode === "search" && loading && !results?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : null}

      {mode === "search" && results?.length ? (
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
                    <a href={result.pageUrl || result.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3">
                      <ExternalLink className="h-4 w-4" />
                      المصدر
                    </a>
                    <button
                      type="button"
                      disabled={!result.isAcceptable || busy}
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
