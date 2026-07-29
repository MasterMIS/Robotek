import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import type { ChatMessage } from "@/types/chat";
import {
  addMessage,
  batchMarkMessagesRead,
  editMessage,
  getMessages,
  softDeleteMessage,
  toggleReaction,
} from "@/lib/chat-sheets";
import { notifyChatRecipients } from "@/lib/chat-notifications";
import { v4 as uuidv4 } from "uuid";

let io: SocketIOServer | null = null;

const onlineUsers = new Map<string, Set<string>>(); // username -> socket ids
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>(); // chatId -> username -> timeout

export function getIO(): SocketIOServer | null {
  return io;
}

function getDmRoomId(userA: string, userB: string): string {
  return `chat:${[userA, userB].sort().join(":")}`;
}

function getChatRoomId(chatId: string, username: string): string {
  if (chatId.startsWith("group_")) return `chat:${chatId}`;
  return getDmRoomId(username, chatId);
}

function setUserOnline(username: string, socketId: string) {
  if (!onlineUsers.has(username)) onlineUsers.set(username, new Set());
  onlineUsers.get(username)!.add(socketId);
}

function setUserOffline(username: string, socketId: string) {
  const sockets = onlineUsers.get(username);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(username);
}

function isUserOnline(username: string): boolean {
  return onlineUsers.has(username) && onlineUsers.get(username)!.size > 0;
}

export function isChatUserOnline(username: string): boolean {
  return isUserOnline(username);
}

function broadcastPresence(username: string, online: boolean) {
  io?.emit("presence:update", { username, online });
}

/** Notify offline recipients via WhatsApp (Maytapi). */
async function dispatchChatNotifications(message: ChatMessage, senderUsername: string) {
  await notifyChatRecipients(message, senderUsername, isUserOnline);
}

export function initSocketIO(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: process.env.NEXTAUTH_URL || "*", credentials: true },
    addTrailingSlash: false,
  });

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: { headers: { cookie: socket.handshake.headers.cookie ?? "" } } as any,
        secret: process.env.AUTH_SECRET,
      });
      if (!token?.username) return next(new Error("Unauthorized"));
      socket.data.username = token.username as string;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const username = socket.data.username as string;

    setUserOnline(username, socket.id);
    socket.join(`user:${username}`);
    broadcastPresence(username, true);

    socket.emit("presence:sync", {
      online: Array.from(onlineUsers.keys()),
    });

    socket.on("chat:join", (chatId: string) => {
      const room = getChatRoomId(chatId, username);
      socket.join(room);
    });

    socket.on("chat:leave", (chatId: string) => {
      const room = getChatRoomId(chatId, username);
      socket.leave(room);
    });

    socket.on("message:send", async (payload, ack) => {
      try {
        const { chat_id, text, type, media_url, reply_to_id, forwarded_from } = payload;
        if (!chat_id) return ack?.({ error: "chat_id required" });

        const timestamp = new Date().toISOString();
        const newMessage: ChatMessage = {
          id: uuidv4(),
          sender_id: username,
          receiver_id: chat_id,
          text: text || "",
          type: type || "text",
          media_url: media_url || "",
          read_by: username,
          created_at: timestamp,
          updated_at: timestamp,
          reply_to_id: reply_to_id || "",
          forwarded_from: forwarded_from || "",
        };

        const success = await addMessage(newMessage);
        if (!success) return ack?.({ error: "Failed to save message" });

        const room = getChatRoomId(chat_id, username);
        io!.to(room).emit("message:new", newMessage);
        void dispatchChatNotifications(newMessage, username);

        ack?.({ message: newMessage });
      } catch (err) {
        console.error("[socket] message:send error:", err);
        ack?.({ error: "Internal error" });
      }
    });

    socket.on("message:read", async (payload) => {
      try {
        const { partnerId } = payload;
        if (!partnerId) return;
        const messages = await getMessages(username, partnerId);
        const isGroup = partnerId.startsWith("group_");
        const unread = messages.filter((m) => {
          const isUnread = !(m.read_by || "").includes(username);
          if (isGroup) return m.sender_id !== username && isUnread;
          return m.sender_id === partnerId && m.receiver_id === username && isUnread;
        });
        await batchMarkMessagesRead(unread, username);
        const room = getChatRoomId(partnerId, username);
        io!.to(room).emit("message:read", { partnerId, reader: username, count: unread.length });
      } catch (err) {
        console.error("[socket] message:read error:", err);
      }
    });

    socket.on("message:edit", async (payload, ack) => {
      try {
        const { messageId, text } = payload;
        const edited = await editMessage(messageId, username, text);
        if (!edited) return ack?.({ error: "Failed to edit" });
        io!.emit("message:updated", edited);
        ack?.({ message: edited });
      } catch (err) {
        ack?.({ error: "Internal error" });
      }
    });

    socket.on("message:delete", async (payload, ack) => {
      try {
        const { messageId } = payload;
        const success = await softDeleteMessage(messageId, username);
        if (!success) return ack?.({ error: "Failed to delete" });
        io!.emit("message:deleted", { messageId });
        ack?.({ success: true });
      } catch (err) {
        ack?.({ error: "Internal error" });
      }
    });

    socket.on("message:react", async (payload, ack) => {
      try {
        const { messageId, emoji } = payload;
        const updated = await toggleReaction(messageId, username, emoji);
        if (!updated) return ack?.({ error: "Failed to react" });
        io!.emit("message:updated", updated);
        ack?.({ message: updated });
      } catch (err) {
        ack?.({ error: "Internal error" });
      }
    });

    socket.on("typing:start", (chatId: string) => {
      const room = getChatRoomId(chatId, username);
      socket.to(room).emit("typing:start", { chatId, username });

      if (!typingUsers.has(chatId)) typingUsers.set(chatId, new Map());
      const chatTyping = typingUsers.get(chatId)!;
      if (chatTyping.has(username)) clearTimeout(chatTyping.get(username)!);
      chatTyping.set(
        username,
        setTimeout(() => {
          chatTyping.delete(username);
          socket.to(room).emit("typing:stop", { chatId, username });
        }, 3000)
      );
    });

    socket.on("typing:stop", (chatId: string) => {
      const room = getChatRoomId(chatId, username);
      socket.to(room).emit("typing:stop", { chatId, username });
      typingUsers.get(chatId)?.delete(username);
    });

    socket.on("ping:activity", () => {
      socket.broadcast.emit("presence:activity", { username, last_active: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
      setUserOffline(username, socket.id);
      if (!isUserOnline(username)) {
        broadcastPresence(username, false);
      }
    });
  });

  return io;
}

export async function emitNewMessage(message: ChatMessage, senderUsername: string) {
  if (!io) return;
  const room = message.receiver_id.startsWith("group_")
    ? `chat:${message.receiver_id}`
    : getDmRoomId(senderUsername, message.receiver_id);
  io.to(room).emit("message:new", message);
}
