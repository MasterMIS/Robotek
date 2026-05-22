import { NextResponse } from "next/server";
import { getSalesLeads, updateSalesLead } from "@/lib/sales-sheets";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const updates = await request.json();
    const leads = await getSalesLeads();
    const existingLead = leads.find((l) => l.id === id);

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Merge updates
    const updatedLead = { ...existingLead, ...updates };

    const success = await updateSalesLead(id, updatedLead);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
  } catch (error) {
    console.error("PATCH Sales Lead Error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
