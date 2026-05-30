import { NextRequest, NextResponse } from "next/server";
import { 
  getStationaryItems, 
  addStationaryItem, 
  updateStationaryItem, 
  deleteStationaryItem, 
  getStationaryLogs, 
  logStockTransaction 
} from "@/lib/stationary-sheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "logs") {
      const logs = await getStationaryLogs();
      return NextResponse.json({ success: true, logs });
    }

    // Default: fetch master list
    const items = await getStationaryItems();
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("GET /api/inventory/stationary Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === "create_item") {
      const success = await addStationaryItem(data);
      return NextResponse.json({ success });
    } 
    else if (action === "stock_transaction") {
      const success = await logStockTransaction(data);
      return NextResponse.json({ success });
    }
    
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/inventory/stationary Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku_code, data } = body;

    if (!sku_code || !data) {
      return NextResponse.json({ success: false, error: "Missing sku_code or data" }, { status: 400 });
    }

    const success = await updateStationaryItem(sku_code, data);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("PUT /api/inventory/stationary Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku_code } = body;

    if (!sku_code) {
      return NextResponse.json({ success: false, error: "Missing sku_code" }, { status: 400 });
    }

    const success = await deleteStationaryItem(sku_code);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("DELETE /api/inventory/stationary Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
