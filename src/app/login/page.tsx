import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/LoginClient";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
