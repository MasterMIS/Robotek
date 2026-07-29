"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const { data: session } = useSession();
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const handlePresenceSync = useCallback((online: string[]) => {
    setOnlineUsers(new Set(online));
  }, []);

  const handlePresenceUpdate = useCallback((username: string, online: boolean) => {
    setOnlineUsers((prev) => {
      const next = new Set(prev);
      if (online) next.add(username);
      else next.delete(username);
      return next;
    });
  }, []);

  if (!session?.user) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const currentUsername = (session.user as any).username as string;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] flex overflow-hidden rounded-lg shadow-lg border border-gray-200 bg-white">
      <div className={`md:flex ${activePartnerId ? "hidden md:flex" : "flex w-full"} flex-shrink-0 h-full`}>
        <ChatSidebar
          currentUsername={currentUsername}
          activeChatId={activePartnerId}
          onSelectChat={setActivePartnerId}
          onlineUsers={onlineUsers}
        />
      </div>

      <div className={`flex-1 flex flex-col h-full md:flex ${!activePartnerId ? "hidden md:flex" : "flex"}`}>
        {activePartnerId ? (
          <ChatWindow
            chatId={activePartnerId}
            currentUsername={currentUsername}
            onBack={() => setActivePartnerId(null)}
            onlineUsers={onlineUsers}
            onPresenceUpdate={handlePresenceUpdate}
            onPresenceSync={handlePresenceSync}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F0F2F5]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          >
            <div className="w-24 h-24 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#25D366]" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2 22l5.25-1.38A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.61 0-3.13-.47-4.4-1.28l-.31-.19-3.11.82.83-3.03-.2-.32A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-gray-700 mb-2">Robotec Chat</h2>
            <p className="text-gray-500 max-w-sm text-sm">
              Send and receive messages without keeping your phone online.
              <br />
              Select a chat to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
