import { NextRequest, NextResponse } from "next/server";
import { updateChecklist, deleteChecklist } from "@/lib/checklist-sheets";
import { Checklist } from "@/types/checklist";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    const checklistData: Checklist = await req.json();

    let success;
    if (groupId) {
      const { updateChecklistByGroup } = await import("@/lib/checklist-sheets");
      success = await updateChecklistByGroup(groupId, checklistData);
    } else {
      success = await updateChecklist(id, checklistData);
    }

    if (success) {
      return NextResponse.json({ message: "Checklist updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Error updating checklist:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update checklist" 
    }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    let success;
    if (groupId) {
      const { deleteChecklistByGroup } = await import("@/lib/checklist-sheets");
      success = await deleteChecklistByGroup(groupId);
    } else {
      success = await deleteChecklist(id);
    }

    if (success) {
      return NextResponse.json({ message: "Checklist deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error deleting checklist:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
