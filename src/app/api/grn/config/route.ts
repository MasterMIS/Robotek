import { NextRequest, NextResponse } from "next/server";
import { getGRNStepConfig, updateGRNStepConfig } from "@/lib/grn-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getGRNStepConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const configs = await request.json();
    const success = await updateGRNStepConfig(configs);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
