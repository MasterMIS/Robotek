import { NextResponse } from 'next/server';
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { sendWhatsAppMessage } from '@/lib/maytapi';
import { formatDate } from '@/lib/dateUtils';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let allHistory: any[] = [];
    let nextToken: string | null | undefined = null;

    do {
      const result: any = await client.models.HelpTicketHistory.list({
        filter: { ticket_id: { eq: id } },
        nextToken: nextToken,
        limit: 1000
      });
      if (result.errors) throw new Error(result.errors[0].message);
      allHistory = [...allHistory, ...result.data];
      nextToken = result.nextToken;
    } while (nextToken);

    // Sort by created_at descending (newest first)
    allHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return NextResponse.json(allHistory);
  } catch (error: any) {
    console.error(`GET /api/tickets/${id}/history error:`, error);
    return NextResponse.json({ error: error.message || "Failed to fetch ticket history" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let voiceNoteFile: File | null = null;
    let docFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = JSON.parse(formData.get("historyData") as string);
      voiceNoteFile = formData.get("voice_note") as File;
      docFile = formData.get("reference_doc") as File;
    } else {
      data = await request.json();
    }
    
    const newHistoryRecord: any = {
      ticket_id: id,
      action_type: data.action_type || "COMMENT", // 'STATUS_CHANGE' | 'COMMENT'
      actor_username: data.actor_username || "System",
      old_status: data.old_status || "",
      new_status: data.new_status || "",
      comment_text: data.comment_text || "",
      created_at: new Date().toISOString(),
      attachment_url: data.attachment_url || "",
      voice_note: data.voice_note || "",
    };

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const path = `tickets/history/${Date.now()}_${voiceNoteFile.name}`;
      await uploadData({ path, data: voiceNoteFile }).result;
      const { url } = await getUrl({ path });
      newHistoryRecord.voice_note = url.toString();
    }

    if (docFile && docFile.size > 0) {
      const path = `tickets/history/${Date.now()}_${docFile.name}`;
      await uploadData({ path, data: docFile }).result;
      const { url } = await getUrl({ path });
      newHistoryRecord.attachment_url = url.toString();
    }

    const { data: createdHistory, errors } = await client.models.HelpTicketHistory.create(newHistoryRecord);
    if (errors) throw new Error(errors[0].message);
    
    // Send WhatsApp Notification for comment/status change
    try {
      const { data: ticket } = await client.models.HelpTicket.get({ id });
      if (ticket) {
        const formattedNow = formatDate(new Date().toISOString());
        const isStatusChange = createdHistory?.action_type === 'STATUS_CHANGE';
        const header = isStatusChange ? '🔄 *Ticket Status Updated*' : '💬 *New Ticket Comment*';
        const statusLine = isStatusChange
          ? `📉 *Status Changed:* ${createdHistory?.old_status} ➡️ ${createdHistory?.new_status}\n`
          : '';
        const commentLine = createdHistory?.comment_text
          ? `🗣️ *Comment:* _${createdHistory?.comment_text}_\n`
          : '';
        const message = `${header}\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${ticket.id}\n📌 *Title:* ${ticket.title}\n🏷️ *Category:* ${ticket.category}\n🎯 *Priority:* ${ticket.priority}\n👤 *Raised By:* ${ticket.raised_by}\n👨‍🔧 *Assigned To:* ${ticket.solver_person || 'Unassigned'}\n📊 *Current Status:* ${isStatusChange ? createdHistory?.new_status : ticket.status}\n${statusLine}${commentLine}👤 *Updated By:* ${createdHistory?.actor_username}\n⏱️ *Updated At:* ${formattedNow}`;

        const parties = [ticket.raised_by, ticket.solver_person].filter(Boolean);
        const uniqueParties = [...new Set(parties)];
        for (const username of uniqueParties) {
          const usersRes = await client.models.User.list({
            filter: { username: { eq: username || "" } }
          });
          const user = usersRes.data?.[0];
          if (user && user.phone) {
            await sendWhatsAppMessage(user.phone, message);
          }
        }
      }
    } catch (err) {
      console.error('Error sending WhatsApp notification for history:', err);
    }

    return NextResponse.json({ success: true, history: createdHistory });
  } catch (error: any) {
    console.error(`POST /api/tickets/${id}/history error:`, error);
    return NextResponse.json({ error: error.message || "Invalid request data" }, { status: 400 });
  }
}
