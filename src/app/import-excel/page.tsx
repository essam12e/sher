import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ExcelImportClient } from "@/components/ExcelImportClient";

export const metadata: Metadata = { title: "تعبئة روابط الصور في Excel" };

export default function ImportExcelPage() {
  return (
    <AppShell title="تعبئة روابط الصور في Excel" subtitle="أضف روابط الصور المعتمدة إلى ملف منتجات متجرك دفعة واحدة.">
      <ExcelImportClient />
    </AppShell>
  );
}
