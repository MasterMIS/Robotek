import { NextRequest, NextResponse } from "next/server";
import { updateO2D, deleteO2D } from "@/lib/o2d-sheets";
import { O2D } from "@/types/o2d";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const success = await updateO2D(id, body as O2D);
    if (success) {
      return NextResponse.json({ message: "O2D record updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update O2D" }, { status: 500 });
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
  try {
    const { id } = await params;
    const success = await deleteO2D(id);
    if (success) {
      return NextResponse.json({ message: "O2D record deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete O2D" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
