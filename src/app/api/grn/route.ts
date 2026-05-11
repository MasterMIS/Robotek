import { NextRequest, NextResponse } from "next/server";
import { addGRNEntry } from "@/lib/grn-sheets";
import { getI2RItems, updateI2RItem } from "@/lib/i2r-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 1. Add to GRN sheet
    const finalPONumber = await addGRNEntry(data);
    
    if (!finalPONumber) {
      throw new Error("Failed to add GRN entry");
    }

    // 2. Update I2R sheet if indent_id is provided
    if (data.indent_id) {
      const i2rItems = await getI2RItems();
      const i2rItem = i2rItems.find(it => it.id === data.indent_id);
      
      if (i2rItem) {
        // Update po_number_6 in I2R sheet
        // If it already has PO numbers, we might want to append or just set the latest
        // The user said "submit that po number in I2R sheet also"
        // I will append it if it's different, or just update it
        const currentPO = i2rItem.po_number_6 || "";
        let newPO = finalPONumber;
        
        if (currentPO && !currentPO.includes(finalPONumber)) {
          newPO = `${currentPO}, ${finalPONumber}`;
        }
        
        await updateI2RItem(i2rItem.id, {
          ...i2rItem,
          po_number_6: newPO,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, po_number: finalPONumber });
  } catch (error: any) {
    console.error("FULL ERROR IN GRN SUBMISSION:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process GRN" },
      { status: 500 }
    );
  }
}
