import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
import { Schema } from '@/../amplify/data/resource';

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const contentType = req.headers.get("content-type") || "";
    
    let updatedItems: any[] = [];
    let screenshotUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      updatedItems = JSON.parse(formData.get("o2dData") as string) as any[];
      const screenshotFile = formData.get("order_screenshot") as File;

      if (screenshotFile && screenshotFile.size > 0) {
        const path = `o2d/${Date.now()}-${screenshotFile.name}`;
        await uploadData({
          path,
          data: await screenshotFile.arrayBuffer(),
          options: { contentType: screenshotFile.type }
        }).result;
        screenshotUrl = path;
      } else {
        // Keep existing screenshot if not provided
        screenshotUrl = updatedItems[0]?.order_screenshot || "";
      }
    } else {
      updatedItems = await req.json();
      screenshotUrl = updatedItems[0]?.order_screenshot || "";
    }

    // 1. Get existing records for this order to handle deletions/updates
    let existingRecords: any[] = [];
    let nextToken: string | null | undefined = undefined;
    do {
      const response: any = await client.models.O2DRecord.list({
        filter: { order_no: { eq: orderNo } },
        nextToken
      });
      existingRecords = [...existingRecords, ...response.data];
      nextToken = response.nextToken;
    } while (nextToken);

    const existingIds = new Set(existingRecords.map(r => r.id));
    const incomingIds = new Set(updatedItems.map(r => r.id).filter(id => !!id));

    // 2. Perform updates and creations
    await Promise.all(updatedItems.map(item => {
      const itemData = {
        ...item,
        order_screenshot: screenshotUrl,
        updated_at: new Date().toISOString()
      };

      if (item.id && existingIds.has(item.id)) {
        const { id, createdAt, updatedAt, ...updateRest } = itemData;
        return client.models.O2DRecord.update({ id, ...updateRest });
      } else {
        return client.models.O2DRecord.create({
            ...itemData,
            id: item.id || `O2D-${Date.now()}-${Math.random()}`,
            created_at: new Date().toISOString()
        });
      }
    }));

    // 3. Perform deletions for items no longer in the list
    const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
    await Promise.all(idsToDelete.map(id => client.models.O2DRecord.delete({ id })));

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    
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

    // 2. Delete all matching records
    await Promise.all(allMatching.map(item => client.models.O2DRecord.delete({ id: item.id })));

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
