import { NextRequest, NextResponse } from "next/server";
import { delegationService, addDelegationRemark } from "@/lib/delegation-sheets";
import { auth } from "@/auth";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { formatDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { remark } = await req.json();

    if (!remark) {
      return NextResponse.json({ error: "Remark is required" }, { status: 400 });
    }

    const usernameStr = (session.user as any).username || session.user.name || "Unknown User";

    const payload = {
      id: `REM-${Date.now()}`,
      delegation_id: id,
      user_id: session.user.id || "unknown",
      username: usernameStr,
      remark: remark,
      created_at: new Date().toISOString(),
    };

    await addDelegationRemark(payload);

    try {
      const allDelegations = await delegationService.getAll();
      const delegation = allDelegations.find(d => String(d.id) === String(id));
      
      if (delegation) {
        const formattedNow = formatDate(payload.created_at);
        const message = `💬 *New Delegation Comment*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${delegation.title}\n🎯 *Priority:* ${delegation.priority}\n👤 *Assigned To:* ${delegation.assigned_to}\n👨‍💼 *Assigned By:* ${delegation.assigned_by}\n📊 *Status:* ${delegation.status}\n\n🗣️ *Comment By:* ${usernameStr}\n📝 *Comment:* _${remark}_\n⏱️ *At:* ${formattedNow}`;

        const parties = [delegation.assigned_to, delegation.assigned_by];
        const uniqueParties = [...new Set(parties)];
        for (const username of uniqueParties) {
          if (!username) continue;
          const user = await getUserByUsernameOrEmail(username);
          if (user && user.phone) {
            await sendWhatsAppMessage(user.phone, message);
          }
        }
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification for remark:", err);
    }

    return NextResponse.json({ message: "Remark added successfully", remark: payload });
  } catch (error: any) {
    console.error("POST Remark Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
