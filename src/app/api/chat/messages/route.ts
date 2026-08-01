import { NextResponse } from "next/server";
import {
  getMessagesPaginated,
  addMessage,
  ChatMessage,
  softDeleteMessage,
  getMessageById,
  editMessage,
  toggleReaction,
} from "@/lib/chat-sheets";
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";
import { emitNewMessage, isChatUserOnline } from "@/server/socket";
import { notifyChatRecipients } from "@/lib/chat-notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { chatApiDisabledResponse } from "@/lib/chat-api-guard";

export async function GET(req: Request) {
  const disabled = chatApiDisabledResponse();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("chatId");
    const before = searchParams.get("before") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const currentUsername = (session.user as any).username as string;

    if (!partnerId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });

    const result = await getMessagesPaginated(currentUsername, partnerId, { before, limit });
    result.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const disabled = chatApiDisabledResponse();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { chat_id, text, type, media_url, reply_to_id, forwarded_from } = body;

    if (!chat_id) return NextResponse.json({ error: "chat_id is required" }, { status: 400 });

    const timestamp = new Date().toISOString();
    const newMessage: ChatMessage = {
      id: uuidv4(),
      sender_id: currentUsername,
      receiver_id: chat_id,
      text: text || "",
      type: type || "text",
      media_url: media_url || "",
      read_by: currentUsername,
      created_at: timestamp,
      updated_at: timestamp,
      reply_to_id: reply_to_id || "",
      forwarded_from: forwarded_from || "",
    };

    const success = await addMessage(newMessage);
    if (!success) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });

    await emitNewMessage(newMessage, currentUsername);
    void notifyChatRecipients(newMessage, currentUsername, isChatUserOnline);
    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const disabled = chatApiDisabledResponse();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { messageId, text, action, emoji } = body;

    if (!messageId) return NextResponse.json({ error: "messageId is required" }, { status: 400 });

    if (action === "react" && emoji) {
      const updated = await toggleReaction(messageId, currentUsername, emoji);
      if (!updated) return NextResponse.json({ error: "Failed to react" }, { status: 400 });
      return NextResponse.json(updated);
    }

    if (action === "edit" && text !== undefined) {
      const edited = await editMessage(messageId, currentUsername, text);
      if (!edited) return NextResponse.json({ error: "Failed to edit message" }, { status: 403 });
      return NextResponse.json(edited);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const disabled = chatApiDisabledResponse();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUsername = (session.user as any).username as string;
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) return NextResponse.json({ error: "messageId is required" }, { status: 400 });

    const msg = await getMessageById(messageId);
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (msg.sender_id !== currentUsername) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    const success = await softDeleteMessage(messageId, currentUsername);
    if (!success) return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
