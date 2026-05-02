import { NextRequest, NextResponse } from "next/server";
import { updateOrderToggleStatus } from "@/lib/o2d-sheets";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, action, value } = await req.json();

    if (!orderNo || !action || (action !== "hold" && action !== "cancelled")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await updateOrderToggleStatus(orderNo, action, value);

    return NextResponse.json({ message: `Order ${action} state updated successfully` });
  } catch (error: any) {
    console.error("Status Toggle API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
