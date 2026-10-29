import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { BulkSearchClient } from "@/components/BulkSearchClient";

export const metadata: Metadata = { title: "البحث الجماعي" };

export default function BulkSearchPage() {
  return (
    <AppShell title="البحث الجماعي" subtitle="الصق قائمة منتجات وابحث عن صورة لكل منتج على حدة. لا يتم اعتماد أي صورة تلقائيًا.">
      <BulkSearchClient />
    </AppShell>
  );
}
