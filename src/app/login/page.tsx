import { redirect } from "next/navigation";

// الموقع لم يعد يحتاج تسجيل دخول؛ أي رابط قديم لصفحة الدخول يحوّل للرئيسية.
export default function LoginPage() {
  redirect("/");
}
