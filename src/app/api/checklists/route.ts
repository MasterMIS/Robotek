import { NextRequest, NextResponse } from "next/server";
import { getChecklists, addChecklist } from "@/lib/checklist-sheets";
import { Checklist } from "@/types/checklist";

export async function GET() {
  const checklists = await getChecklists();
  return NextResponse.json(checklists);
}

export async function POST(req: NextRequest) {
  try {
    const checklistData: Checklist = await req.json();

    const success = await addChecklist(checklistData);
    if (success) {
      return NextResponse.json({ message: "Checklist added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add checklist" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
