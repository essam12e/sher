import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProductSearchClient } from "@/components/ProductSearchClient";

export const metadata: Metadata = { title: "تحويل الصور إلى روابط" };

export default function Home() {
  return (
    <AppShell
      title="تحويل صورة المنتج إلى رابط"
      subtitle="ابحث عن صورة المنتج، أو الصق رابط صورة، أو ارفعها من جهازك — ونحوّلها إلى رابط HTTPS مباشر وثابت جاهز للصقه في سلة وزد وShopify."
    >
      <ProductSearchClient />
    </AppShell>
  );
}
