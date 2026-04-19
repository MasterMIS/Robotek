import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchAllParties() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await client.models.Party.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);
  return allRecords;
}

export async function GET() {
  try {
    const parties = await fetchAllParties();
    return NextResponse.json(parties, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
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
