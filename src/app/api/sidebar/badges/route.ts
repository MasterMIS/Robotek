import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { globalCache } from "@/lib/cache";
import { leaveRequestService } from "@/lib/leave-sheets";

export const dynamic = "force-dynamic";

const BADGES_CACHE_TTL = 2 * 60 * 1000;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = (session.user as { username?: string }).username as string;
    const cacheKey = `sidebar_badges_v2_${username}`;
    const cached = globalCache.get<{ pendingLeaveCount: number; chatUnreadCount: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, chatUnreadCount: 0 });
    }

    const leaves = await leaveRequestService.getAll();

    const payload = {
      pendingLeaveCount: leaves.filter((l) => (l.status || "").toLowerCase() === "pending").length,
      chatUnreadCount: 0,
    };

    globalCache.set(cacheKey, payload, BADGES_CACHE_TTL);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Sidebar badges API error:", error);
    return NextResponse.json({ error: "Failed to fetch sidebar badges" }, { status: 500 });
  }
}
