import { NextResponse } from "next/server";
import { getSalesLeads, addSalesLead } from "@/lib/sales-sheets";
import { auth } from "@/auth";
import { calculatePlannedTimeIST } from "@/lib/workingHours";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await getSalesLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET Sales Leads Error:", error);
    return NextResponse.json({ error: "Failed to fetch sales leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Automatically fill who created it
    body.filled_by = (session.user as any)?.username || "Unknown User";
    
    // Default status to Lead Generated
    if (!body.status) {
      body.status = "Lead Generated";
    }

    // Auto generate planned time based on 1 day TAT (9 working hours)
    if (!body.planned_time) {
      const nowUTC = new Date();
      body.planned_time = calculatePlannedTimeIST(nowUTC, 9).toISOString();
    }

    const success = await addSalesLead(body);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
  } catch (error) {
    console.error("POST Sales Lead Error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
