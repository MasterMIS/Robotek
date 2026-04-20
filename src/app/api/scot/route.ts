// --- DRY RUN ENDPOINT FOR O2D MIGRATION ---
export async function POST_DRY_RUN(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { records } = body;
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Fetch all current O2D records from DynamoDB
    const allO2D = await fetchAll(client.models.O2DRecord);
    const o2dById = Object.fromEntries(allO2D.map((r: any) => [r.id, r]));

    // Fields to check for changes
    const fieldsToCheck = [
      "created_at",
      "updated_at",
      "num_of_parcel_5",
      "upload_pi_5",
      "actual_date_of_order_packed_5",
      "planned_6",
      "acual_6",
      "status_6"
    ];

    // Map Google Sheet columns to DynamoDB field names
    function mapFields(record: any) {
      return {
        ...record,
        num_of_parcel_5: record.Num_of_Parcel_5,
        upload_pi_5: record.Upoad_PI_Attachment_5,
        actual_date_of_order_packed_5: record.Actual_Date_of_Order_Packed_5,
        planned_6: record.Planned_6,
        acual_6: record.Actual_6,
        status_6: record.Status_6
      };
    }

    const preview = records.map((rec: any) => {
      const mapped = mapFields(rec);
      const db = o2dById[mapped.id];
      if (!db) return { id: mapped.id, error: "Not found in DB" };
      const changes: any = { id: mapped.id };
      fieldsToCheck.forEach(field => {
        if (
          mapped[field] !== undefined &&
          mapped[field] !== null &&
          mapped[field] !== db[field]
        ) {
          changes[field] = { old: db[field], new: mapped[field] };
        }
      });
      // Only return if there are changes
      if (Object.keys(changes).length > 1) return changes;
      return null;
    }).filter(Boolean);

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error("O2D Dry Run Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { auth } from '@/auth';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---- Helpers ----

async function fetchAll<T>(model: any): Promise<any[]> {
  let all: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await model.list({ nextToken, limit: 1000 });
    all = [...all, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);
  return all;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'feeder';
  const skipO2D = searchParams.get('skipO2D') === 'true';

  try {
    if (tab === 'calls' || tab === 'lost') {
      const [allCalls, allFollowUps, allO2Ds] = await Promise.all([
        fetchAll(client.models.CallRecord),
        fetchAll(client.models.FollowUpRecord),
        skipO2D ? Promise.resolve([]) : fetchAll(client.models.O2DRecord)
      ]);

      // Latest follow-up per party
      const latestFollowUps = allFollowUps.reduce((acc: any, curr: any) => {
        const existing = acc[curr.partyName];
        if (!existing || new Date(curr.createdAt) > new Date(existing.createdAt)) {
          acc[curr.partyName] = curr;
        }
        return acc;
      }, {} as Record<string, any>);

      const mergedData = allCalls.map(call => {
        const latest = latestFollowUps[call.partyName];
        const partyO2Ds = allO2Ds.filter(o =>
          o.party_name?.trim().toLowerCase() === call.partyName?.trim().toLowerCase()
        );

        let dynamicMetrics: any = {};
        if (partyO2Ds.length > 0) {
          const uniqueOrderNos = [...new Set(partyO2Ds.map((o: any) => (o.order_no || '').trim()).filter(Boolean))];
          const totalAmt = partyO2Ds.reduce((sum: number, o: any) => {
            const amt = parseFloat(String(o.est_amount || "0").replace(/[^0-9.]/g, ''));
            return sum + (isNaN(amt) ? 0 : amt);
          }, 0);

          const monthOrderSets: Record<string, Set<string>> = {};
          partyO2Ds.forEach((o: any) => {
            const orderNo = (o.order_no || '').trim();
            if (!orderNo) return;
            const d = new Date(o.created_at);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!monthOrderSets[key]) monthOrderSets[key] = new Set();
            monthOrderSets[key].add(orderNo);
          });

          const monthlyUniqueCounts = Object.values(monthOrderSets).map(s => s.size);
          const calcMonthly = monthlyUniqueCounts.length > 0
            ? monthlyUniqueCounts.reduce((a, b) => a + b, 0) / monthlyUniqueCounts.length
            : 0;

          const orderFirstDates = (uniqueOrderNos as string[])
            .map(no => {
              const rows = partyO2Ds.filter((o: any) => (o.order_no || '').trim() === no);
              const dates = rows.map((o: any) => new Date(o.created_at)).filter(d => !isNaN(d.getTime()));
              return dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
            })
            .filter(Boolean) as Date[];
          orderFirstDates.sort((a, b) => a.getTime() - b.getTime());

          const gaps = orderFirstDates.map((d, i) =>
            i > 0 ? (d.getTime() - orderFirstDates[i-1].getTime()) / (1000 * 60 * 60 * 24) : null
          ).filter(g => g !== null) as number[];

          const lastOrderDate = orderFirstDates.length > 0
            ? orderFirstDates[orderFirstDates.length - 1].toISOString().split('T')[0]
            : "";

          const calcOrderSize = uniqueOrderNos.length > 0 ? totalAmt / uniqueOrderNos.length : 0;
          const calcFreq = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

          dynamicMetrics = {
            averageOrderSize: calcOrderSize > 0 ? calcOrderSize.toFixed(2) : call.averageOrderSize,
            usuallyNoOfOrderMonthly: calcMonthly > 0 ? Math.round(calcMonthly).toString() : call.usuallyNoOfOrderMonthly,
            frequencyOfCallingAfterOrderPlaced: calcFreq > 0 ? calcFreq.toFixed(0) : call.frequencyOfCallingAfterOrderPlaced,
            lastOrderDate,
            isAvgDynamic: calcOrderSize > 0,
            isMonthlyDynamic: calcMonthly > 0,
            isFreqDynamic: calcFreq > 0,
            isDynamic: true
          };
        }

        return {
          ...call,
          ...dynamicMetrics,
          latestStatus: latest?.status || "Pending",
          latestNextDate: latest?.nextFollowUpDate || "",
          followUpHistoryCount: allFollowUps.filter(f => f.partyName === call.partyName).length
        };
      });

      if (tab === 'calls') return NextResponse.json(mergedData.filter(c => c.latestStatus !== 'Order Lost'));
      if (tab === 'lost') return NextResponse.json(mergedData.filter(c => c.latestStatus === 'Order Lost'));
      return NextResponse.json(mergedData);
    }

    // Default: feeder / scot records
    const scotRecords = await fetchAll(client.models.ScotRecord);
    return NextResponse.json(scotRecords);

  } catch (error: any) {
    console.error("Scot GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const timestamp = new Date().toISOString();

    if (body.type === 'party') {
      const id = body.data?.id || `CALL-${Date.now()}`;
      const { errors } = await client.models.CallRecord.create({
        ...body.data,
        id,
        created_at: timestamp,
        updated_at: timestamp
      });
      if (errors) return NextResponse.json({ error: "Failed to add party" }, { status: 500 });
      return NextResponse.json({ message: "Party added successfully" });
    }

    // Bulk records import
    const { records } = body;
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await Promise.all(chunk.map((record: any) => {
        // Map Google Sheet columns to DynamoDB field names
        const {
          Num_of_Parcel_5,
          Upoad_PI_Attachment_5,
          Actual_Date_of_Order_Packed_5,
          Planned_6,
          Actual_6,
          Status_6,
          ...rest
        } = record;
        return client.models.ScotRecord.create({
          ...rest,
          num_of_parcel_5: Num_of_Parcel_5,
          upload_pi_5: Upoad_PI_Attachment_5,
          actual_date_of_order_packed_5: Actual_Date_of_Order_Packed_5,
          planned_6: Planned_6,
          acual_6: Actual_6,
          status_6: Status_6,
          id: record.id || `SCOT-${Date.now()}-${Math.random()}`,
          created_at: record.created_at || timestamp,
          updated_at: timestamp
        });
      }));
    }

    return NextResponse.json({ message: "Data imported successfully" });
  } catch (error: any) {
    console.error("Scot POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const partyName = searchParams.get('partyName');
    const tab = searchParams.get('tab');

    if (!partyName || tab !== 'calls') {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    // Find the record by partyName
    const allCalls = await fetchAll(client.models.CallRecord);
    const record = allCalls.find(c => c.partyName === partyName);
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const data = await req.json();
    const { id, createdAt, updatedAt, ...rest } = data;

    const { errors } = await client.models.CallRecord.update({
      id: record.id,
      ...rest,
      updated_at: new Date().toISOString()
    });

    if (errors) {
      console.error("Amplify Update Error:", errors);
      return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
    }

    return NextResponse.json({ message: "Record updated successfully" });
  } catch (error: any) {
    console.error("Scot PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
