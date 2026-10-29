import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { LibraryClient } from "@/components/LibraryClient";

export const metadata: Metadata = { title: "مكتبة الصور" };

export default function LibraryPage() {
  return (
    <AppShell title="مكتبة الصور" subtitle="كل الصور المعتمدة وروابطها الجاهزة: انسخ الرابط، أعد فحصه، أو احذفه.">
      <LibraryClient />
    </AppShell>
  );
}
