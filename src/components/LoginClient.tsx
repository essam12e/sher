"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Link2, Loader2, Lock } from "lucide-react";
import { safeNextPath } from "@/lib/redirect";

export function LoginClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "فشل تسجيل الدخول.");
      window.location.href = safeNextPath(params.get("next"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-slate-50 px-4 py-8">
      <form onSubmit={login} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-700 text-white">
            <Link2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold sm:text-2xl">نطاق | محول الصور لرابط</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">سجّل الدخول لاستخدام البحث والاستضافة.</p>
        </div>
        <label className="mb-4 block">
          <span className="field-label">البريد الإلكتروني</span>
          <input
            type="email"
            required
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field ltr"
          />
        </label>
        <label className="mb-4 block">
          <span className="field-label">كلمة المرور</span>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field ltr pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {error ? (
          <p className="alert-error mb-4" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          دخول
        </button>
      </form>
    </main>
  );
}
