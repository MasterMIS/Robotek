import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { IMS } from "@/types/ims";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchAllIMSItems() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const response: any = await client.models.IMSItem.list({
      nextToken,
      limit: 1000
    });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);

  return allRecords;
}

export async function GET(request: NextRequest) {
  try {
    const items = await fetchAllIMSItems();
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error("Error fetching IMS items:", error);
    return NextResponse.json({ error: "Failed to fetch IMS items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const id = data.id || `IMS-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const { errors } = await client.models.IMSItem.create({
        ...data,
        id,
        created_at: data.created_at || timestamp,
        updated_at: timestamp
    });

    if (errors) {
        console.error("Amplify Create Error:", errors);
        return NextResponse.json({ error: "Failed to add IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding IMS item:", error);
    return NextResponse.json({ error: "Failed to add IMS item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: IMS = await request.json();
    const timestamp = new Date().toISOString();
    
    // Remove internal fields if present
    const { id, createdAt, updatedAt, ...updateRest } = data as any;
    
    const { errors } = await client.models.IMSItem.update({
        id: data.id,
        ...updateRest,
        updated_at: timestamp
    });

    if (errors) {
        console.error("Amplify Update Error:", errors);
        return NextResponse.json({ error: "Failed to update IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating IMS item:", error);
    return NextResponse.json({ error: "Failed to update IMS item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { errors } = await client.models.IMSItem.delete({ id });
    
    if (errors) {
        console.error("Amplify Delete Error:", errors);
        return NextResponse.json({ error: "Failed to delete IMS item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting IMS item:", error);
    return NextResponse.json({ error: "Failed to delete IMS item" }, { status: 500 });
  }
}
