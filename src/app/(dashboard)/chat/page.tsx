"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { CHAT_DISABLED_MESSAGE } from "@/lib/chat-config";

export default function ChatPage() {
  return (
    <div
      className="h-[calc(100vh-8rem)] min-h-[500px] flex items-center justify-center rounded-lg border border-gray-200 bg-[#F0F2F5] p-8"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }}
    >
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#25D366]/10">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-[#25D366]" />
        </div>
        <h2 className="mb-2 text-2xl font-light text-gray-700">Chat Temporarily Unavailable</h2>
        <p className="text-sm leading-relaxed text-gray-500">{CHAT_DISABLED_MESSAGE}</p>
      </div>
    </div>
  );
}
