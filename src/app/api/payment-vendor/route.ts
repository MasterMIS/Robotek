import { NextRequest, NextResponse } from "next/server";
import { getPaymentVendorRecords, updatePaymentVendorRecord } from "@/lib/payment-vendor-sheets";
import { getGRNItems } from "@/lib/grn-sheets";
import { getI2RItems } from "@/lib/i2r-sheets";
import { notifyUserPaymentApproved } from "@/lib/payment-vendor-notifications";
import { getPlannedPaymentDate } from "@/lib/payment-vendor-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getPaymentVendorRecords();
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { grn_no, status, remarks } = data;
    
    if (!grn_no) {
      throw new Error("GRN No is required");
    }

    const existing = await getPaymentVendorRecords();
    const current = existing.find((r) => r.grn_no === grn_no);
    const currentStatus = current?.status || "";

    if (status === "Payed" && currentStatus !== "Approved") {
      return NextResponse.json(
        { error: "GRN must be approved by MD before marking as Payed" },
        { status: 400 }
      );
    }

    if (status === "Approved" && (currentStatus === "Approved" || currentStatus === "Rejected" || currentStatus === "Payed")) {
      return NextResponse.json({ error: "GRN has already been processed" }, { status: 400 });
    }

    const success = await updatePaymentVendorRecord(grn_no, { status, remarks });
    if (!success) throw new Error("Failed to update payment vendor record");

    if (status === "Approved") {
      const grnItems = await getGRNItems();
      const grn = grnItems.find((g) => g.GRN_No === grn_no);
      let i2rActual6: string | undefined;
      if (grn?.indent_id) {
        const i2rItems = await getI2RItems();
        i2rActual6 = i2rItems.find((it) => it.id === grn.indent_id)?.actual_6;
      }
      void notifyUserPaymentApproved({
        grnNo: grn_no,
        itemName: grn?.Item_Name,
        qty: grn?.Qty,
        paymentTermsDays: grn?.Payment_Terms_In_days,
        plannedPaymentDate: getPlannedPaymentDate(grn?.Payment_Terms_In_days, i2rActual6),
      }).catch((err) => console.error("[payment-vendor] User WhatsApp notification failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
