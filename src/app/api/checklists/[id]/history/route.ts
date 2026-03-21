import { NextRequest, NextResponse } from "next/server";
import { getChecklistHistory } from "@/lib/checklist-sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const history = await getChecklistHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("API Error fetching checklist history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
