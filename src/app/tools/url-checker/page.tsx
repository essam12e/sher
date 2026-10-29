import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { UrlCheckerClient } from "@/components/UrlCheckerClient";

export const metadata: Metadata = { title: "فاحص الروابط" };

export default function UrlCheckerPage() {
  return (
    <AppShell title="فاحص الروابط" subtitle="تأكد أن أي رابط صورة يعمل في المتاجر: يُفحص من الخادم بدون كوكيز أو Referer.">
      <UrlCheckerClient />
    </AppShell>
  );
}
