import { NextResponse } from "next/server";
import { getRecharges, addRecharge, updateRecharge, deleteRecharge } from "@/lib/recharge-sheets";

export async function GET() {
  try {
    const recharges = await getRecharges();
    return NextResponse.json(recharges);
  } catch (error) {
    console.error("GET /api/recharge error:", error);
    return NextResponse.json({ error: "Failed to fetch recharges" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const success = await addRecharge(data);
    if (!success) throw new Error("Failed to add recharge");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/recharge error:", error);
    return NextResponse.json({ error: "Failed to add recharge" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const success = await updateRecharge(data.id, data);
    if (!success) throw new Error("Failed to update recharge");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/recharge error:", error);
    return NextResponse.json({ error: "Failed to update recharge" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const success = await deleteRecharge(id);
    if (!success) throw new Error("Failed to delete recharge");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recharge error:", error);
    return NextResponse.json({ error: "Failed to delete recharge" }, { status: 500 });
  }
}
