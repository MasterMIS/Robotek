import { NextRequest, NextResponse } from "next/server";
import { getDropdownData, addDropdownOption } from "@/lib/google-sheets";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getDropdownData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    
    if (!type || !value) {
      return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
    }

    const success = await addDropdownOption(type, value);
    if (!success) throw new Error("Failed to add option to Sheets");

    return NextResponse.json({ message: "Option added successfully" });
  } catch (error: any) {
    console.error("POST Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
