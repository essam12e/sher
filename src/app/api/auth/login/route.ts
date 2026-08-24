import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieName, createAuthToken, verifyPassword } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "login", 10, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const ok = await verifyPassword(body.email, body.password);
    if (!ok) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    const token = await createAuthToken({ email: body.email, role: "admin" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
