import { AppShell } from "@/components/AppShell";

export default function ProductsPage() {
  return (
    <AppShell title="المنتجات" subtitle="تُنشأ سجلات المنتجات تلقائيًا عند البحث أو اعتماد الصور.">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-600">
        استخدم صفحة البحث أو استيراد Excel لإضافة المنتجات وربط الصور المستضافة بها.
      </div>
    </AppShell>
  );
}
