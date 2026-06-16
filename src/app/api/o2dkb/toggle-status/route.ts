import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";


export async function POST(req: NextRequest) {
  try {
    const { orderNo, action, value } = await req.json();

    if (!orderNo || (action !== "cancelled" && action !== "hold")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const success = await o2dkbService.updateOrderToggleStatus(orderNo, action as 'cancelled' | 'hold', value);
    if (!success) {
      return NextResponse.json({ error: "Failed to update status. Please check if the 'Cancelled' column exists in the Google Sheet." }, { status: 400 });
    }

    // Notifications are not supported for O2DKB yet

    return NextResponse.json({ message: `Order ${action} state updated successfully` });
  } catch (error: any) {
    console.error("Status Toggle API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
