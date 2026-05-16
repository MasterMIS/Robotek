import { NextRequest, NextResponse } from "next/server";
import { getReplaceStepConfig, updateReplaceStepConfig } from "@/lib/replace-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getReplaceStepConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const configs = await request.json();
    const success = await updateReplaceStepConfig(configs);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
