import { NextRequest, NextResponse } from "next/server";
import { updateO2D, deleteO2D } from "@/lib/o2d-sheets";
import { sendO2DRemarkNotification } from "@/lib/o2d-notifications";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await updateO2D(id, body);
    
    // Send WhatsApp Notification
    await sendO2DRemarkNotification({ ...body, id });

    return NextResponse.json({ message: "O2D record updated successfully" });
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
    await deleteO2D(id);
    return NextResponse.json({ message: "O2D record deleted successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
