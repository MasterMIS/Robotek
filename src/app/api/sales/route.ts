import { NextResponse } from "next/server";
import { getSalesLeads, addSalesLead } from "@/lib/sales-sheets";
import { auth } from "@/auth";

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
