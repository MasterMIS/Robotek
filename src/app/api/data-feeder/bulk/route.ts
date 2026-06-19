import { NextRequest, NextResponse } from "next/server";
import { getDataFeeder, addManyDataFeeder } from "@/lib/data-feeder-sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for bulk insert" }, { status: 400 });
    }

    const allItems = await getDataFeeder();
    
    // Generate starting sequential ID
    let currentMaxId = 0;
    if (allItems.length > 0) {
      const ids = allItems.map(p => parseInt(String(p.id))).filter(id => !isNaN(id));
      if (ids.length > 0) {
        currentMaxId = Math.max(...ids);
      } else {
        currentMaxId = allItems.length;
      }
    }
    
    const timestamp = new Date().toISOString();

    const itemsToInsert = items.map((item, index) => ({
      ...item,
      id: (currentMaxId + index + 1).toString(),
      timestamp: item.timestamp || timestamp
    }));

    await addManyDataFeeder(itemsToInsert);

    return NextResponse.json({ 
      message: `Successfully inserted ${itemsToInsert.length} records`,
      count: itemsToInsert.length 
    });
  } catch (error: any) {
    console.error("POST Bulk Data Feeder Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
