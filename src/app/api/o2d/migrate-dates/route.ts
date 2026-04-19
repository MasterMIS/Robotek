import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { auth } from "@/auth";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';
import { o2dService } from "@/lib/o2d-sheets";

Amplify.configure(outputs);
const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Security: only ADMIN can run migration
  const session = await auth();
  const userRole = (session?.user as any)?.role || "User";
  if (userRole.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry_run") === "true";

  try {
    // 1. Fetch all records from Google Sheets (source of truth for dates)
    console.log("[Migration] Fetching all records from Google Sheets...");
    const sheetRecords = await o2dService.getAll();
    console.log(`[Migration] Got ${sheetRecords.length} records from Sheets`);

    // 2. Build a map: id -> { created_at, updated_at } from Sheets
    const dateMap: Record<string, { created_at: string; updated_at: string }> = {};
    for (const rec of sheetRecords) {
      if (rec.id && (rec.created_at || rec.updated_at)) {
        dateMap[String(rec.id).trim()] = {
          created_at: rec.created_at || "",
          updated_at: rec.updated_at || "",
        };
      }
    }
    console.log(`[Migration] Built date map for ${Object.keys(dateMap).length} records`);

    if (dryRun) {
      // Show a sample of what would be updated
      const sample = Object.entries(dateMap).slice(0, 10).map(([id, dates]) => ({
        id,
        ...dates,
      }));
      return NextResponse.json({
        message: "DRY RUN - No changes made",
        total_sheet_records: sheetRecords.length,
        records_with_dates: Object.keys(dateMap).length,
        sample,
      });
    }

    // 3. Fetch all DynamoDB records
    console.log("[Migration] Fetching all DynamoDB records...");
    let allDynamo: any[] = [];
    let nextToken: string | null | undefined = undefined;
    do {
      const response: any = await client.models.O2DRecord.list({
        nextToken,
        limit: 1000,
      });
      allDynamo = [...allDynamo, ...response.data];
      nextToken = response.nextToken;
    } while (nextToken);
    console.log(`[Migration] Got ${allDynamo.length} records from DynamoDB`);

    // 4. Update DynamoDB records in parallel batches (much faster than sequential)
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const errors: string[] = [];

    // Build list of records that need updating
    const toUpdate = allDynamo.filter((record) => {
      const id = String(record.id || "").trim();
      const dates = dateMap[id];
      if (!dates) { notFound++; return false; }
      if (record.created_at && record.updated_at) { skipped++; return false; }
      return true;
    });

    console.log(`[Migration] ${toUpdate.length} records need updating, ${skipped} already have dates, ${notFound} not found in Sheets`);

    // Process in batches of 50 in parallel
    const BATCH_SIZE = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (record) => {
          const id = String(record.id || "").trim();
          const dates = dateMap[id];
          try {
            await client.models.O2DRecord.update({
              id: record.id,
              created_at: record.created_at || dates.created_at || null,
              updated_at: record.updated_at || dates.updated_at || null,
              sheet_created_at: dates.created_at || null,
              sheet_updated_at: dates.updated_at || null,
            } as any);
            updated++;
          } catch (err: any) {
            if (errors.length < 20) errors.push(`id=${id}: ${err.message}`);
          }
        })
      );
      console.log(`[Migration] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toUpdate.length / BATCH_SIZE)} done — ${updated} updated so far`);
    }

    console.log(`[Migration] Done. Updated: ${updated}, Skipped: ${skipped}, Not Found: ${notFound}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: "Migration complete",
      stats: {
        total_dynamo: allDynamo.length,
        total_sheet_with_dates: Object.keys(dateMap).length,
        updated,
        skipped,
        not_found_in_sheet: notFound,
        errors: errors.length,
      },
      errors: errors.slice(0, 20),
    });

  } catch (error: any) {
    console.error("[Migration] Fatal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
