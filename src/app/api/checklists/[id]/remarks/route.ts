import { NextRequest, NextResponse } from "next/server";
import { addChecklistRemark } from "@/lib/checklist-sheets";
import { auth } from "@/auth";
import { ChecklistRemark } from "@/types/checklist";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { remark } = await req.json();

    if (!remark) {
      return NextResponse.json({ error: "Remark is required" }, { status: 400 });
    }

    const newRemark: ChecklistRemark = {
      id: uuidv4(),
      checklists_id: id,
      user_id: session.user.id || "unknown",
      // @ts-ignore
      username: session.user.username || session.user.name || "Unknown User",
      remark: remark,
      created_at: new Date().toISOString(),
    };

    const success = await addChecklistRemark(newRemark);

    if (success) {
      return NextResponse.json({ message: "Remark added successfully", remark: newRemark });
    } else {
      return NextResponse.json({ error: "Failed to add remark" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error adding checklist remark:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
