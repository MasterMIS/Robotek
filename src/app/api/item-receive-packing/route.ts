import { NextRequest, NextResponse } from "next/server";
import { getItemReceivePackingItems, addItemReceivePackingItem, updateItemReceivePackingItem, deleteItemReceivePackingItem, getNextPPRNum } from "@/lib/item-receive-packing-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "next-ppr") {
      const pprNum = await getNextPPRNum();
      return NextResponse.json({ pprNum });
    }

    const items = await getItemReceivePackingItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching Item Receive (PACKING) items:", error);
    return NextResponse.json(
      { error: "Failed to fetch Item Receive (PACKING) items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addItemReceivePackingItem(data);
    if (!success) {
      return NextResponse.json({ error: "Failed to add Item Receive (PACKING) item" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding Item Receive (PACKING) item:", error);
    return NextResponse.json(
      { error: "Failed to add Item Receive (PACKING) item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    await updateItemReceivePackingItem(data.id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Item Receive (PACKING) item:", error);
    return NextResponse.json(
      { error: "Failed to update Item Receive (PACKING) item" },
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

    await deleteItemReceivePackingItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Item Receive (PACKING) item:", error);
    return NextResponse.json(
      { error: "Failed to delete Item Receive (PACKING) item" },
      { status: 500 }
    );
  }
}
