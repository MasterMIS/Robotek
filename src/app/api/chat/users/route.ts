import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { globalCache } from "@/lib/cache";
import { buildChatContactsForUser } from "@/lib/chat-contacts";

export const dynamic = "force-dynamic";

const CHAT_USERS_CACHE_TTL = 90 * 1000;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as { username?: string }).username as string;
    const cacheKey = `chat_users_${currentUsername}`;
    const cached = globalCache.get<Awaited<ReturnType<typeof buildChatContactsForUser>>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const contacts = await buildChatContactsForUser(currentUsername);
    globalCache.set(cacheKey, contacts, CHAT_USERS_CACHE_TTL);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
