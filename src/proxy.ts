import { NextResponse, type NextRequest } from "next/server";
import { cookieName, verifyAuthToken } from "@/lib/auth";

// ملاحظة: في Next.js 16 تم استبدال middleware بـ proxy، ويجب أن يكون الملف
// داخل src/ لأن مجلد app موجود داخل src/. الملف القديم في جذر المشروع كان
// يُتجاهل بالكامل، فكانت كل الصفحات والـ API مكشوفة بدون تسجيل دخول.

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/favicon.ico", "/manifest.webmanifest", "/icon.svg"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(cookieName)?.value;
  const session = token ? await verifyAuthToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
