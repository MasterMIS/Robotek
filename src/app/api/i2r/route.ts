import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';
import { I2R } from "@/types/i2r";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper: Fetch ALL records from DynamoDB using nextToken iteration
async function fetchAllI2RRecords() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const response: any = await client.models.I2RRecord.list({
      nextToken,
      limit: 1000 // Maximize per-page fetch
    });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);

  return allRecords;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "next-indent") {
      const allRecords = await fetchAllI2RRecords();
      let maxIndent = 0;
      for (const item of allRecords) {
        if (item.indent_no) {
          const num = parseInt(item.indent_no.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxIndent) {
            maxIndent = num;
          }
        }
      }
      return NextResponse.json({ indentNum: `IND-${maxIndent + 1}` });
    }

    const items = await fetchAllI2RRecords();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching I2R items:", error);
    return NextResponse.json(
      { error: "Failed to fetch I2R items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if ID exists, else generate one
    const id = data.id || `I2R-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const { errors } = await client.models.I2RRecord.create({
        ...data,
        id,
        created_at: data.created_at || timestamp,
        updated_at: timestamp
    });

    if (errors) {
        console.error("Amplify Create Error:", errors);
        return NextResponse.json({ error: "Failed to add I2R item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding I2R item:", error);
    return NextResponse.json(
      { error: "Failed to add I2R item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: I2R = await request.json();
    const timestamp = new Date().toISOString();
    
    const { id, createdAt, updatedAt, ...updateRest } = data as any;
    
    const { errors } = await client.models.I2RRecord.update({
        id: data.id,
        ...updateRest,
        updated_at: timestamp
    });

    if (errors) {
        console.error("Amplify Update Error:", errors);
        return NextResponse.json({ error: "Failed to update I2R item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating I2R item:", error);
    return NextResponse.json(
      { error: "Failed to update I2R item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { errors } = await client.models.I2RRecord.delete({ id });
    
    if (errors) {
        console.error("Amplify Delete Error:", errors);
        return NextResponse.json({ error: "Failed to delete I2R item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting I2R item:", error);
    return NextResponse.json(
      { error: "Failed to delete I2R item" },
      { status: 500 }
    );
  }
}
