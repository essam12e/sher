"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import type { CompatibilityCheck } from "@/lib/types";

export function UrlCheckerClient() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<CompatibilityCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check(event: React.FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/tools/url-checker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "فشل فحص الرابط.");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فحص الرابط.");
    } finally {
      setLoading(false);
    }
  }

  const pass = (value: boolean) => (value ? "PASS" : "FAILED");

  return (
    <div className="space-y-5">
      <form onSubmit={check} className="card">
        <label className="block">
          <span className="field-label">رابط الصورة</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
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
        <button type="submit" disabled={loading || !url.trim()} className="btn-primary mt-4 w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? "جاري الفحص..." : "فحص الرابط"}
        </button>
      </form>

      {error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : null}

      {report ? (
        <section className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold sm:text-xl">نتيجة الفحص</h2>
            <StatusPill value={report.status} />
          </div>
          {report.reason ? (
            <p className="alert-error mb-4">{report.reason}</p>
          ) : (
            <p className="alert-success mb-4">اجتاز جميع اختبارات التوافق الفنية، ويمكن استخدامه في المتجر.</p>
          )}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {[
              ["حالة HTTP", report.httpStatus || "-"],
              ["HTTPS", pass(report.https)],
              ["نوع المحتوى", report.contentType ?? "-"],
              ["الحجم", report.contentLength ? `${Math.round(report.contentLength / 1024)} KB` : "-"],
              ["الأبعاد", report.dimensions ?? "-"],
              ["عدد التحويلات", report.redirectCount],
              ["وصول عام", pass(report.publicAccess)],
              ["صورة مباشرة", pass(report.directImage)],
              ["جلب من الخادم", pass(report.serverFetch)],
              ["رابط دائم", pass(report.permanentUrl)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-bold text-slate-500">{label}</div>
                <div className="ltr mt-1 break-all text-sm font-extrabold text-slate-900">{String(value)}</div>
              </div>
            ))}
            <div className="col-span-2 rounded-lg border border-slate-200 p-3 md:col-span-3">
              <div className="text-xs font-bold text-slate-500">الرابط النهائي</div>
              <div className="ltr mt-1 break-all text-sm font-extrabold text-slate-900">{report.finalUrl}</div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
