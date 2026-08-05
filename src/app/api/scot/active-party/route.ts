import { NextResponse } from "next/server";
import { getActivePartyData, updateActivePartyData } from "@/lib/scot-sheets";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const source = (searchParams.get("source") as "scot" | "scot-kb") || "scot";

    const data = await getActivePartyData(source);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/scot/active-party error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { partyName, active, source } = await req.json();

    if (!partyName || active === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing partyName or active" },
        { status: 400 }
      );
    }

    const sheetSource = source === "scot-kb" ? "scot-kb" : "scot";
    await updateActivePartyData(partyName, Boolean(active), sheetSource);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/scot/active-party error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
