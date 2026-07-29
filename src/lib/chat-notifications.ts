import { sendWhatsAppMessage } from "./maytapi";
import { getUserByUsernameOrEmail } from "./google-sheets";
import { groupService } from "./chat-sheets";
import type { ChatMessage } from "@/types/chat";

const PRODUCTION_APP_URL = "https://srv1639142.hstgr.cloud";

/** Public app URL for WhatsApp links (never localhost). */
function getChatAppUrl(): string {
  const fromEnv = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "").replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost") && !fromEnv.includes("127.0.0.1")) {
    return fromEnv;
  }
  return PRODUCTION_APP_URL;
}

function formatPreview(message: ChatMessage): string {
  if (message.type === "text") return message.text.slice(0, 200);
  if (message.type === "image") return "📷 Image";
  if (message.type === "audio") return "🎤 Voice note";
  if (message.type === "file") return "📎 File";
  return "New message";
}

async function notifyOneUser(
  recipientUsername: string,
  message: ChatMessage,
  senderLabel: string,
  isOnline?: (username: string) => boolean
): Promise<void> {
  if (isOnline?.(recipientUsername)) return;

  try {
    const user = await getUserByUsernameOrEmail(recipientUsername);
    if (!user?.phone) {
      console.warn(`[chat-wa] No phone number for ${recipientUsername}`);
      return;
    }

    const preview = formatPreview(message);
    const chatUrl = `${getChatAppUrl()}/chat`;
    const text = `*Robotec Chat*\n\n*${senderLabel}*\n${preview}\n\nOpen: ${chatUrl}`;

    const result = await sendWhatsAppMessage(user.phone, text);
    if (!result.success) {
      console.error(`[chat-wa] Failed for ${recipientUsername}:`, result.error);
    }
  } catch (err) {
    console.error(`[chat-wa] Error notifying ${recipientUsername}:`, err);
  }
}

/** Send WhatsApp alerts to offline chat recipients via Maytapi. */
export async function notifyChatRecipients(
  message: ChatMessage,
  senderUsername: string,
  isOnline?: (username: string) => boolean
): Promise<void> {
  const chatId = message.receiver_id;

  if (chatId.startsWith("group_")) {
    const groups = await groupService.getAll();
    const group = groups.find((g) => g.id === chatId);
    const participants = (group?.participants || "").split(",").map((p) => p.trim()).filter(Boolean);
    const senderLabel = `${group?.name || "Group"} — ${senderUsername}`;

    await Promise.all(
      participants
        .filter((p) => p !== senderUsername)
        .map((p) => notifyOneUser(p, message, senderLabel, isOnline))
    );
  } else if (chatId !== senderUsername) {
    await notifyOneUser(chatId, message, senderUsername, isOnline);
  }
}
