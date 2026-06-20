import { NextResponse } from "next/server";
import { getFrequencyData, updateFrequencyData } from "@/lib/scot-sheets";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await getFrequencyData();
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

    const { partyName, frequency } = await req.json();
    
    if (!partyName || frequency === undefined) {
      return NextResponse.json({ success: false, error: "Missing partyName or frequency" }, { status: 400 });
    }

    await updateFrequencyData(partyName, frequency.toString());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/scot/frequency error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
