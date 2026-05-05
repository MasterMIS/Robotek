import { NextRequest, NextResponse } from "next/server";
import { o2dService } from "@/lib/o2d-sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, startStep, onlyThisStep } = await req.json();
    
    if (!orderNo || typeof startStep !== 'number') {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const allRecords = await o2dService.getAll();
    const matching = allRecords.filter(r => r.order_no === orderNo);

    if (matching.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await Promise.all(matching.map(async (item) => {
      const updated = { ...item };
      const maxStep = 11;
      const endStep = onlyThisStep ? startStep : maxStep;
      
      for (let i = startStep; i <= endStep; i++) {
        if (i > startStep) {
          (updated as any)[`planned_${i}`] = "";
        }
        (updated as any)[`actual_${i}`] = "";
        (updated as any)[`status_${i}`] = "";
        
        // Clear step-specific fields
        if (i === 1) {
            updated.final_amount_1 = "";
            updated.so_number_1 = "";
            updated.merge_order_with_1 = "";
            updated.upload_so_1 = "";
        }
        if (i === 5) {
            updated.num_of_parcel_5 = "";
            updated.upload_pi_5 = "";
            updated.actual_date_of_order_packed_5 = "";
        }
        if (i === 7) updated.voucher_num_7 = "";
        if (i === 8) {
            updated.order_details_checked_8 = "";
            updated.voucher_num_51_8 = "";
            updated.t_amt_8 = "";
        }
        if (i === 9) {
            updated.attach_bilty_9 = "";
            updated.num_of_parcel_9 = "";
        }
      }
      
      return o2dService.update(item.id, updated);
    }));
    
    return NextResponse.json({ message: "Follow-up removed successfully" });
  } catch (error: any) {
    console.error("Remove Followup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
