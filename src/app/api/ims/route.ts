import { NextRequest, NextResponse } from "next/server";
import { getIMSItems, addIMSItem, updateIMSItem, deleteIMSItem } from "@/lib/ims-sheets";
import { getGRNItems } from "@/lib/grn-sheets";
import { getOutFormData } from "@/lib/o2d-sheets";
import { IMS } from "@/types/ims";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseDateStr(dStr: string) {
  if (!dStr) return 0;
  let ts = Date.parse(dStr);
  if (!isNaN(ts)) return ts;
  const parts = dStr.split(/[-/]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y.length === 4) {
      ts = Date.parse(`${y}-${m}-${d}`);
      if (!isNaN(ts)) return ts;
    }
  }
  return 0;
}

export async function GET() {
  try {
    const [items, grns, outForm] = await Promise.all([
      getIMSItems(),
      getGRNItems(),
      getOutFormData()
    ]);

    const inQtyMap: Record<string, number> = {};
    grns.forEach(grn => {
      if (grn.Item_Name && !grn.cancelled && grn.status_1 !== "Rejected") {
        const qty = parseFloat(grn.Qty) || 0;
        const name = grn.Item_Name.trim().toLowerCase();
        inQtyMap[name] = (inQtyMap[name] || 0) + qty;
      }
    });

    const outQtyMap: Record<string, number> = {};
    const outQty60DaysMap: Record<string, number> = {};
    const now = Date.now();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    outForm.forEach(row => {
      const rowDateTs = parseDateStr(row.date);
      const isWithin60Days = rowDateTs > 0 && (now - rowDateTs) <= sixtyDaysMs;

      const addQty = (desc: string, qty: number) => {
        outQtyMap[desc] = (outQtyMap[desc] || 0) + qty;
        if (isWithin60Days) {
          outQty60DaysMap[desc] = (outQty60DaysMap[desc] || 0) + qty;
        }
      };

      if (row.description && row.description.trim().startsWith("[") && row.description.trim().endsWith("]")) {
        try {
          const lineItems = JSON.parse(row.description);
          lineItems.forEach((item: any) => {
            const desc = (item.Description || item.description || "").trim().toLowerCase();
            const qty = parseFloat(item.Qty || item.qty) || 0;
            if (desc) addQty(desc, qty);
          });
        } catch (e) {
          // Fallback if parse fails
        }
      } else if (row.description) {
        const desc = row.description.trim().toLowerCase();
        const qty = parseFloat(row.qty) || 0;
        addQty(desc, qty);
      }
    });

    const enrichedItems = items.map(item => {
      const name = (item.item_name || "").trim().toLowerCase();
      const in_qty = inQtyMap[name] || 0;
      const out_qty = outQtyMap[name] || 0;
      const live_stock = in_qty - out_qty;
      const sale_percent = in_qty > 0 ? (out_qty / in_qty) * 100 : 0;
      
      const out60 = outQty60DaysMap[name] || 0;
      const avg_daily_con = out60 / 60;
      const lead_time = 30;
      const safety_factor = 1;
      const max_level = avg_daily_con * lead_time * safety_factor;

      return {
        ...item,
        in_qty,
        out_qty,
        live_stock,
        sale_percent: Number(sale_percent.toFixed(2)),
        avg_daily_con: Number(avg_daily_con.toFixed(2)),
        lead_time,
        safety_factor,
        max_level: Number(max_level.toFixed(2))
      };
    });

    return NextResponse.json(enrichedItems, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    console.error("Error fetching IMS items:", error);
    return NextResponse.json({ error: "Failed to fetch IMS items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addIMSItem(data);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to add IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding IMS item:", error);
    return NextResponse.json({ error: "Failed to add IMS item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: IMS = await request.json();
    const success = await updateIMSItem(data.id, data);

    if (!success) {
      return NextResponse.json({ error: "Failed to update IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating IMS item:", error);
    return NextResponse.json({ error: "Failed to update IMS item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const success = await deleteIMSItem(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting IMS item:", error);
    return NextResponse.json({ error: "Failed to delete IMS item" }, { status: 500 });
  }
}
