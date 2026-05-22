import { NextResponse } from "next/server";
import { getFollowUps, addFollowUp, getSalesLeads, updateSalesLead } from "@/lib/sales-sheets";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const followUps = await getFollowUps(leadId || undefined);
    return NextResponse.json(followUps);
  } catch (error) {
    console.error("GET Follow Ups Error:", error);
    return NextResponse.json({ error: "Failed to fetch follow ups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Automatically set dealing with if not provided
    if (!body.dealing_with) {
      body.dealing_with = (session.user as any)?.username || "Unknown User";
    }

    const success = await addFollowUp(body);

    if (success) {
      // Auto-update the lead's status to match the follow-up status
      if (body.status && body.lead_id) {
        const leads = await getSalesLeads();
        const existingLead = leads.find(l => l.id === body.lead_id);
        if (existingLead) {
          const updatedLead = { ...existingLead, status: body.status };
          await updateSalesLead(body.lead_id, updatedLead);
        }
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to create follow up" }, { status: 500 });
    }
  } catch (error) {
    console.error("POST Follow Up Error:", error);
    return NextResponse.json({ error: "Failed to create follow up" }, { status: 500 });
  }
}
