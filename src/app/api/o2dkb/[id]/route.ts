import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await o2dkbService.update(id, body);
    
    return NextResponse.json({ message: "O2DKB record updated successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await o2dkbService.delete(id);
    
    return NextResponse.json({ message: "O2DKB record deleted successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
