import { NextRequest, NextResponse } from "next/server";
import { getI2RPackingItems, addI2RPackingItem, updateI2RPackingItem, deleteI2RPackingItem, getNextPPFNum } from "@/lib/i2r-packing-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "next-ppf") {
      const ppfNum = await getNextPPFNum();
      return NextResponse.json({ ppfNum });
    }

    const items = await getI2RPackingItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching I2R Packing items:", error);
    return NextResponse.json(
      { error: "Failed to fetch I2R Packing items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addI2RPackingItem(data);
    if (!success) {
      return NextResponse.json({ error: "Failed to add I2R Packing item" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding I2R Packing item:", error);
    return NextResponse.json(
      { error: "Failed to add I2R Packing item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    await updateI2RPackingItem(data.id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating I2R Packing item:", error);
    return NextResponse.json(
      { error: "Failed to update I2R Packing item" },
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

    await deleteI2RPackingItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting I2R Packing item:", error);
    return NextResponse.json(
      { error: "Failed to delete I2R Packing item" },
      { status: 500 }
    );
  }
}
