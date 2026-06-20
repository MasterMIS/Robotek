import { NextResponse } from "next/server";
import { getMeetings, addMeeting, updateMeeting, deleteMeeting } from "@/lib/meeting-sheets";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

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

    // Send WhatsApp Notifications (Background)
    const attendeesList = (newMeeting.attendees || "").split(",").map((u: string) => u.trim()).filter(Boolean);
    Promise.all(attendeesList.map(async (username: string) => {
      try {
        const user = await getUserByUsernameOrEmail(username);
        if (user && user.phone) {
          const formattedStart = formatDate(newMeeting.start_time || "");
          const formattedEnd = formatDate(newMeeting.end_time || "");
          const message = `📅 *New Meeting Scheduled*\n━━━━━━━━━━━━━━━━━\n📌 *Title:* ${newMeeting.title}\n📝 *Agenda:* ${newMeeting.description || "N/A"}\n⏰ *Start:* ${formattedStart}\n⏳ *End:* ${formattedEnd}\n🔗 *Link:* ${newMeeting.meeting_link || "N/A"}\n👨‍💼 *Organized By:* ${newMeeting.created_by}`;
          await sendWhatsAppMessage(user.phone, message);
        }
      } catch (err) {
        console.error("WhatsApp error:", err);
      }
    })).catch(e => console.error("Bulk WhatsApp error:", e));

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

    // Send WhatsApp Notifications (Background)
    const attendeesList = (data.attendees || "").split(",").map((u: string) => u.trim()).filter(Boolean);
    Promise.all(attendeesList.map(async (username: string) => {
      try {
        const user = await getUserByUsernameOrEmail(username);
        if (user && user.phone) {
          const formattedStart = formatDate(data.start_time || "");
          const formattedEnd = formatDate(data.end_time || "");
          const message = `✏️ *Meeting Updated*\n━━━━━━━━━━━━━━━━━\n📌 *Title:* ${data.title}\n📝 *Agenda:* ${data.description || "N/A"}\n⏰ *Start:* ${formattedStart}\n⏳ *End:* ${formattedEnd}\n🔗 *Link:* ${data.meeting_link || "N/A"}\n👨‍💼 *Organized By:* ${data.created_by || (session.user as any).username}`;
          await sendWhatsAppMessage(user.phone, message);
        }
      } catch (err) {
        console.error("WhatsApp error:", err);
      }
    })).catch(e => console.error("Bulk WhatsApp error:", e));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Meeting Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    // Fetch meeting details before deleting so we can notify attendees
    const meetings = await getMeetings();
    const meetingToDelete = meetings.find(m => m.id === id);

    await deleteMeeting(id);

    if (meetingToDelete) {
      const attendeesList = (meetingToDelete.attendees || "").split(",").map((u: string) => u.trim()).filter(Boolean);
      const sessionUser = (session.user as any).username || session.user.email;
      Promise.all(attendeesList.map(async (username: string) => {
        try {
          const user = await getUserByUsernameOrEmail(username);
          if (user && user.phone) {
            const formattedStart = formatDate(meetingToDelete.start_time || "");
            const message = `❌ *Meeting Canceled*\n━━━━━━━━━━━━━━━━━\n📌 *Title:* ${meetingToDelete.title}\n⏰ *Start:* ${formattedStart}\n👨‍💼 *Canceled By:* ${sessionUser}`;
            await sendWhatsAppMessage(user.phone, message);
          }
        } catch (err) {
          console.error("WhatsApp error:", err);
        }
      })).catch(e => console.error("Bulk WhatsApp error:", e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Meeting Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete meeting" }, { status: 500 });
  }
}
