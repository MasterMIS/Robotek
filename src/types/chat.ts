export type ChatMessageType = "text" | "image" | "file" | "audio";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: ChatMessageType;
  media_url: string;
  read_by: string;
  created_at: string;
  updated_at?: string;
  reply_to_id?: string;
  edited_at?: string;
  is_deleted?: string;
  reactions?: string;
  forwarded_from?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  participants: string;
  admins: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  avatar_url?: string;
  description?: string;
  last_message_at?: string;
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface TypingEvent {
  chatId: string;
  username: string;
}

export interface PresenceEvent {
  username: string;
  online: boolean;
  last_active?: string;
}
