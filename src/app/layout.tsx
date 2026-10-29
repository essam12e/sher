import type { Metadata, Viewport } from "next";
// الخط مستضاف ضمن المشروع بدل جلبه من Google أثناء البناء، فيعمل البناء بدون اتصال
// ويُحمّل الخط من نفس النطاق بسرعة على الجوال.
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-700.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/tajawal/latin-400.css";
import "@fontsource/tajawal/latin-500.css";
import "@fontsource/tajawal/latin-700.css";
import "@fontsource/tajawal/latin-800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "نطاق | محول الصور لرابط",
    template: "%s | نطاق",
  },
  description: "ابحث عن صورة المنتج، افحصها، واستضفها كرابط HTTPS مباشر وثابت جاهز لسلة وزد وShopify وWooCommerce.",
  applicationName: "نطاق",
  appleWebApp: { capable: true, title: "نطاق", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}
