import { NextRequest, NextResponse } from "next/server";
import { getChecklists, updateChecklist, addChecklistRevision } from "@/lib/checklist-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { ChecklistRevision } from "@/types/checklist";
import { v4 as uuidv4 } from "uuid";

const CHECKLIST_FOLDER_ID = "1q0qGYa7lQ2FuIVf5hN5uoDm7cYEGFrMO";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const formData = await req.formData();
    const newStatus = formData.get("status") as string;
    const reason = formData.get("reason") as string || "";
    const revisedDueDate = formData.get("revised_due_date") as string || "";
    const evidenceFile = formData.get("evidence") as File;

    // Get current checklist to have old values
    const checklists = await getChecklists();
    const current = checklists.find(d => String(d.id) === String(id));

    if (!current) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    let evidenceUrl = "";
    if (evidenceFile && evidenceFile.size > 0) {
      evidenceUrl = await uploadFileToDrive(evidenceFile, CHECKLIST_FOLDER_ID) || "";
    }

    // Update main checklist
    const updatedChecklist = {
      ...current,
      status: newStatus,
      due_date: revisedDueDate || current.due_date,
      updated_at: new Date().toISOString()
    };

    await updateChecklist(id, updatedChecklist);

    // Add revision history
    const revision: ChecklistRevision = {
      id: uuidv4(),
      checklists_id: id,
      old_status: current.status,
      new_status: newStatus,
      reason: reason,
      created_at: new Date().toISOString(),
      evidence_urls: evidenceUrl
    };

    await addChecklistRevision(revision);

    return NextResponse.json({ 
      message: "Status updated and revision logged",
      checklist: updatedChecklist
    });
  } catch (error) {
    console.error("API Error updating checklist status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
