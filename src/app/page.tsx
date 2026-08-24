import { AppShell } from "@/components/AppShell";
import { ProductSearchClient } from "@/components/ProductSearchClient";

export default function Home() {
  return (
    <AppShell
      title="بحث الصور"
      subtitle="اكتب بيانات المنتج، افحص النتائج الأصلية، ثم اعتمد الصورة ليتم حفظ نسخة مستقلة وتوليد رابط HTTPS مباشر."
    >
      <ProductSearchClient />
    </AppShell>
  );
}
