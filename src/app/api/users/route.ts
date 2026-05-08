import { NextRequest, NextResponse } from "next/server";
import { getUsers, addUser } from "@/lib/google-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allUsers = await getUsers();
    return NextResponse.json(allUsers);
  } catch (error: any) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
        userData.image_url = fileId || "";
      }
    } else {
      userData = await req.json();
    }

    const success = await addUser(userData);
    if (!success) throw new Error("Failed to add user to Sheets");

    // Sync permissions if provided
    if (userData.permissions) {
      const { navigation } = await import("@/lib/navigation");
      const { updateUserPermissions } = await import("@/lib/google-sheets");
      const allPageIds = navigation.map(n => n.id);
      await updateUserPermissions(userData.id, userData.username, userData.permissions, allPageIds);
    }

    return NextResponse.json({ message: "User added successfully" });
  } catch (error: any) {
    console.error("POST User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
