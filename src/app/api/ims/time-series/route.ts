import { NextRequest, NextResponse } from "next/server";
import { getGRNItems } from "@/lib/grn-sheets";
import { getOutFormData } from "@/lib/o2d-sheets";
import { getIMSItems } from "@/lib/ims-sheets";

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

    const categoryMap: Record<string, string> = {};
    items.forEach(i => {
      if (i.item_name) {
        categoryMap[i.item_name.trim().toLowerCase()] = i.category || 'GENERAL';
      }
    });

    const transactions: any[] = [];

    // GRN (Inward)
    grns.forEach(grn => {
      if (grn.Item_Name && !grn.cancelled && grn.status_1 !== "Rejected") {
        const qty = parseFloat(grn.Qty) || 0;
        const name = grn.Item_Name.trim();
        const lowerName = name.toLowerCase();
        
        let txDate = grn.updated_at || "";
        const ts = parseDateStr(txDate);
        if (ts > 0) txDate = new Date(ts).toISOString();

        transactions.push({
          item_name: name,
          category: categoryMap[lowerName] || 'GENERAL',
          date: txDate,
          in_qty: qty,
          out_qty: 0
        });
      }
    });

    // Out Form (Outward)
    outForm.forEach(row => {
      let txDate = row.date || row.updated_at || "";
      const ts = parseDateStr(txDate);
      if (ts > 0) txDate = new Date(ts).toISOString();

      const addQty = (desc: string, qty: number) => {
        const lowerDesc = desc.toLowerCase();
        transactions.push({
          item_name: desc,
          category: categoryMap[lowerDesc] || 'GENERAL',
          date: txDate,
          in_qty: 0,
          out_qty: qty
        });
      };

      if (row.description && row.description.trim().startsWith("[") && row.description.trim().endsWith("]")) {
        try {
          const lineItems = JSON.parse(row.description);
          lineItems.forEach((item: any) => {
            const desc = (item.Description || item.description || "").trim();
            const qty = parseFloat(item.Qty || item.qty) || 0;
            if (desc) addQty(desc, qty);
          });
        } catch (e) {
          // Fallback if parse fails
        }
      } else if (row.description) {
        const desc = row.description.trim();
        const qty = parseFloat(row.qty) || 0;
        if (desc) addQty(desc, qty);
      }
    });

    return NextResponse.json(transactions, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    console.error("Error fetching IMS time-series:", error);
    return NextResponse.json({ error: "Failed to fetch time-series" }, { status: 500 });
  }
}
