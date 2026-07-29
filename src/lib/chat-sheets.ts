import { BaseSheetsService } from "./sheets/base-service";
import type { ChatGroup, ChatMessage, PaginatedMessages } from "@/types/chat";
import {
  getCachedMessages,
  invalidateConversationCache,
  setCachedMessages,
} from "./chat-cache";

const CHAT_SHEET_ID = "1G0o9W5ImXNAPjhdFXMtPuHnFTdU_rRkWmSRcaqu9kxM";

const MESSAGE_COLUMNS = [
  "id", "sender_id", "receiver_id", "text", "type", "media_url", "read_by",
  "created_at", "updated_at", "reply_to_id", "edited_at", "is_deleted",
  "reactions", "forwarded_from",
];

const GROUP_COLUMNS = [
  "id", "name", "participants", "admins", "created_by", "created_at",
  "updated_at", "avatar_url", "description", "last_message_at",
];

let schemaInitialized = false;

async function ensureChatSchema() {
  if (schemaInitialized) return;
  await Promise.all([
    messageService.ensureColumns(MESSAGE_COLUMNS),
    groupService.ensureColumns(GROUP_COLUMNS),
  ]);
  schemaInitialized = true;
}

class MessageService extends BaseSheetsService<ChatMessage> {
  protected spreadsheetId = CHAT_SHEET_ID;
  protected sheetName = "messages";
  protected range = "A:N";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): ChatMessage {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      sender_id: get("sender_id") || get("senderid"),
      receiver_id: get("receiver_id") || get("receiverid"),
      text: get("text"),
      type: (get("type") || "text") as ChatMessage["type"],
      media_url: get("media_url") || get("mediaurl"),
      read_by: get("read_by") || get("readby"),
      created_at: get("created_at") || get("createdat"),
      updated_at: get("updated_at") || get("updatedat"),
      reply_to_id: get("reply_to_id") || get("replytoid"),
      edited_at: get("edited_at") || get("editedat"),
      is_deleted: get("is_deleted") || get("isdeleted"),
      reactions: get("reactions"),
      forwarded_from: get("forwarded_from") || get("forwardedfrom"),
    };
  }

  mapItemToRow(m: ChatMessage): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", m.id);
    set("sender_id", m.sender_id);
    set("receiver_id", m.receiver_id);
    set("text", m.text || "");
    set("type", m.type);
    set("media_url", m.media_url || "");
    set("read_by", m.read_by || "");
    set("created_at", m.created_at || "");
    set("updated_at", m.updated_at || "");
    set("reply_to_id", m.reply_to_id || "");
    set("edited_at", m.edited_at || "");
    set("is_deleted", m.is_deleted || "");
    set("reactions", m.reactions || "");
    set("forwarded_from", m.forwarded_from || "");

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
      if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

class GroupService extends BaseSheetsService<ChatGroup> {
  protected spreadsheetId = CHAT_SHEET_ID;
  protected sheetName = "chat_groups";
  protected range = "A:J";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): ChatGroup {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      name: get("name"),
      participants: get("participants"),
      admins: get("admins"),
      created_by: get("created_by") || get("createdby"),
      created_at: get("created_at") || get("createdat"),
      updated_at: get("updated_at") || get("updatedat"),
      avatar_url: get("avatar_url") || get("avatarurl"),
      description: get("description"),
      last_message_at: get("last_message_at") || get("lastmessageat"),
    };
  }

  mapItemToRow(g: ChatGroup): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", g.id);
    set("name", g.name);
    set("participants", g.participants);
    set("admins", g.admins);
    set("created_by", g.created_by);
    set("created_at", g.created_at);
    set("updated_at", g.updated_at || "");
    set("avatar_url", g.avatar_url || "");
    set("description", g.description || "");
    set("last_message_at", g.last_message_at || "");

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
      if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

export const messageService = new MessageService();
export const groupService = new GroupService();

export type { ChatMessage, ChatGroup };

function filterConversationMessages(
  all: ChatMessage[],
  currentUserId: string,
  partnerId: string
): ChatMessage[] {
  const visible = all.filter((m) => m.is_deleted !== "TRUE" && m.is_deleted !== "true");

  if (partnerId.startsWith("group_")) {
    return visible.filter((m) => String(m.receiver_id) === String(partnerId));
  }

  return visible.filter(
    (m) =>
      (String(m.sender_id) === String(currentUserId) && String(m.receiver_id) === String(partnerId)) ||
      (String(m.sender_id) === String(partnerId) && String(m.receiver_id) === String(currentUserId))
  );
}

export async function getMessages(currentUserId: string, partnerId: string): Promise<ChatMessage[]> {
  await ensureChatSchema();
  const cached = getCachedMessages(currentUserId, partnerId);
  if (cached) return cached;

  const all = await messageService.getAll();
  const messages = filterConversationMessages(all, currentUserId, partnerId);
  setCachedMessages(currentUserId, partnerId, messages);
  return messages;
}

export async function getMessagesPaginated(
  currentUserId: string,
  partnerId: string,
  options: { before?: string; limit?: number } = {}
): Promise<PaginatedMessages> {
  const limit = options.limit ?? 50;
  const messages = await getMessages(currentUserId, partnerId);
  messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let filtered = messages;
  if (options.before) {
    const beforeTime = new Date(options.before).getTime();
    filtered = messages.filter((m) => new Date(m.created_at).getTime() < beforeTime);
  }

  const slice = filtered.slice(-limit);
  return {
    messages: slice,
    hasMore: filtered.length > limit,
  };
}

export async function getMessageById(id: string): Promise<ChatMessage | null> {
  await ensureChatSchema();
  const all = await messageService.getAll();
  return all.find((m) => m.id === id) || null;
}

export async function addMessage(message: ChatMessage): Promise<boolean> {
  await ensureChatSchema();
  const now = new Date().toISOString();
  message.updated_at = message.updated_at || now;
  const success = await messageService.add(message);

  if (success) {
    invalidateConversationCache();
    if (message.receiver_id.startsWith("group_")) {
      await updateGroupLastMessage(message.receiver_id, now);
    }
  }
  return success;
}

export async function updateMessage(id: string, message: ChatMessage): Promise<boolean> {
  await ensureChatSchema();
  message.updated_at = new Date().toISOString();
  const success = await messageService.update(id, message);
  if (success) invalidateConversationCache();
  return success;
}

export async function batchMarkMessagesRead(
  messages: ChatMessage[],
  currentUsername: string
): Promise<number> {
  await ensureChatSchema();
  let updatedCount = 0;

  const toUpdate = messages.filter((m) => !(m.read_by || "").includes(currentUsername));
  if (toUpdate.length === 0) return 0;

  await Promise.all(
    toUpdate.map(async (msg) => {
      const newReadBy = msg.read_by ? `${msg.read_by},${currentUsername}` : currentUsername;
      const success = await updateMessage(msg.id, { ...msg, read_by: newReadBy });
      if (success) updatedCount++;
    })
  );

  return updatedCount;
}

export async function softDeleteMessage(id: string, currentUsername: string): Promise<boolean> {
  const msg = await getMessageById(id);
  if (!msg || msg.sender_id !== currentUsername) return false;
  return updateMessage(id, { ...msg, is_deleted: "TRUE", text: "", media_url: "" });
}

export async function editMessage(id: string, currentUsername: string, newText: string): Promise<ChatMessage | null> {
  const msg = await getMessageById(id);
  if (!msg || msg.sender_id !== currentUsername) return null;
  const edited: ChatMessage = {
    ...msg,
    text: newText,
    edited_at: new Date().toISOString(),
  };
  const success = await updateMessage(id, edited);
  return success ? edited : null;
}

export async function toggleReaction(
  messageId: string,
  username: string,
  emoji: string
): Promise<ChatMessage | null> {
  const msg = await getMessageById(messageId);
  if (!msg) return null;

  let reactions: Record<string, string[]> = {};
  try {
    reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
  } catch {
    reactions = {};
  }

  const users = reactions[emoji] || [];
  if (users.includes(username)) {
    reactions[emoji] = users.filter((u) => u !== username);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, username];
  }

  const updated: ChatMessage = { ...msg, reactions: JSON.stringify(reactions) };
  const success = await updateMessage(messageId, updated);
  return success ? updated : null;
}

async function updateGroupLastMessage(groupId: string, timestamp: string): Promise<void> {
  const all = await groupService.getAll();
  const group = all.find((g) => g.id === groupId);
  if (!group) return;
  await groupService.update(groupId, { ...group, last_message_at: timestamp });
}

export async function getGroupsForUser(username: string): Promise<ChatGroup[]> {
  await ensureChatSchema();
  const all = await groupService.getAll();
  return all.filter((g) =>
    g.participants.split(",").map((p) => p.trim()).includes(username)
  );
}

export async function createGroup(group: ChatGroup): Promise<boolean> {
  await ensureChatSchema();
  group.updated_at = group.updated_at || new Date().toISOString();
  return groupService.add(group);
}

export async function updateGroup(id: string, group: ChatGroup): Promise<boolean> {
  await ensureChatSchema();
  group.updated_at = new Date().toISOString();
  return groupService.update(id, group);
}

export async function deleteGroup(id: string): Promise<boolean> {
  await ensureChatSchema();
  return groupService.delete(id);
}

export { ensureChatSchema };
