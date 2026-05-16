import { NextRequest, NextResponse } from "next/server";
import { getReplaceItems, addReplaceItem, updateReplaceItem, deleteReplaceItem, getNextRNNum } from "@/lib/replace-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "next-rn") {
      const rnNum = await getNextRNNum();
      return NextResponse.json({ rnNum });
    }

    const items = await getReplaceItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching Replace items:", error);
    return NextResponse.json(
      { error: "Failed to fetch Replace items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addReplaceItem(data);
    if (!success) {
      return NextResponse.json({ error: "Failed to add Replace item" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding Replace item:", error);
    return NextResponse.json(
      { error: "Failed to add Replace item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    await updateReplaceItem(data.id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Replace item:", error);
    return NextResponse.json(
      { error: "Failed to update Replace item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await deleteReplaceItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Replace item:", error);
    return NextResponse.json(
      { error: "Failed to delete Replace item" },
      { status: 500 }
    );
  }
}
