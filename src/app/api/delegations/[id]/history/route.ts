import { NextRequest, NextResponse } from "next/server";
import { getDelegationHistory } from "@/lib/delegation-sheets";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const history = await getDelegationHistory(id);

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("GET History Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch history" }, { status: 500 });
  }
}
