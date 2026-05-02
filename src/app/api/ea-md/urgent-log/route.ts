import { NextRequest, NextResponse } from "next/server";
import { eaMdService } from "@/lib/ea-md-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await eaMdService.urgentLog.getAll();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const newItem = {
      ...item,
      id: item.id || `UL-${Date.now()}-${Math.random()}`
    };
    await eaMdService.urgentLog.add(newItem);
    return NextResponse.json({ success: true, id: newItem.id });
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
    await eaMdService.urgentLog.update(id, updates);
    return NextResponse.json({ success: true });
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

    await eaMdService.urgentLog.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Urgent Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
