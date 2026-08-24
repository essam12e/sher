import Link from "next/link";
import {
  Boxes,
  FileSpreadsheet,
  Gauge,
  Home,
  Images,
  Library,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/", label: "بحث الصور", icon: Search },
  { href: "/bulk-search", label: "البحث الجماعي", icon: Boxes },
  { href: "/products", label: "المنتجات", icon: Images },
  { href: "/library", label: "مكتبة الصور", icon: Library },
  { href: "/import-excel", label: "استيراد Excel", icon: FileSpreadsheet },
  { href: "/tools/url-checker", label: "فاحص الروابط", icon: ShieldCheck },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-72 border-l border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-xl font-extrabold text-slate-950">نطاق | محول الصور لرابط</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">استضافة صور المنتجات كرابط HTTPS مباشر جاهز للمتاجر.</div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/api/auth/logout" method="post" className="absolute bottom-5 left-4 right-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Gauge className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </form>
      </aside>

      <main className="lg:pr-72">
        <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
          <h1 className="text-2xl font-extrabold text-slate-950">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </header>
        <div className="px-5 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
