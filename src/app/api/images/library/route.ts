import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { listRecords, storageConfigured } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!storageConfigured()) return NextResponse.json({ images: [], storageConfigured: false });
    const images = await listRecords();
    return NextResponse.json({ images, storageConfigured: true });
  } catch (error) {
    return apiError(error);
  }
}
