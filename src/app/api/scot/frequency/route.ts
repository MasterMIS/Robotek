import { NextResponse } from "next/server";
import { getFrequencyData, updateFrequencyData } from "@/lib/scot-sheets";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const source = (searchParams.get('source') as "scot" | "scot-kb") || "scot-kb";

    const data = await getFrequencyData(source);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/scot/frequency error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { partyName, frequency, source } = await req.json();
    
    if (!partyName || frequency === undefined) {
      return NextResponse.json({ success: false, error: "Missing partyName or frequency" }, { status: 400 });
    }

    const sheetSource = source === "scot" ? "scot" : "scot-kb";
    await updateFrequencyData(partyName, frequency.toString(), sheetSource);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/scot/frequency error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
