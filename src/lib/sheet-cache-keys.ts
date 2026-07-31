import { globalCache } from "./cache";

const USERS_CACHE_KEY = "all_users";
const USERS_CACHE_TTL = 3 * 60 * 1000;

export function invalidateUsersCache(): void {
  globalCache.delete(USERS_CACHE_KEY);
}

export function getUsersCacheKey(): string {
  return USERS_CACHE_KEY;
}

export function getUsersCacheTtl(): number {
  return USERS_CACHE_TTL;
}

export function invalidateChatUsersCache(username?: string): void {
  if (username) {
    globalCache.delete(`chat_users_${username}`);
    globalCache.delete(`sidebar_badges_${username}`);
    return;
  }
  globalCache.invalidatePrefix("chat_users_");
  globalCache.invalidatePrefix("sidebar_badges_");
}

export function invalidateDashboardCache(): void {
  globalCache.invalidatePrefix("dashboard_");
}

export function invalidateLeavePendingCache(): void {
  globalCache.delete("leave_pending_count");
}
