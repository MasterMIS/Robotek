import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupsForUser, createGroup, messageService } from "@/lib/chat-sheets";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username") || currentUsername;

    if (username !== currentUsername) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [groups, allMessages] = await Promise.all([
      getGroupsForUser(username),
      messageService.getAll(),
    ]);

    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const groupsWithMessages = groups.map((g) => {
      const groupMessages = allMessages.filter(
        (m) => m.receiver_id === g.id && m.is_deleted !== "TRUE" && m.is_deleted !== "true"
      );
      const lastMessage = groupMessages[0] || null;

      const unreadCount = groupMessages.filter(
        (m) => !(m.read_by || "").includes(username) && m.sender_id !== username
      ).length;

      return {
        ...g,
        unreadCount,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              type: lastMessage.type,
              sender_id: lastMessage.sender_id,
              read_by: lastMessage.read_by,
              created_at: lastMessage.created_at,
            }
          : null,
      };
    });

    return NextResponse.json(groupsWithMessages);
  } catch (error) {
    console.error("GET Groups Error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { name, participants, creator } = body;

    if (!name || !participants) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (creator && creator !== currentUsername) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newGroup = {
      id: `group_${Date.now()}`,
      name,
      participants,
      admins: currentUsername,
      created_by: currentUsername,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const success = await createGroup(newGroup);
    if (success) {
      return NextResponse.json(newGroup);
    }
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  } catch (error) {
    console.error("POST Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
