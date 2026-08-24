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

  async function check() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/tools/url-checker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فحص الرابط.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">رابط الصورة</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="ltr w-full rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" />
        </label>
        <button onClick={check} disabled={loading || !url} className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 font-extrabold text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          فحص الرابط
        </button>
      </section>
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div> : null}
      {report ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">نتيجة الفحص</h2>
            <StatusPill value={report.status} />
          </div>
          {report.reason ? <p className="mb-4 rounded-md bg-rose-50 p-3 font-bold text-rose-700">{report.reason}</p> : <p className="mb-4 font-bold text-emerald-700">اجتاز جميع اختبارات التوافق الفنية.</p>}
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["HTTP Status", report.httpStatus],
              ["Final URL", report.finalUrl],
              ["HTTPS", report.https ? "PASS" : "FAILED"],
              ["Content-Type", report.contentType ?? "-"],
              ["Content-Length", report.contentLength ?? "-"],
              ["Width × Height", report.dimensions ?? "-"],
              ["Redirect Count", report.redirectCount],
              ["Public Access", report.publicAccess ? "PASS" : "FAILED"],
              ["Direct Image", report.directImage ? "PASS" : "FAILED"],
              ["Server Fetch", report.serverFetch ? "PASS" : "FAILED"],
              ["Permanent URL", report.permanentUrl ? "PASS" : "FAILED"],
              ["E-commerce Compatibility", report.status],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-bold text-slate-500">{label}</div>
                <div className="ltr mt-1 break-all text-sm font-extrabold text-slate-900">{String(value)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
