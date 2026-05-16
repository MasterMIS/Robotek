import { NextRequest, NextResponse } from "next/server";
import { getI2RPackingStepConfig, updateI2RPackingStepConfig } from "@/lib/i2r-packing-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getI2RPackingStepConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching I2R Packing config:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const configs = await request.json();
    const success = await updateI2RPackingStepConfig(configs);
    if (!success) {
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating I2R Packing config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
