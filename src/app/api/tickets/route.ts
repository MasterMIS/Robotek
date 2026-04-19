import { NextResponse } from 'next/server';
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET() {
  try {
    let allTickets: any[] = [];
    let nextToken: string | null | undefined = null;

    // 1. Fetch all tickets with pagination handling
    do {
      const result: any = await client.models.HelpTicket.list({
        nextToken: nextToken,
        limit: 1000
      });
      if (result.errors) throw new Error(result.errors[0].message);
      allTickets = [...allTickets, ...result.data];
      nextToken = result.nextToken;
    } while (nextToken);

    // 2. Fetch all history to find latest comments (in-memory join for performance on moderate datasets)
    // For very large datasets, this should be optimized to fetch per-ticket or use a specialized query
    let allHistory: any[] = [];
    let historyNextToken: string | null | undefined = null;
    do {
      const result: any = await client.models.HelpTicketHistory.list({
        nextToken: historyNextToken,
        limit: 1000
      });
      if (result.errors) throw new Error(result.errors[0].message);
      allHistory = [...allHistory, ...result.data];
      historyNextToken = result.nextToken;
    } while (historyNextToken);

    // Group history by ticket
    const historyByTicket: Record<string, any[]> = {};
    for (const h of allHistory) {
      if (!h.comment_text) continue;
      if (!historyByTicket[h.ticket_id]) historyByTicket[h.ticket_id] = [];
      historyByTicket[h.ticket_id].push(h);
    }

    // Add latest comment to each ticket
    for (const ticket of allTickets) {
      const ticketHistory = historyByTicket[ticket.id] || [];
      if (ticketHistory.length > 0) {
        ticketHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        ticket.latest_comment = {
          text: ticketHistory[0].comment_text,
          actor: ticketHistory[0].actor_username,
          created_at: ticketHistory[0].created_at
        };
      }
    }
    
    return NextResponse.json(allTickets, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let voiceNoteFile: File | null = null;
    let docFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = JSON.parse(formData.get("ticketData") as string);
      voiceNoteFile = formData.get("voice_note") as File;
      docFile = formData.get("reference_doc") as File;
    } else {
      data = await request.json();
    }

    // Generate numeric-style ID for consistency if needed, though Amplify provides auto-ID
    // Let's use numeric string if available, or timestamp
    const ticketId = data.id || `TKT-${Date.now()}`;
    
    const newTicketRecord: any = {
      id: ticketId,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "Other",
      priority: data.priority || "Medium",
      raised_by: data.raised_by || "",
      solver_person: data.solver_person || "",
      planned_resolution: data.planned_resolution || "",
      status: data.status || "Open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachment_url: data.attachment_url || "",
      voice_note: data.voice_note || "",
    };

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const path = `tickets/${Date.now()}_${voiceNoteFile.name}`;
      await uploadData({ path, data: voiceNoteFile }).result;
      const { url } = await getUrl({ path });
      newTicketRecord.voice_note = url.toString();
    }

    if (docFile && docFile.size > 0) {
      const path = `tickets/${Date.now()}_${docFile.name}`;
      await uploadData({ path, data: docFile }).result;
      const { url } = await getUrl({ path });
      newTicketRecord.attachment_url = url.toString();
    }

    const { data: createdTicket, errors } = await client.models.HelpTicket.create(newTicketRecord);
    if (errors) throw new Error(errors[0].message);
    
    // Send WhatsApp Notification for New Ticket
    try {
      // Find solver user in AWS
      const usersRes = await client.models.User.list({
        filter: { username: { eq: newTicketRecord.solver_person || "" } }
      });
      const solver = usersRes.data?.[0];

      if (solver && solver.phone) {
        const formattedDate = formatDate(newTicketRecord.created_at);
        const dueDate = newTicketRecord.planned_resolution ? formatDate(newTicketRecord.planned_resolution) : "Not Set";
        const message = `🎫 *New Help Ticket Raised*\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${newTicketRecord.id}\n📌 *Title:* ${newTicketRecord.title}\n🏷️ *Category:* ${newTicketRecord.category}\n🎯 *Priority:* ${newTicketRecord.priority}\n👤 *Raised By:* ${newTicketRecord.raised_by}\n👨‍🔧 *Assigned To:* ${newTicketRecord.solver_person || 'Unassigned'}\n⏳ *Due Date:* ${dueDate}\n⏱️ *Created At:* ${formattedDate}\n\n📝 *Description:* _${newTicketRecord.description}_`;
        await sendWhatsAppMessage(solver.phone, message);
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }

    return NextResponse.json({ success: true, ticket: createdTicket });
  } catch (error: any) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json({ error: error.message || "Invalid request data" }, { status: 400 });
  }
}
