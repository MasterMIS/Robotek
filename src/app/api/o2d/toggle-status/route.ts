import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function POST(req: NextRequest) {
  try {
    const { orderNo, action, value } = await req.json();

    if (!orderNo || !action || (action !== "hold" && action !== "cancelled")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 1. Find all records with this orderNo
    let allMatching: any[] = [];
    let nextToken: string | null | undefined = undefined;
    do {
      const response: any = await client.models.O2DRecord.list({
        filter: { order_no: { eq: orderNo } },
        nextToken
      });
      allMatching = [...allMatching, ...response.data];
      nextToken = response.nextToken;
    } while (nextToken);

    if (allMatching.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Update all matching records
    const timestamp = value ? new Date().toISOString() : "";
    
    await Promise.all(allMatching.map(item => 
      client.models.O2DRecord.update({
        id: item.id,
        [action]: timestamp,
        updated_at: new Date().toISOString()
      })
    ));

    return NextResponse.json({ message: `Order ${action} state updated successfully` });
  } catch (error: any) {
    console.error("Status Toggle API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
