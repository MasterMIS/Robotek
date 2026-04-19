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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 1. Fetch current record from AWS to check for changes
    const { data: current } = await client.models.HelpTicket.get({ id });
    if (!current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // 2. Prepare updates
    const { __typename, createdAt, updatedAt, ...clean } = data;
    const finalUpdate: any = { ...clean, id, updated_at: new Date().toISOString() };

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const path = `tickets/${Date.now()}_${voiceNoteFile.name}`;
      await uploadData({ path, data: voiceNoteFile }).result;
      const { url } = await getUrl({ path });
      finalUpdate.voice_note = url.toString();
    }

    if (docFile && docFile.size > 0) {
      const path = `tickets/${Date.now()}_${docFile.name}`;
      await uploadData({ path, data: docFile }).result;
      const { url } = await getUrl({ path });
      finalUpdate.attachment_url = url.toString();
    }

    const { data: updatedTicket, errors } = await client.models.HelpTicket.update(finalUpdate);
    if (errors) throw new Error(errors[0].message);
    
    // 3. Send WhatsApp Notification for Ticket Update/Status Change
    try {
      const isStatusChange = data.status && data.status !== current.status;
      const branding = isStatusChange ? "🔄 *Ticket Status Changed*" : "📝 *Ticket Details Updated*";
      const formattedUpdate = formatDate(new Date().toISOString());
      const oldStatus = current.status || 'Unknown';
      const newStatus = data.status || current.status || 'Unknown';
      const statusLine = isStatusChange ? `📉 *Status Changed:* ${oldStatus} ➡️ ${newStatus}\n` : `📊 *Status:* ${newStatus}\n`;
      const commentLine = data.comment_text ? `🗣️ *Comment:* _${data.comment_text}_\n` : '';

      const message = `${branding}\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${current.id}\n📌 *Title:* ${data.title || current.title}\n🏷️ *Category:* ${data.category || current.category}\n🎯 *Priority:* ${data.priority || current.priority}\n👤 *Raised By:* ${data.raised_by || current.raised_by}\n👨‍🔧 *Assigned To:* ${data.solver_person || current.solver_person || 'Unassigned'}\n${statusLine}${commentLine}⏱️ *Updated At:* ${formattedUpdate}`;

      const parties = [data.raised_by || current.raised_by, data.solver_person || current.solver_person];
      const uniqueParties = [...new Set(parties)].filter(Boolean);

      for (const username of uniqueParties) {
        const usersRes = await client.models.User.list({
          filter: { username: { eq: username || "" } }
        });
        const user = usersRes.data?.[0];
        if (user && user.phone) {
          await sendWhatsAppMessage(user.phone, message);
        }
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error("PUT /api/tickets/[id] error:", error);
    return NextResponse.json({ error: error.message || "Update operation failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: current } = await client.models.HelpTicket.get({ id });
    if (!current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { errors } = await client.models.HelpTicket.delete({ id });
    if (errors) throw new Error(errors[0].message);

    // Send WhatsApp Notification for Deletion
    try {
      if (current.solver_person) {
        const usersRes = await client.models.User.list({
          filter: { username: { eq: current.solver_person } }
        });
        const solver = usersRes.data?.[0];
        if (solver && solver.phone) {
          const message = `🗑️ *Help Ticket Deleted*\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${current.id}\n📌 *Title:* ${current.title}\n\n_This ticket has been removed from the system._`;
          await sendWhatsAppMessage(solver.phone, message);
        }
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tickets/[id] error:", error);
    return NextResponse.json({ error: error.message || "Delete operation failed" }, { status: 500 });
  }
}
