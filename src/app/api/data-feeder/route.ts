import { NextRequest, NextResponse } from "next/server";
import { getDataFeeder, addDataFeeder, updateDataFeeder, deleteDataFeeder } from "@/lib/data-feeder-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = (searchParams.get("search") || "").toLowerCase();

    const allItems = await getDataFeeder();
    
    let filtered = allItems;
    if (search) {
      filtered = allItems.filter(p => 
        p.employeeName?.toLowerCase().includes(search) ||
        p.toName?.toLowerCase().includes(search) ||
        p.toNumber?.toLowerCase().includes(search)
      );
    }

    // Sort by ID descending (latest first) if id is number, otherwise string compare
    filtered.sort((a, b) => {
      const aN = parseInt(String(a.id));
      const bN = parseInt(String(b.id));
      if (!isNaN(aN) && !isNaN(bN)) return bN - aN;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });

    const total = filtered.length;
    
    let responseData;
    if (limit === -1) {
      responseData = filtered;
    } else {
      const start = (page - 1) * limit;
      responseData = filtered.slice(start, start + limit);
    }

    return NextResponse.json({
      data: responseData,
      total,
      page,
      limit,
      totalPages: limit === -1 ? 1 : Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error("GET Data Feeder Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch data feeder records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const allItems = await getDataFeeder();
    
    // Generate sequential ID
    let newId = "1";
    if (allItems.length > 0) {
      const ids = allItems.map(p => parseInt(String(p.id))).filter(id => !isNaN(id));
      if (ids.length > 0) {
        newId = (Math.max(...ids) + 1).toString();
      } else {
        newId = (allItems.length + 1).toString();
      }
    }
    
    const timestamp = new Date().toISOString();

    await addDataFeeder({
      ...body,
      id: newId,
      timestamp: body.timestamp || timestamp
    });

    return NextResponse.json({ message: "Data Feeder record added successfully", id: newId });
  } catch (error: any) {
    console.error("POST Data Feeder Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await updateDataFeeder(id, body);

    return NextResponse.json({ message: "Data Feeder record updated successfully" });
  } catch (error: any) {
    console.error("PUT Data Feeder Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await deleteDataFeeder(id);

    return NextResponse.json({ message: "Data Feeder record deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Data Feeder Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
