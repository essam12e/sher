import { FileSpreadsheet, Layers, Library, Search, Settings, ShieldCheck, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; hint: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { href: "/", label: "صورة إلى رابط", hint: "بحث، لصق، أو رفع", icon: Search },
  { href: "/bulk-search", label: "البحث الجماعي", hint: "قائمة منتجات", icon: Layers },
  { href: "/library", label: "مكتبة الصور", hint: "الروابط الجاهزة", icon: Library },
  { href: "/import-excel", label: "تعبئة Excel", hint: "روابط لملف المتجر", icon: FileSpreadsheet },
  { href: "/tools/url-checker", label: "فاحص الروابط", hint: "هل الرابط يعمل؟", icon: ShieldCheck },
  { href: "/settings", label: "الإعدادات", hint: "حدود الصور", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
