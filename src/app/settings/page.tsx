import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/components/SettingsClient";

export default function SettingsPage() {
  return (
    <AppShell title="الإعدادات" subtitle="اضبط الحد الأدنى للأبعاد وحجم الملف الأقصى.">
      <SettingsClient />
    </AppShell>
  );
}
