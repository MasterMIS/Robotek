import { NextRequest, NextResponse } from "next/server";
import { getItemReceivePackingStepConfig, updateItemReceivePackingStepConfig } from "@/lib/item-receive-packing-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getItemReceivePackingStepConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const configs = await request.json();
    const success = await updateItemReceivePackingStepConfig(configs);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
