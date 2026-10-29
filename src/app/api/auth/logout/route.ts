import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";

export async function POST(request: Request) {
  // 303 يحوّل الطلب إلى GET، بينما 307 الافتراضي كان يعيد إرسال POST إلى صفحة الدخول.
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(cookieName);
  return response;
}
