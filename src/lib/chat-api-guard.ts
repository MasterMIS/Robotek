import { NextResponse } from "next/server";
import { CHAT_BACKEND_ENABLED, CHAT_DISABLED_MESSAGE } from "@/lib/chat-config";

export function chatApiDisabledResponse() {
  if (CHAT_BACKEND_ENABLED) return null;
  return NextResponse.json({ error: CHAT_DISABLED_MESSAGE }, { status: 503 });
}
