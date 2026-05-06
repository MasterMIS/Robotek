import { NextRequest, NextResponse } from "next/server";
import { getUrgentLogs, saveUrgentLog } from "@/lib/urgent-log-sheets";
import { updateUrgentLogRow, deleteUrgentLogRow } from "./urgent-log-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getUrgentLogs();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const result = await saveUrgentLog(item);

    if (result.success) {
      return NextResponse.json({ success: true, id: result.id });
    } else {
      return NextResponse.json({ error: "Failed to save to sheet", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("POST Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updates = await req.json();
    const result = await updateUrgentLogRow(id, updates);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to update", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("PUT Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const result = await deleteUrgentLogRow(id);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("DELETE Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
