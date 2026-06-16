import { NextResponse } from "next/server";
import { uploadFileToDrive, RECHARGE_UPLOADS_FOLDER_ID } from "@/lib/google-drive";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileId = await uploadFileToDrive(file, RECHARGE_UPLOADS_FOLDER_ID);
    if (!fileId) throw new Error("Failed to upload to Drive");

    return NextResponse.json({ fileId, success: true });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
