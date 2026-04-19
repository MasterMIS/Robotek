import { NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchAllMeetings() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await client.models.SchedulerMeeting.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);
  return allRecords;
}

export async function GET() {
  try {
    const meetings = await fetchAllMeetings();
    return NextResponse.json(meetings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const timestamp = new Date().toISOString();
    const newMeeting = {
      ...data,
      id: data.id || uuidv4(),
      created_by: (session.user as any).username || session.user.email,
      created_at: data.created_at || timestamp,
      updated_at: timestamp
    };

    const { errors } = await client.models.SchedulerMeeting.create(newMeeting);
    if (errors) {
      console.error("Amplify Create Error:", errors);
      return NextResponse.json({ error: "Failed to add meeting" }, { status: 500 });
    }

    return NextResponse.json(newMeeting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add meeting" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const { id, createdAt, updatedAt, ...rest } = data;

    const { errors } = await client.models.SchedulerMeeting.update({
      id: data.id,
      ...rest,
      updated_at: new Date().toISOString()
    });

    if (errors) {
      console.error("Amplify Update Error:", errors);
      return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const { errors } = await client.models.SchedulerMeeting.delete({ id });
    if (errors) {
      console.error("Amplify Delete Error:", errors);
      return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete meeting" }, { status: 500 });
  }
}
