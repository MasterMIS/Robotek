import { NextRequest, NextResponse } from "next/server";
import { eaMdService } from "@/lib/ea-md-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await eaMdService.syncMeetings.getAll();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET Sync Meetings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const payload = {
      ...item,
      id: item.id || `SM-${Date.now()}-${Math.random()}`,
      agenda: typeof item.agenda === "string" ? item.agenda : JSON.stringify(item.agenda || []),
      actionItems: typeof item.actionItems === "string" ? item.actionItems : JSON.stringify(item.actionItems || []),
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    };

    await eaMdService.syncMeetings.add(payload);
    return NextResponse.json({ success: true, id: payload.id });
  } catch (error: any) {
    console.error("POST Sync Meeting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await req.json();
    const payload = {
      ...body,
      agenda: typeof body.agenda === "string" ? body.agenda : JSON.stringify(body.agenda || []),
      actionItems: typeof body.actionItems === "string" ? body.actionItems : JSON.stringify(body.actionItems || []),
    };

    await eaMdService.syncMeetings.update(id, payload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Sync Meeting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await eaMdService.syncMeetings.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Sync Meeting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
