import { format, isToday, isYesterday } from "date-fns";

/** Message bubble time — e.g. "11:00 pm" */
export function formatMessageTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a").toLowerCase();
}

/** Sidebar chat list time */
export function formatSidebarChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a").toLowerCase();
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yyyy");
}

/** Recording timer — e.g. "0:05" */
export function formatRecordingDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
