import { NextRequest, NextResponse } from "next/server";
import { getSyncMeetings, saveSyncMeeting } from "@/lib/sync-meeting-sheets";
import { updateSyncMeetingRow, deleteSyncMeetingRow } from "./sync-meeting-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getSyncMeetings();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET Sync Meetings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const result = await saveSyncMeeting(item);

    if (result.success) {
      return NextResponse.json({ success: true, id: result.id });
    } else {
      return NextResponse.json({ error: "Failed to save to sheet", details: result.error }, { status: 500 });
    }
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
    const result = await updateSyncMeetingRow(id, body);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to update", details: result.error }, { status: 500 });
    }
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

    const result = await deleteSyncMeetingRow(id);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("DELETE Sync Meeting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
