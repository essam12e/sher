import { AppShell } from "@/components/AppShell";
import { UrlCheckerClient } from "@/components/UrlCheckerClient";

export default function UrlCheckerPage() {
  return (
    <AppShell title="فاحص الروابط" subtitle="افحص أي رابط صورة من جهة الخادم بدون Cookie أو Authorization أو Referer للتأكد من جاهزيته للمتاجر.">
      <UrlCheckerClient />
    </AppShell>
  );
}
