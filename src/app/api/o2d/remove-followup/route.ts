import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function POST(req: NextRequest) {
  try {
    const { orderNo, startStep, onlyThisStep } = await req.json();
    
    if (!orderNo || typeof startStep !== 'number') {
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

    // 2. Clear data for specified steps
    await Promise.all(allMatching.map(item => {
      const updateData: any = { id: item.id, updated_at: new Date().toISOString() };
      
      const maxStep = 11;
      const endStep = onlyThisStep ? startStep : maxStep;
      
      for (let i = startStep; i <= endStep; i++) {
        updateData[`planned_${i}`] = "";
        updateData[`actual_${i}`] = "";
        updateData[`status_${i}`] = "";
        
        // Clear step-specific fields if applicable
        if (i === 1) {
            updateData.final_amount_1 = "";
            updateData.so_number_1 = "";
            updateData.merge_order_with_1 = "";
            updateData.upload_so_1 = "";
        }
        if (i === 5) {
            updateData.num_of_parcel_5 = "";
            updateData.upload_pi_5 = "";
            updateData.actual_date_of_order_packed_5 = "";
        }
        if (i === 7) updateData.voucher_num_7 = "";
        if (i === 8) {
            updateData.order_details_checked_8 = "";
            updateData.voucher_num_51_8 = "";
            updateData.t_amt_8 = "";
        }
        if (i === 9) {
            updateData.attach_bilty_9 = "";
            updateData.num_of_parcel_9 = "";
        }
      }
      
      return client.models.O2DRecord.update(updateData);
    }));
    
    return NextResponse.json({ message: "Follow-up removed successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
