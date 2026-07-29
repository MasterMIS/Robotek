import type { ChatMessage } from "@/types/chat";

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  messages: ChatMessage[];
  fetchedAt: number;
}

const conversationCache = new Map<string, CacheEntry>();

function cacheKey(currentUser: string, chatId: string): string {
  return `${currentUser}:${chatId}`;
}

export function getCachedMessages(currentUser: string, chatId: string): ChatMessage[] | null {
  const entry = conversationCache.get(cacheKey(currentUser, chatId));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    conversationCache.delete(cacheKey(currentUser, chatId));
    return null;
  }
  return entry.messages;
}

export function setCachedMessages(currentUser: string, chatId: string, messages: ChatMessage[]): void {
  conversationCache.set(cacheKey(currentUser, chatId), {
    messages,
    fetchedAt: Date.now(),
  });
}

export function appendCachedMessage(currentUser: string, chatId: string, message: ChatMessage): void {
  const key = cacheKey(currentUser, chatId);
  const entry = conversationCache.get(key);
  if (entry) {
    entry.messages = [...entry.messages, message];
    entry.fetchedAt = Date.now();
  }
}

export function updateCachedMessage(currentUser: string, chatId: string, message: ChatMessage): void {
  const key = cacheKey(currentUser, chatId);
  const entry = conversationCache.get(key);
  if (entry) {
    entry.messages = entry.messages.map((m) => (m.id === message.id ? message : m));
    entry.fetchedAt = Date.now();
  }
}

export function invalidateConversationCache(currentUser?: string, chatId?: string): void {
  if (currentUser && chatId) {
    conversationCache.delete(cacheKey(currentUser, chatId));
    return;
  }
  conversationCache.clear();
}
