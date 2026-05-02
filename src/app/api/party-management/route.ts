import { NextRequest, NextResponse } from "next/server";
import { getParties, addParty, updateParty, deleteParty } from "@/lib/party-management-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = (searchParams.get("search") || "").toLowerCase();

    const allParties = await getParties();
    
    let filtered = allParties;
    if (search) {
      filtered = allParties.filter(p => 
        p.partyName?.toLowerCase().includes(search) ||
        p.salePersonName?.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginatedData = filtered.slice(start, start + limit);

    return NextResponse.json({
      data: paginatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error("GET Parties Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch parties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `PARTY-${Date.now()}`;
    const timestamp = new Date().toISOString();

    await addParty({
      ...body,
      id,
      timestamp: body.timestamp || timestamp
    });

    return NextResponse.json({ message: "Party added successfully" });
  } catch (error: any) {
    console.error("POST Party Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await updateParty(id, body);

    return NextResponse.json({ message: "Party updated successfully" });
  } catch (error: any) {
    console.error("PUT Party Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await deleteParty(id);

    return NextResponse.json({ message: "Party deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Party Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
