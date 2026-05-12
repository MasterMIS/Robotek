import { NextRequest, NextResponse } from "next/server";
import { addGRNEntry, getNextGlobalPONumber, getGRNItems, updateGRNItem, deleteGRNItem, getGRNStepConfig } from "@/lib/grn-sheets";
import { getI2RItems, updateI2RItem } from "@/lib/i2r-sheets";

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

    if (data.indent_id) {
      const i2rItems = await getI2RItems();
      const i2rItem = i2rItems.find(it => it.id === data.indent_id);
      if (i2rItem) {
        await updateI2RItem(i2rItem.id, {
          ...i2rItem,
          po_number_6: data.PO_Number || finalPONumber,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, po_number: finalPONumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    if (!id) throw new Error("ID required");
    const success = await updateGRNItem(id, updates);
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
