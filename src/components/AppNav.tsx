"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { isActive, navItems } from "@/lib/nav";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="نطاق — الرئيسية">
      {/* eslint-disable-next-line @next/next/no-img-element -- شعار ثابت صغير */}
      <img src="/logo-mark.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
      <span className="min-w-0">
        <span className="block truncate text-lg font-extrabold leading-6 text-brand-600">نطاق</span>
        {compact ? null : <span className="block truncate text-xs font-bold text-accent-600">من صورة إلى رابط</span>}
      </span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="القائمة الرئيسية">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition",
              active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
          >
            <Icon className={["h-5 w-5 shrink-0", active ? "text-brand-600" : "text-slate-400"].join(" ")} />
            <span className="min-w-0">
              <span className="block">{item.label}</span>
              <span className="block text-xs font-medium text-slate-500">{item.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

const tabItems = navItems.slice(0, 4);

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // إغلاق القائمة عند تغيير الصفحة أو الضغط على Escape، ومنع تمرير الخلفية أثناء فتحها.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* الشريط الجانبي للشاشات الكبيرة */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 flex-col border-l border-slate-200 bg-white px-4 py-5 lg:flex">
        <div className="mb-6 px-1">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* الشريط العلوي للجوال والتابلت */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <Brand compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="icon-btn"
            aria-label="فتح القائمة"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* القائمة المنزلقة */}
      <div
        className={[
          "fixed inset-0 z-50 overflow-hidden transition-[visibility] duration-200 lg:hidden",
          open ? "visible" : "pointer-events-none invisible",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div
          className={["absolute inset-0 bg-slate-950/40 transition-opacity", open ? "opacity-100" : "opacity-0"].join(" ")}
          onClick={() => setOpen(false)}
        />
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة"
          className={[
            "absolute inset-y-0 right-0 flex w-[85%] max-w-xs flex-col bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <Brand />
            <button type="button" onClick={() => setOpen(false)} className="icon-btn" aria-label="إغلاق القائمة">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
          </div>
      </div>

      {/* شريط التنقل السفلي للجوال */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="تنقل سريع"
      >
        <div className="grid grid-cols-4">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold",
                  active ? "text-brand-600" : "text-slate-500",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
