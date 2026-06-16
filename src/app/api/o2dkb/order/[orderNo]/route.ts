import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const contentType = req.headers.get("content-type") || "";

    let updatedItem: any = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      updatedItem = JSON.parse(formData.get("o2dkbData") as string);
    } else {
      updatedItem = await req.json();
    }

    if (!updatedItem) {
      return NextResponse.json({ error: "Cannot update order with empty data." }, { status: 400 });
    }

    const itemData = {
      ...updatedItem,
      updated_at: new Date().toISOString()
    };

    if (itemData.id) {
      await o2dkbService.update(itemData.id, itemData);
    } else {
      await o2dkbService.add({
        ...itemData,
        id: `O2DKB-${Date.now()}-${Math.random()}`
      });
    }

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: any) {
    console.error("PUT Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const allRecords = await o2dkbService.getAll();
    const matching = allRecords.filter(r => r.order_no === orderNo);

    await Promise.all(matching.map(item => o2dkbService.delete(item.id)));

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
