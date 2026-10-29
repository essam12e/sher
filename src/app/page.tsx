import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProductSearchClient } from "@/components/ProductSearchClient";

export const metadata: Metadata = { title: "بحث الصور" };

export default function Home() {
  return (
    <AppShell
      title="بحث الصور"
      subtitle="اكتب اسم المنتج، اختر أفضل صورة من النتائج، واعتمدها ليتم حفظ نسخة مستقلة وتوليد رابط HTTPS ثابت جاهز للصقه في متجرك."
    >
      <ProductSearchClient />
    </AppShell>
  );
}
