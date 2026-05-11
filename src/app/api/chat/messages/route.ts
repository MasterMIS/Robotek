import { NextResponse } from "next/server";
import { getMessages, addMessage, ChatMessage, deleteMessage } from "@/lib/chat-sheets";
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("chatId");
    const currentUsername = (session.user as any).username as string;

    if (!partnerId) return NextResponse.json({ error: "partnerId (chatId) is required" }, { status: 400 });

    const messages = await getMessages(currentUsername, partnerId);
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { chat_id, text, type, media_url } = body;

    if (!chat_id) return NextResponse.json({ error: "receiver_id (chat_id) is required" }, { status: 400 });

    const timestamp = new Date().toISOString();
    const newMessage: ChatMessage = {
      id: uuidv4(),
      sender_id: currentUsername,
      receiver_id: chat_id,
      text: text || "",
      type: type || "text",
      media_url: media_url || "",
      read_by: currentUsername,
      created_at: timestamp
    };

    const success = await addMessage(newMessage);

    if (!success) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUsername = (session.user as any).username as string;
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) return NextResponse.json({ error: "messageId is required" }, { status: 400 });

    // For security, we should verify the sender. 
    // Since we don't have a getById, we check if the message exists and was sent by current user
    const { messageService } = await import("@/lib/chat-sheets");
    const all = await messageService.getAll();
    const msg = all.find(m => m.id === messageId);

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msg.sender_id !== currentUsername) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    const success = await deleteMessage(messageId);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
