import { NextRequest, NextResponse } from "next/server";
import { o2dService } from "@/lib/o2d-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const contentType = req.headers.get("content-type") || "";
    
    let updatedItems: any[] = [];
    let screenshotUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      updatedItems = JSON.parse(formData.get("o2dData") as string) as any[];
      const screenshotFile = formData.get("order_screenshot") as File;

      if (screenshotFile && screenshotFile.size > 0) {
        const fileId = await uploadFileToDrive(screenshotFile);
        screenshotUrl = fileId || "";
      } else {
        screenshotUrl = updatedItems[0]?.order_screenshot || "";
      }
    } else {
      updatedItems = await req.json();
      screenshotUrl = updatedItems[0]?.order_screenshot || "";
    }

    const allRecords = await o2dService.getAll();
    const existingForOrder = allRecords.filter(r => r.order_no === orderNo);
    const existingIds = new Set(existingForOrder.map(r => r.id));
    const incomingIds = new Set(updatedItems.map(r => r.id).filter(id => !!id));

    await Promise.all(updatedItems.map(async (item) => {
      const itemData = {
        ...item,
        order_screenshot: screenshotUrl,
        updated_at: new Date().toISOString()
      };

      if (item.id && existingIds.has(item.id)) {
        return o2dService.update(item.id, itemData);
      } else {
        return o2dService.add({
          ...itemData,
          id: item.id || `O2D-${Date.now()}-${Math.random()}`
        });
      }
    }));

    const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
    await Promise.all(idsToDelete.map(id => o2dService.delete(id)));

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
    const allRecords = await o2dService.getAll();
    const matching = allRecords.filter(r => r.order_no === orderNo);

    await Promise.all(matching.map(item => o2dService.delete(item.id)));

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
