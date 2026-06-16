import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, startStep, onlyThisStep } = await req.json();
    
    if (!orderNo || typeof startStep !== 'number') {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const allRecords = await o2dkbService.getAll();
    const matching = allRecords.filter(r => r.order_no === orderNo);

    if (matching.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await Promise.all(matching.map(async (item) => {
      const updated = { ...item };
      const maxStep = 5;
      const endStep = onlyThisStep ? startStep : maxStep;
      
      for (let i = startStep; i <= endStep; i++) {
        if (i > startStep) {
          (updated as any)[`planned_${i}`] = "";
        }
        (updated as any)[`actual_${i}`] = "";
        (updated as any)[`status_${i}`] = "";
        
        if (i === 1) {
          (updated as any).voucher_num_1 = "";
          (updated as any).attach_bill_1 = "";
        } else if (i === 5) {
          (updated as any).attach_billty_5 = "";
        }
      }
      
      return o2dkbService.update(item.id, updated);
    }));
    
    return NextResponse.json({ message: "Follow-up removed successfully" });
  } catch (error: any) {
    console.error("Remove Followup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
