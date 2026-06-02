import { NextResponse } from "next/server";
import { getHrmsStepConfig, updateHrmsStepConfig } from "@/lib/hrms-sheets";
import { HrmsModuleType } from "@/types/hrms";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const module = rawModule as HrmsModuleType;
  if (!["recruitment", "candidate", "sales", "onboard"].includes(module)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  try {
    const configs = await getHrmsStepConfig(module);
    return NextResponse.json(configs);
  } catch (error) {
    console.error(`Error fetching config for ${module}:`, error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const module = rawModule as HrmsModuleType;
  try {
    const body = await request.json();
    const success = await updateHrmsStepConfig(module, body);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  } catch (error) {
    console.error(`Error in POST config for ${module}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
