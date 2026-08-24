import { AppShell } from "@/components/AppShell";
import { BulkSearchClient } from "@/components/BulkSearchClient";

export default function BulkSearchPage() {
  return (
    <AppShell title="البحث الجماعي" subtitle="أضف قائمة منتجات وابحث لكل منتج بشكل مستقل. لا يتم اعتماد الصور تلقائيًا عند انخفاض الثقة.">
      <BulkSearchClient />
    </AppShell>
  );
}
