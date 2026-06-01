import { NextResponse } from "next/server";
import { getAssets, addAsset, updateAsset, deleteAsset } from "@/lib/asset-sheets";

export async function GET() {
  try {
    const assets = await getAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const success = await addAsset(data);
    if (!success) throw new Error("Failed to add asset");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json({ error: "Failed to add asset" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const success = await updateAsset(data.id, data);
    if (!success) throw new Error("Failed to update asset");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/assets error:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const success = await deleteAsset(id);
    if (!success) throw new Error("Failed to delete asset");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assets error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
