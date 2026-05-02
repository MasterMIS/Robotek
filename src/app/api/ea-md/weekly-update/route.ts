import { NextRequest, NextResponse } from "next/server";
import { eaMdService } from "@/lib/ea-md-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await eaMdService.weeklyUpdates.getAll();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET Weekly Updates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid or empty items array" }, { status: 400 });
    }

    const ids: string[] = [];
    for (const item of items) {
      const newItem = {
        ...item,
        id: item.id || `WU-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      };
      await eaMdService.weeklyUpdates.add(newItem);
      ids.push(newItem.id);
    }

    return NextResponse.json({ success: true, ids });
  } catch (error: any) {
    console.error("POST Weekly Update Error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    const updates = await req.json();
    await eaMdService.weeklyUpdates.update(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Weekly Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    await eaMdService.weeklyUpdates.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Weekly Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
