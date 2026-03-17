import { NextRequest, NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/lib/google-sheets";
import { uploadFileToDrive, getDriveImageUrl } from "@/lib/google-drive";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const success = await updateUser(id, userData);
    if (success) {
      return NextResponse.json({ message: "User updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = await deleteUser(id);
  if (success) {
    return NextResponse.json({ message: "User deleted successfully" });
  } else {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
