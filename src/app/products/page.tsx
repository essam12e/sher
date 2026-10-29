import { redirect } from "next/navigation";

// صفحة المنتجات كانت فارغة؛ المنتجات وصورها تظهر الآن في مكتبة الصور.
export default function ProductsPage() {
  redirect("/library");
}
