import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

const REPLACE_UPLOADS_FOLDER_ID = "1V0_HvE-I0gQxn9MF5oT6LjrOIKFwPkGU";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileId = await uploadFileToDrive(file, REPLACE_UPLOADS_FOLDER_ID);
    if (!fileId) throw new Error("Failed to upload to Drive");

    return NextResponse.json({ fileId });
  } catch (error: any) {
    console.error("Replace Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
