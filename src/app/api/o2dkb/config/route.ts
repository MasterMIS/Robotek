import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";
import { O2DKBStepConfig } from "@/types/o2dkb";

export async function GET() {
  try {
    const configs = await o2dkbService.getStepConfig();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const configs: O2DKBStepConfig[] = await req.json();
    const success = await o2dkbService.updateStepConfig(configs);
    
    if (success) {
      return NextResponse.json({ message: "Config updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
  } catch (error) {
    console.error("API POST Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
