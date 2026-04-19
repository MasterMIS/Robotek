import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

// Configure Amplify for Server-side
Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET() {
  try {
    let allDropdowns: any[] = [];
    let nextToken: string | null | undefined = null;

    do {
      const result: any = await client.models.Dropdown.list({
        nextToken: nextToken,
        limit: 1000
      });
      
      if (result.errors) throw new Error(result.errors[0].message);
      
      allDropdowns = [...allDropdowns, ...result.data];
      nextToken = result.nextToken;
    } while (nextToken);

    const data = {
      departments: allDropdowns.filter(d => d.type === 'department').map(d => d.value),
      designations: allDropdowns.filter(d => d.type === 'designation').map(d => d.value),
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("AWS GET Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    
    if (!type || !value) {
      return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
    }

    const { data: newOption, errors } = await client.models.Dropdown.create({ type, value });
    if (errors) throw new Error(errors[0].message);

    return NextResponse.json({ message: "Option added successfully to AWS", option: newOption });
  } catch (error: any) {
    console.error("AWS POST Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
