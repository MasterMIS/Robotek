import { NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchConversationMessages(userA: string, userB: string) {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await client.models.ChatMessage.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);

  // Filter for messages between userA and userB (in either direction)
  return allRecords.filter(m =>
    (m.sender_id === userA && m.receiver_id === userB) ||
    (m.sender_id === userB && m.receiver_id === userA)
  );
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("chatId");
    const currentUsername = (session.user as any).username as string;

    if (!partnerId) return NextResponse.json({ error: "partnerId (chatId) is required" }, { status: 400 });

    const messages = await fetchConversationMessages(currentUsername, partnerId);
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
    const newMessage = {
      id: uuidv4(),
      sender_id: currentUsername,
      receiver_id: chat_id,
      text: text || "",
      type: type || "text",
      // Hybrid: if media_url is a Google Drive URL, store as-is; if S3 path, store path
      media_url: media_url || "",
      read_by: currentUsername,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { errors } = await client.models.ChatMessage.create(newMessage);

    if (errors) {
      console.error("Amplify Create Error:", errors);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
