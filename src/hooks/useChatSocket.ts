"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@/types/chat";

interface UseChatSocketOptions {
  currentUsername: string;
  chatId: string | null;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  onTypingStart?: (username: string) => void;
  onTypingStop?: (username: string) => void;
  onPresenceSync?: (onlineUsers: string[]) => void;
  onPresenceUpdate?: (username: string, online: boolean) => void;
}

export function useChatSocket({
  currentUsername,
  chatId,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
  onTypingStart,
  onTypingStop,
  onPresenceSync,
  onPresenceUpdate,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const prevChatId = useRef<string | null>(null);

  const callbacksRef = useRef({
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
    onPresenceSync,
    onPresenceUpdate,
  });
  callbacksRef.current = {
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
    onPresenceSync,
    onPresenceUpdate,
  };

  useEffect(() => {
    const socket = io({
      path: "/api/socketio",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("message:new", (msg: ChatMessage) => callbacksRef.current.onNewMessage?.(msg));
    socket.on("message:updated", (msg: ChatMessage) => callbacksRef.current.onMessageUpdated?.(msg));
    socket.on("message:deleted", ({ messageId }: { messageId: string }) =>
      callbacksRef.current.onMessageDeleted?.(messageId)
    );
    socket.on("typing:start", ({ username }: { chatId: string; username: string }) =>
      callbacksRef.current.onTypingStart?.(username)
    );
    socket.on("typing:stop", ({ username }: { chatId: string; username: string }) =>
      callbacksRef.current.onTypingStop?.(username)
    );
    socket.on("presence:sync", ({ online }: { online: string[] }) =>
      callbacksRef.current.onPresenceSync?.(online)
    );
    socket.on("presence:update", ({ username, online }: { username: string; online: boolean }) =>
      callbacksRef.current.onPresenceUpdate?.(username, online)
    );

    const pingInterval = setInterval(() => {
      socket.emit("ping:activity");
      fetch("/api/chat/ping", { method: "POST" }).catch(() => {});
    }, 60000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUsername]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (prevChatId.current) {
      socket.emit("chat:leave", prevChatId.current);
    }

    if (chatId) {
      socket.emit("chat:join", chatId);
      prevChatId.current = chatId;
    } else {
      prevChatId.current = null;
    }
  }, [chatId]);

  const sendMessage = useCallback(
    (payload: {
      chat_id: string;
      text: string;
      type?: string;
      media_url?: string;
      reply_to_id?: string;
      forwarded_from?: string;
    }): Promise<ChatMessage | null> => {
      return new Promise((resolve) => {
        socketRef.current?.emit("message:send", payload, (res: { message?: ChatMessage; error?: string }) => {
          if (res?.error) resolve(null);
          else resolve(res?.message || null);
        });
      });
    },
    []
  );

  const emitTypingStart = useCallback((targetChatId: string) => {
    socketRef.current?.emit("typing:start", targetChatId);
  }, []);

  const emitTypingStop = useCallback((targetChatId: string) => {
    socketRef.current?.emit("typing:stop", targetChatId);
  }, []);

  const markRead = useCallback((partnerId: string) => {
    socketRef.current?.emit("message:read", { partnerId });
  }, []);

  const editMessage = useCallback((messageId: string, text: string): Promise<ChatMessage | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit("message:edit", { messageId, text }, (res: { message?: ChatMessage; error?: string }) => {
        resolve(res?.message || null);
      });
    });
  }, []);

  const deleteMessage = useCallback((messageId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socketRef.current?.emit("message:delete", { messageId }, (res: { success?: boolean; error?: string }) => {
        resolve(!!res?.success);
      });
    });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string): Promise<ChatMessage | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit("message:react", { messageId, emoji }, (res: { message?: ChatMessage; error?: string }) => {
        resolve(res?.message || null);
      });
    });
  }, []);

  return {
    connected,
    sendMessage,
    emitTypingStart,
    emitTypingStop,
    markRead,
    editMessage,
    deleteMessage,
    reactToMessage,
  };
}
