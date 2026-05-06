import { NextRequest, NextResponse } from "next/server";
import { updateOrderToggleStatus, o2dService } from "@/lib/o2d-sheets";
import { sendO2DRemarkNotification } from "@/lib/o2d-notifications";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, action, value } = await req.json();

    if (!orderNo || !action || (action !== "hold" && action !== "cancelled")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await updateOrderToggleStatus(orderNo, action, value);

    // Fetch the updated order to send notification
    const all = await o2dService.getAll();
    const updatedOrder = all.filter(r => r.order_no === orderNo);
    
    if (updatedOrder.length > 0) {
      const statusWord = value ? (action === "hold" ? "Put On Hold" : "Cancelled") : (action === "hold" ? "Released from Hold" : "Restored from Cancelled");
      await sendO2DRemarkNotification(updatedOrder, statusWord);
    }

    return NextResponse.json({ message: `Order ${action} state updated successfully` });
  } catch (error: any) {
    console.error("Status Toggle API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
