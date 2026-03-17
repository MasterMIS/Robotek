import { NextRequest, NextResponse } from "next/server";
import { getUsers, addUser } from "@/lib/google-sheets";
import { uploadFileToDrive, getDriveImageUrl } from "@/lib/google-drive";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let userData: any;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      userData = JSON.parse(formData.get("userData") as string);
      const file = formData.get("image") as File;

      if (file && file.size > 0) {
        const fileId = await uploadFileToDrive(file);
        if (fileId) {
          userData.image_url = getDriveImageUrl(fileId);
        }
      }
    } else {
      userData = await req.json();
    }

    const success = await addUser(userData);
    if (success) {
      return NextResponse.json({ message: "User added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
