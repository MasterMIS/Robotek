import { NextRequest, NextResponse } from "next/server";
import { getFloorIMSItems, addFloorIMSItem, updateFloorIMSItem, deleteFloorIMSItem } from "@/lib/ims-floor-sheets";
import { FloorIMS } from "@/types/ims-floor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    if (!location || !["1st", "g"].includes(location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }

    const items = await getFloorIMSItems(location);

    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    console.error("Error fetching Floor IMS items:", error);
    return NextResponse.json({ error: "Failed to fetch Floor IMS items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    
    if (!location || !["1st", "g"].includes(location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }

    const data = await request.json();
    const success = await addFloorIMSItem(location, data);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to add Floor IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding Floor IMS item:", error);
    return NextResponse.json({ error: "Failed to add Floor IMS item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    
    if (!location || !["1st", "g"].includes(location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }

    const data: FloorIMS = await request.json();
    const success = await updateFloorIMSItem(location, data.id, data);

    if (!success) {
      return NextResponse.json({ error: "Failed to update Floor IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating Floor IMS item:", error);
    return NextResponse.json({ error: "Failed to update Floor IMS item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const id = searchParams.get("id");
    
    if (!location || !["1st", "g"].includes(location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const success = await deleteFloorIMSItem(location, id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete Floor IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting Floor IMS item:", error);
    return NextResponse.json({ error: "Failed to delete Floor IMS item" }, { status: 500 });
  }
}
