import { AppShell } from "@/components/AppShell";
import { LibraryClient } from "@/components/LibraryClient";

export default function LibraryPage() {
  return (
    <AppShell title="مكتبة الصور" subtitle="كل الصور التي تم اعتمادها واستضافتها، مع نسخ الرابط وإعادة الفحص والحذف.">
      <LibraryClient />
    </AppShell>
  );
}
