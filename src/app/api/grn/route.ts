import { NextRequest, NextResponse } from "next/server";
import { addGRNEntry, getNextGlobalPONumber, getGRNItems, updateGRNItem, deleteGRNItem, getGRNStepConfig } from "@/lib/grn-sheets";
import { getI2RItems, updateI2RItem } from "@/lib/i2r-sheets";
import { notifyMdNewGrnEntry, notifyMdGrnUpdated } from "@/lib/payment-vendor-notifications";
import { getPlannedPaymentDate } from "@/lib/payment-vendor-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getGRNItems();
    const nextPO = await getNextGlobalPONumber();
    const stepConfig = await getGRNStepConfig();
    return NextResponse.json({ items, nextPO, stepConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const finalPONumber = await addGRNEntry(data);
    
    if (!finalPONumber) throw new Error("Failed to add GRN entry");

    let i2rActual6: string | undefined;
    if (data.indent_id) {
      const i2rItems = await getI2RItems();
      const i2rItem = i2rItems.find(it => it.id === data.indent_id);
      i2rActual6 = i2rItem?.actual_6;
      if (i2rItem) {
        await updateI2RItem(i2rItem.id, {
          ...i2rItem,
          po_number_6: data.PO_Number || finalPONumber,
          updated_at: new Date().toISOString(),
        });
      }
    }

    void notifyMdNewGrnEntry({
      grnNo: data.GRN_No || "",
      poNumber: data.PO_Number || finalPONumber,
      itemName: data.Item_Name,
      qty: data.Qty,
      paymentTermsDays: data.Payment_Terms_In_days,
      plannedPaymentDate: getPlannedPaymentDate(data.Payment_Terms_In_days, i2rActual6),
    }).catch((err) => console.error("[GRN] MD WhatsApp notification failed:", err));

    return NextResponse.json({ success: true, po_number: finalPONumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, notifyMdPaymentReview, ...updates } = data;
    if (!id) throw new Error("ID required");

    const items = await getGRNItems();
    const existing = items.find((it) => String(it.id) === String(id));

    const success = await updateGRNItem(id, updates);

    if (success && notifyMdPaymentReview && existing) {
      const merged = { ...existing, ...updates };
      let i2rActual6: string | undefined;
      if (merged.indent_id) {
        const i2rItems = await getI2RItems();
        i2rActual6 = i2rItems.find((it) => it.id === merged.indent_id)?.actual_6;
      }
      void notifyMdGrnUpdated({
        grnNo: merged.GRN_No || "",
        poNumber: merged.PO_Number,
        itemName: merged.Item_Name,
        qty: merged.Qty,
        paymentTermsDays: merged.Payment_Terms_In_days,
        plannedPaymentDate: getPlannedPaymentDate(merged.Payment_Terms_In_days, i2rActual6),
      }).catch((err) => console.error("[GRN] MD update WhatsApp notification failed:", err));
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID required");
    
    const success = await deleteGRNItem(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
