import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Cleanup body to match O2DRecord fields if necessary, though update is permissive
    const { id: _, createdAt, updatedAt, ...updateData } = body;

    const { data, errors } = await client.models.O2DRecord.update({
      id,
      ...updateData,
      updated_at: new Date().toISOString()
    });

    if (data && !errors) {
      return NextResponse.json({ message: "O2D record updated successfully" });
    } else {
      console.error("Amplify Update Errors:", errors);
      return NextResponse.json({ error: "Failed to update O2D" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: record } = await client.models.O2DRecord.get({ id });
    if (!record) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const { errors } = await client.models.O2DRecord.delete({ id });
    
    if (!errors) {
      return NextResponse.json({ message: "O2D record deleted successfully" });
    } else {
      console.error("Amplify Delete Errors:", errors);
      return NextResponse.json({ error: "Failed to delete O2D" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
