import { NextRequest, NextResponse } from "next/server";
import { updateOrder, deleteOrderByNo } from "@/lib/o2d-sheets";
import { O2D } from "@/types/o2d";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const body = await req.json();
    const success = await updateOrder(orderNo, body as O2D[]);
    if (success) {
      return NextResponse.json({ message: "Order updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const success = await deleteOrderByNo(orderNo);
    if (success) {
      return NextResponse.json({ message: "Order deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
