import { AppShell } from "@/components/AppShell";
import { ExcelImportClient } from "@/components/ExcelImportClient";

export default function ImportExcelPage() {
  return (
    <AppShell title="استيراد Excel" subtitle="ارفع ملف xlsx، اختر الأعمدة يدويًا، ثم صدّر نسخة جديدة دون تعديل الملف الأصلي.">
      <ExcelImportClient />
    </AppShell>
  );
}
