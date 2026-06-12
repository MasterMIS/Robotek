import { NextResponse } from "next/server";
import { getIMSItems } from "@/lib/ims-sheets";
import { getFloorIMSItems } from "@/lib/ims-floor-sheets";

export const dynamic = "force-dynamic";

// Helper to fetch main IMS data (similar to /api/ims logic)
async function getMainIMSData() {
  const [items, grns, outForm] = await Promise.all([
    require("@/lib/ims-sheets").getIMSItems(),
    require("@/lib/grn-sheets").getGRNItems(),
    require("@/lib/o2d-sheets").getOutFormData()
  ]);

  const inQtyMap: Record<string, number> = {};
  grns.forEach((grn: any) => {
    if (grn.Item_Name && !grn.cancelled && grn.status_1 !== "Rejected") {
      const qty = parseFloat(grn.Qty) || 0;
      const name = grn.Item_Name.trim().toLowerCase();
      inQtyMap[name] = (inQtyMap[name] || 0) + qty;
    }
  });

  const outQtyMap: Record<string, number> = {};
  outForm.forEach((row: any) => {
    const addQty = (desc: string, qty: number) => {
      outQtyMap[desc] = (outQtyMap[desc] || 0) + qty;
    };

    if (row.description && row.description.trim().startsWith("[") && row.description.trim().endsWith("]")) {
      try {
        const lineItems = JSON.parse(row.description);
        lineItems.forEach((item: any) => {
          const desc = (item.Description || item.description || "").trim().toLowerCase();
          const qty = parseFloat(item.Qty || item.qty) || 0;
          if (desc) addQty(desc, qty);
        });
      } catch (e) {}
    } else if (row.description) {
      const desc = row.description.trim().toLowerCase();
      const qty = parseFloat(row.qty) || 0;
      addQty(desc, qty);
    }
  });

  let totalIn = 0;
  let totalOut = 0;
  let liveStock = 0;

  items.forEach((item: any) => {
    const name = (item.item_name || "").trim().toLowerCase();
    const in_qty = inQtyMap[name] || 0;
    const out_qty = outQtyMap[name] || 0;
    totalIn += in_qty;
    totalOut += out_qty;
    liveStock += (in_qty - out_qty);
  });

  return { totalIn, totalOut, liveStock };
}

export async function GET() {
  try {
    const [main, first, g] = await Promise.all([
      getMainIMSData(),
      getFloorIMSItems("1st"),
      getFloorIMSItems("g")
    ]);

    const summarizeFloor = (items: any[]) => {
      let totalIn = 0;
      let totalOut = 0;
      let liveStock = 0;
      items.forEach(item => {
        const in_qty = parseFloat(item.in_qty) || 0;
        const out_qty = parseFloat(item.out_qty) || 0;
        totalIn += in_qty;
        totalOut += out_qty;
        liveStock += (in_qty - out_qty);
      });
      return { totalIn, totalOut, liveStock };
    };

    return NextResponse.json({
      main,
      first: summarizeFloor(first),
      g: summarizeFloor(g)
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    console.error("Error fetching IMS summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
