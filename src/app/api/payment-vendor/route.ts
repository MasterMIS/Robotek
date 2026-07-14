import { NextRequest, NextResponse } from "next/server";
import { getPaymentVendorRecords, updatePaymentVendorRecord } from "@/lib/payment-vendor-sheets";

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

    const success = await updatePaymentVendorRecord(grn_no, { status, remarks });
    if (!success) throw new Error("Failed to update payment vendor record");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
