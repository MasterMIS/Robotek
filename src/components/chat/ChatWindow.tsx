"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ForwardModal from "./ForwardModal";
import { UserCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon, ArrowDownTrayIcon, DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { getDriveImageUrl } from "@/lib/drive-utils";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url: string;
  read_by?: string;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string; // This is the partner's username
  currentUsername: string;
  onBack?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper for gradient background color based on username
function getAvatarGradient(username: string) {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-purple-500 to-fuchsia-600",
    "from-cyan-500 to-blue-600"
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function ChatWindow({ chatId, currentUsername, onBack }: ChatWindowProps) {
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  // Fetch messages between current user and the partner (chatId)
  const { data: messages, mutate } = useSWR<ChatMessage[]>(`/api/chat/messages?chatId=${chatId}`, fetcher, {
    refreshInterval: 3000, // Faster refresh for simple messenger
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();

    // Mark messages as read if there are any unread messages from partner
    if (messages && messages.length > 0) {
      const hasUnread = messages.some(
        (m) => m.sender_id === chatId && m.receiver_id === currentUsername && !(m.read_by || "").includes(currentUsername)
      );

      if (hasUnread) {
        fetch("/api/chat/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerId: chatId })
        }).then(res => {
          if (res.ok) mutate();
        }).catch(err => console.error("Failed to mark read:", err));
      }
    }
  }, [messages, chatId, currentUsername, mutate]);

  const handleSendMessage = async (text: string, type: "text"|"image"|"file"|"audio", mediaUrl?: string) => {
    if (!text.trim() && type === "text") return;
    setIsSending(true);

    try {
      const tempId = `temp-${Date.now()}`;
      mutate(
        currentMessages => [
          ...(currentMessages || []),
          {
            id: tempId,
            sender_id: currentUsername,
            receiver_id: chatId,
            text,
            type,
            media_url: mediaUrl || "",
            created_at: new Date().toISOString(),
          } as ChatMessage
        ],
        false
      );

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId, // This is receiver_id
          text,
          type,
          media_url: mediaUrl,
        }),
      });

      if (res.ok) {
        mutate();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleForwardMessage = async (selectedUsernames: string[], msgToForward: ChatMessage) => {
    try {
      const promises = selectedUsernames.map(async (username) => {
        if (username === chatId) {
          const tempId = `temp-fwd-${Date.now()}-${Math.random()}`;
          mutate(
            currentMessages => [
              ...(currentMessages || []),
              {
                id: tempId,
                sender_id: currentUsername,
                receiver_id: chatId,
                text: msgToForward.text,
                type: msgToForward.type,
                media_url: msgToForward.media_url || "",
                created_at: new Date().toISOString(),
              } as ChatMessage
            ],
            false
          );
        }

        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: username,
            text: msgToForward.text,
            type: msgToForward.type,
            media_url: msgToForward.media_url,
          }),
        });

        if (!res.ok) {
           console.error(`Failed to forward to ${username}`);
        }
      });

      await Promise.all(promises);
      
      if (selectedUsernames.includes(chatId)) {
         mutate();
      }
    } catch (err) {
      console.error("Error forwarding messages", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#FEF5E7] via-[#fdfaf5] to-[#FCE4EC] md:rounded-br-[24px] transition-colors duration-500">
      
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#001F3F] shadow-sm sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 mr-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-sm bg-gradient-to-br ${getAvatarGradient(chatId)}`}>
            {chatId.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">{chatId}</h3>
          </div>
        </div>
        <button className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <InformationCircleIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Messages Area Container */}
      <div className="flex-1 relative flex flex-col overflow-hidden z-0">
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-2 relative z-0"
        >

        {!messages ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/40 opacity-70">
            <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
               </svg>
            </div>
            <p className="text-sm font-medium">No messages with {chatId} yet.</p>
            <p className="text-xs mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === currentUsername;
            const showTail = index === messages.length - 1 || messages[index + 1].sender_id !== msg.sender_id;
            
            return (
              <MessageBubble
                key={msg.id}
                message={msg as any}
                isOwn={isOwn}
                showTail={showTail}
                onImageClick={(url) => setPreviewMediaUrl(url)}
                onForwardClick={(msgToForward) => setForwardingMessage(msgToForward as any)}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Image Preview Modal */}
        {previewMediaUrl && (
          <div 
            className="absolute inset-0 z-[100] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 transition-opacity"
            onClick={() => setPreviewMediaUrl(null)}
          >
            {/* Top Bar with Close Button */}
            <div className="w-full flex justify-end flex-shrink-0 mb-4 h-12">
              <button 
                onClick={() => setPreviewMediaUrl(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors bg-white/10 backdrop-blur-md rounded-full shadow-lg"
              >
                <XMarkIcon className="w-6 h-6 md:w-8 md:h-8 font-bold" />
              </button>
            </div>

            {/* Image Wrapper - Takes maximum remaining space but shrinks to fit */}
            <div 
              className="flex-1 min-h-0 w-full flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={getDriveImageUrl(previewMediaUrl)}
                alt="Preview"
                className="max-h-full max-w-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
              />
            </div>

            {/* Bottom Actions */}
            <div 
              className="flex flex-shrink-0 flex-wrap items-center justify-center gap-4 w-full pt-4 pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(`/api/drive-proxy?id=${previewMediaUrl}`);
                    if (!response.ok) throw new Error("Proxy fetch failed");
                    const blob = await response.blob();
                    await navigator.clipboard.write([
                      new ClipboardItem({ [blob.type]: blob })
                    ]);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  } catch (err) {
                    console.error("Failed to copy image to clipboard:", err);
                    navigator.clipboard.writeText(`https://drive.google.com/file/d/${previewMediaUrl}/view`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                }}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold shadow-lg transition-all backdrop-blur-md border border-white/10 active:scale-95"
              >
                {isCopied ? (
                  <>
                    <CheckIcon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-5 h-5" />
                    <span>Copy Image</span>
                  </>
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://drive.google.com/uc?export=download&id=${previewMediaUrl}`, '_blank');
                }}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all active:scale-95 border border-blue-400/20"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardMessage}
        />
      )}

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
