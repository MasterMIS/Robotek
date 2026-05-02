import { NextResponse } from "next/server";
import { getMeetings, addMeeting, updateMeeting, deleteMeeting } from "@/lib/meeting-sheets";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const meetings = await getMeetings();
    return NextResponse.json(meetings);
  } catch (error: any) {
    console.error("GET Meetings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const timestamp = new Date().toISOString();
    const newMeeting = {
      ...data,
      id: data.id || uuidv4(),
      created_by: (session.user as any).username || session.user.email,
      created_at: data.created_at || timestamp,
    };

    await addMeeting(newMeeting);
    return NextResponse.json(newMeeting);
  } catch (error: any) {
    console.error("POST Meeting Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add meeting" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const id = data.id;
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await updateMeeting(id, data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Meeting Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await deleteMeeting(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Meeting Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete meeting" }, { status: 500 });
  }
}
