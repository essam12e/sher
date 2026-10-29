import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const cookieName = "nitaq_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type AuthSession = {
  email: string;
  role: "admin";
};

export async function verifyPassword(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !hash) {
    throw new Error("لم يتم إعداد حساب المدير. أضف ADMIN_EMAIL و ADMIN_PASSWORD_HASH.");
  }

  const emailMatches = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  // نقارن كلمة المرور دائمًا حتى لا يختلف زمن الاستجابة حسب صحة البريد.
  const passwordMatches = await bcrypt.compare(password, hash);
  return emailMatches && passwordMatches;
}

export async function createAuthToken(session: AuthSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.email && payload.role === "admin") {
      return { email: String(payload.email), role: "admin" };
    }
    return null;
  } catch {
    return null;
  }
}

export { cookieName };
