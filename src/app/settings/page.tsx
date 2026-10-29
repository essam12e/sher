import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = { title: "الإعدادات" };

export default function SettingsPage() {
  return (
    <AppShell title="الإعدادات" subtitle="حدود الأبعاد والحجم التي يجب أن تحققها الصورة قبل اعتمادها.">
      <SettingsClient />
    </AppShell>
  );
}
