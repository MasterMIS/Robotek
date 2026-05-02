import { NextRequest, NextResponse } from "next/server";
import { getO2DSummary } from "@/lib/o2d-sheets";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = (session?.user as any)?.username || "";
    const userRole = (session?.user as any)?.role || "User";

    const summary = await getO2DSummary(currentUser, userRole);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error fetching O2D summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
