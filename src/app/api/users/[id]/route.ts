import { NextRequest, NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/lib/google-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        userData.image_url = fileId || "";
      }
    } else {
      userData = await req.json();
    }

    const success = await updateUser(id, userData);
    if (!success) throw new Error("Failed to update user in Sheets");

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: any) {
    console.error("PUT User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteUser(id);
    if (!success) throw new Error("Failed to delete user from Sheets");

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("DELETE User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
