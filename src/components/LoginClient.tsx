"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function LoginClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = params.get("next") || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <form onSubmit={login} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold">نطاق | محول الصور لرابط</h1>
          <p className="mt-2 text-sm text-slate-600">سجّل الدخول لحماية البحث والتخزين من الاستخدام العام.</p>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold">البريد الإلكتروني</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="ltr w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold">كلمة المرور</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="ltr w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600" />
        </label>
        {error ? <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-3 font-extrabold text-white hover:bg-emerald-800">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          دخول
        </button>
      </form>
    </main>
  );
}
