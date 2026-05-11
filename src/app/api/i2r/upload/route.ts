import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive, I2R_UPLOADS_FOLDER_ID } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileId = await uploadFileToDrive(file, I2R_UPLOADS_FOLDER_ID);
    if (!fileId) throw new Error("Failed to upload to Drive");

    return NextResponse.json({ fileId });
  } catch (error: any) {
    console.error("I2R Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
