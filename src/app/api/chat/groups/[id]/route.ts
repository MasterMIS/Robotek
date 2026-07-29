import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateGroup, deleteGroup, getGroupsForUser } from "@/lib/chat-sheets";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return (session.user as any).username as string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUsername = await getSessionUser();
    if (!currentUsername) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userGroups = await getGroupsForUser(currentUsername);
    const existingGroup = userGroups.find((g) => g.id === id);

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(existingGroup);
  } catch (error) {
    console.error("GET Group Error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUsername = await getSessionUser();
    if (!currentUsername) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const userGroups = await getGroupsForUser(currentUsername);
    const existingGroup = userGroups.find((g) => g.id === id);

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isAdmin = (existingGroup.admins || "")
      .split(",")
      .map((a) => a.trim())
      .includes(currentUsername);

    if (!isAdmin && (body.participants || body.admins || body.name)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const updatedGroup = {
      ...existingGroup,
      ...body,
      id: existingGroup.id,
    };

    const success = await updateGroup(id, updatedGroup);
    if (success) {
      return NextResponse.json(updatedGroup);
    }
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  } catch (error) {
    console.error("PATCH Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUsername = await getSessionUser();
    if (!currentUsername) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userGroups = await getGroupsForUser(currentUsername);
    const existingGroup = userGroups.find((g) => g.id === id);

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isAdmin = (existingGroup.admins || "")
      .split(",")
      .map((a) => a.trim())
      .includes(currentUsername);

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const success = await deleteGroup(id);
    if (success) {
      return NextResponse.json({ message: "Group deleted successfully" });
    }
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  } catch (error) {
    console.error("DELETE Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
