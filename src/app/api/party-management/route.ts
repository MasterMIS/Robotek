import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchParties(page: number, limit: number, search: string) {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  
  // If we have a search, we should filter at the source if possible
  // For now, let's fetch in chunks until we have enough for the requested page
  // This is a hybrid approach since DynamoDB pagination is cursor-based, not offset-based
  
  let currentCount = 0;
  let targetStart = (page - 1) * limit;
  let targetEnd = targetStart + limit;

  do {
    const response: any = await client.models.Party.list({ 
      nextToken, 
      limit: 1000,
      filter: search ? {
        partyName: { contains: search }
      } : undefined
    });
    
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
    
    if (allRecords.length >= targetEnd && !search) break; // Optimization if no search
  } while (nextToken);

  const total = allRecords.length;
  const paginatedData = allRecords.slice(targetStart, targetEnd);

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";

    const result = await fetchParties(page, limit, search);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch parties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `PARTY-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const { errors } = await client.models.Party.create({
      ...body,
      id,
      created_at: body.created_at || timestamp,
      updated_at: timestamp
    });

    if (errors) {
      console.error("Amplify Create Error:", errors);
      return NextResponse.json({ error: "Failed to add party" }, { status: 500 });
    }

    return NextResponse.json({ message: "Party added successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const timestamp = new Date().toISOString();
    const { id, createdAt, updatedAt, ...rest } = body;

    const { errors } = await client.models.Party.update({
      id: body.id,
      ...rest,
      updated_at: timestamp
    });

    if (errors) {
      console.error("Amplify Update Error:", errors);
      return NextResponse.json({ error: "Failed to update party" }, { status: 500 });
    }

    return NextResponse.json({ message: "Party updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const { errors } = await client.models.Party.delete({ id });

    if (errors) {
      console.error("Amplify Delete Error:", errors);
      return NextResponse.json({ error: "Failed to delete party" }, { status: 500 });
    }

    return NextResponse.json({ message: "Party deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
