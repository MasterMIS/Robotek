import type { ChatMessage } from "@/types/chat";
import type { User } from "@/types/user";
import { getUsers } from "@/lib/google-sheets";
import { messageService } from "@/lib/chat-sheets";

export interface ChatContactSummary {
  id: string;
  username: string;
  image_url: string;
  role_name: string;
  unreadCount: number;
  lastMessage: {
    text: string;
    type: string;
    sender_id: string;
    read_by: string;
    created_at: string;
  } | null;
}

export async function buildChatContactsForUser(currentUsername: string): Promise<ChatContactSummary[]> {
  const [allUsers, allMessages] = await Promise.all([getUsers(), messageService.getAll()]);

  allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const contacts = allUsers
    .filter((u: User) => u.username !== currentUsername)
    .map((u: User) => {
      const lastMessage = allMessages.find(
        (m: ChatMessage) =>
          (m.sender_id === currentUsername && m.receiver_id === u.username) ||
          (m.receiver_id === currentUsername && m.sender_id === u.username)
      );

      const unreadCount = allMessages.filter(
        (m: ChatMessage) =>
          m.sender_id === u.username &&
          m.receiver_id === currentUsername &&
          !(m.read_by || "").includes(currentUsername)
      ).length;

      return {
        id: u.id,
        username: u.username,
        image_url: u.image_url,
        role_name: u.role_name,
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

  contacts.sort((a, b) => {
    if (a.lastMessage && b.lastMessage) {
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    }
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    return a.username.localeCompare(b.username);
  });

  return contacts;
}

export function getChatUnreadTotal(contacts: ChatContactSummary[]): number {
  return contacts.reduce((acc, user) => acc + (user.unreadCount || 0), 0);
}
