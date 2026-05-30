import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const targetFolderId = folderId || "1rvnNJSOsWO0jJS3yzU4fFvZWK1OWb_wB";
    const fileId = await uploadFileToDrive(file, targetFolderId);

    if (!fileId) {
      throw new Error("Failed to upload to Google Drive");
    }

    return NextResponse.json({ fileId, success: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
