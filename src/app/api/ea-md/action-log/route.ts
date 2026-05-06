import { NextRequest, NextResponse } from "next/server";
import { saveActionLogItems } from "@/lib/action-log-sheets";
import { updateActionLogItem, deleteActionLogItem } from "./delete-update-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid or empty items array" }, { status: 400 });
    }

    const result = await saveActionLogItems(items);

    if (result.success) {
      return NextResponse.json({ success: true, ids: result.ids });
    } else {
      return NextResponse.json({ error: "Failed to save to sheet", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("POST Action Log Error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    const updates = await req.json();
    const result = await updateActionLogItem(id, updates);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to update", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("PUT Action Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    const result = await deleteActionLogItem(id);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete", details: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("DELETE Action Log Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
