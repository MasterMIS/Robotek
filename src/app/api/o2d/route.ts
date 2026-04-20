import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Schema } from '@/../amplify/data/resource';
import { auth } from "@/auth";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Resolve hybrid image URLs (Drive or S3)
async function resolveUrl(path: string | null | undefined): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path; // Already a URL or base64
  try {
    const url = await getUrl({ path, options: { validateObjectExistence: false, expiresIn: 3600 } });
    return url.url.toString();
  } catch (err) {
    console.error(`Error resolving S3 path: ${path}`, err);
    return path;
  }
}

// Helper: Fetch ALL records from DynamoDB using nextToken iteration
async function fetchAllO2DRecords() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const response: any = await client.models.O2DRecord.list({
      nextToken,
      limit: 1000 // Maximize per-page fetch
    });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);

  // Normalize field names: DynamoDB records imported from Sheets use
  // sheet_created_at / sheet_updated_at — map them to created_at / updated_at
  // so the frontend always gets consistent field names.
  // Priority: custom created_at > sheet_created_at > AWS auto createdAt
  return allRecords.map((row) => ({
    ...row,
    created_at: row.sheet_created_at || row.sheetCreatedAt || row.created_at || null,
    updated_at: row.sheet_updated_at || row.sheetUpdatedAt || row.updated_at || null,
    sheet_created_at: row.sheet_created_at || row.sheetCreatedAt || null,
    sheet_updated_at: row.sheet_updated_at || row.sheetUpdatedAt || null,
    // Also normalise actual_N from the old typo "acual_N"
    ...Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => i + 1).map((i) => [
        `actual_${i}`,
        row[`actual_${i}`] || row[`acual_${i}`] || "",
      ])
    ),
  }));
}

// Helper: Get pending step index for an order (same logic as sheet but for AWS data)
function getPendingStepIdx(orderItems: any[]): number {
  const firstItem = orderItems[0];
  for (let i = 1; i <= 11; i++) {
    const pVal = (firstItem[`planned_${i}`] || "").toString().trim();
    const aVal = (firstItem[`actual_${i}`] || (firstItem as any)[`acual_${i}`] || "").toString().trim();
    const sVal = (firstItem[`status_${i}`] || "").toString().trim();

    if (pVal && pVal !== "-") {
      const hasActual = aVal && aVal !== "-";
      const isStep3CompletedNo = i === 3 && sVal === "No";
      const isStep4CompletedNo = i === 4 && sVal === "No";

      let stepDone = hasActual && sVal !== "No";
      if (isStep3CompletedNo) {
        const step4Plan = (firstItem[`planned_4`] || "").toString().trim();
        if (step4Plan && step4Plan !== "-") stepDone = true;
      }
      if (isStep4CompletedNo) stepDone = true;

      if (!stepDone) return i;
      if (isStep4CompletedNo) return -1;
    }
  }
  return -1;
}

// Helper: Check if order matches date filters
function orderMatchesDateFilter(orderItems: any[], filter: string) {
  if (!filter) return true;
  const firstItem = orderItems[0];
  if (filter === "Hold") return !!firstItem.hold && !firstItem.cancelled;
  if (filter === "Cancelled") return !!firstItem.cancelled;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const pendingStepIdx = getPendingStepIdx(orderItems);
  if (pendingStepIdx === -1) return false;

  const plannedRaw = firstItem[`planned_${pendingStepIdx}`];
  if (!plannedRaw || plannedRaw === "-" || plannedRaw.trim() === "") return false;

  const pd = new Date(plannedRaw);
  if (isNaN(pd.getTime())) return false;

  const pdDay = new Date(pd);
  pdDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((pdDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (filter === "Delayed") return pd < now;
  if (filter === "Today") return diffDays === 0;
  if (filter === "Tomorrow") return diffDays === 1;
  if (filter === "Next5") return diffDays > 0 && diffDays <= 5;
  if (filter === "Next10") return diffDays > 0 && diffDays <= 10;

  return false;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const currentUser = (session?.user as any)?.username || "";
  const userRole = (session?.user as any)?.role || "User";

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const allData = searchParams.get("all");

  try {
    if (type === "chunk") {
      const pageLimit = parseInt(searchParams.get("limit") || "1000", 10);
      const token = searchParams.get("nextToken") || undefined;
      
      const response: any = await client.models.O2DRecord.list({
        nextToken: token,
        limit: pageLimit
      });

      const mappedData = response.data.map((row: any) => ({
        ...row,
        created_at: row.sheet_created_at || row.sheetCreatedAt || row.created_at || null,
        updated_at: row.updated_at || row.sheet_updated_at || row.sheetUpdatedAt || row.updated_at || null,
        ...Object.fromEntries(
          Array.from({ length: 11 }, (_, i) => i + 1).map((i) => [
            `actual_${i}`,
            row[`actual_${i}`] || row[`acual_${i}`] || "",
          ])
        ),
      }));

      return NextResponse.json({
        data: mappedData,
        nextToken: response.nextToken
      });
    }

    if (type === "ordernumbers") {
      const o2ds = await fetchAllO2DRecords();
      const orderNumbers = Array.from(new Set(o2ds.map((o) => o.order_no).filter(Boolean))).sort((a, b) => b.localeCompare(a));
      return NextResponse.json(orderNumbers);
    }

    if (allData === "true" || searchParams.get("chunked") === "true") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let nextToken: string | null | undefined = undefined;
            let isFirst = true;
            controller.enqueue(encoder.encode('['));
            do {
              const response: any = await client.models.O2DRecord.list({
                nextToken,
                limit: 1000
              });
              
              for (const row of response.data) {
                const mappedRow = {
                  ...row,
                  created_at: row.sheet_created_at || row.sheetCreatedAt || row.created_at || null,
                  updated_at: row.sheet_updated_at || row.sheetUpdatedAt || row.updated_at || null,
                  sheet_created_at: row.sheet_created_at || row.sheetCreatedAt || null,
                  sheet_updated_at: row.sheet_updated_at || row.sheetUpdatedAt || null,
                  ...Object.fromEntries(
                    Array.from({ length: 11 }, (_, i) => i + 1).map((i) => [
                      `actual_${i}`,
                      row[`actual_${i}`] || row[`acual_${i}`] || "",
                    ])
                  ),
                };
                try {
                  controller.enqueue(encoder.encode((isFirst ? "" : ",") + JSON.stringify(mappedRow)));
                } catch (enqueueErr) {
                  // Controller closed remotely (e.g. client aborted request)
                  return; 
                }
                isFirst = false;
              }
              nextToken = response.nextToken;
            } while (nextToken);
            
            try { controller.enqueue(encoder.encode(']')); } catch (e) {}
          } catch (err) {
            console.error("Streaming error:", err);
            // If it errors halfway, the JSON will be broken, which fetcher will catch.
          } finally {
            try { controller.close(); } catch {}
          }
        }
      });
      return new Response(stream, { headers: { "Content-Type": "application/json" } });
    }

    // Pagination and Filtering logic (same implementation as sheets but on AWS data)
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = (searchParams.get("search") || "").toLowerCase();
    const dateFilters = JSON.parse(searchParams.get("dateFilters") || "[]");
    const stepFilters = JSON.parse(searchParams.get("stepFilters") || "[]").map((s: any) => parseInt(s));
    const partyFilter = (searchParams.get("partyFilter") || "").toLowerCase();
    const orderFilter = (searchParams.get("orderFilter") || "").toLowerCase();
    const itemNameFilter = (searchParams.get("itemNameFilter") || "").toLowerCase();
    const pendingFilter = searchParams.get("pendingFilter") === "true";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const allO2Ds = await fetchAllO2DRecords();

    // 1. Group by order_no
    const groupedByOrder: Record<string, any[]> = {};
    allO2Ds.forEach((item) => {
      const orderNo = item.order_no || "Unknown";
      if (!groupedByOrder[orderNo]) groupedByOrder[orderNo] = [];
      groupedByOrder[orderNo].push(item);
    });

    // 2. Filter orders
    let orderNumbers = Object.keys(groupedByOrder).sort((a, b) => b.localeCompare(a));

    orderNumbers = orderNumbers.filter((orderNo) => {
      const items = groupedByOrder[orderNo];
      const firstItem = items[0];
      const pIdx = getPendingStepIdx(items);
      const isHold = !!firstItem.hold;
      const isCancelled = !!firstItem.cancelled;

      if (search && !(orderNo.toLowerCase().includes(search) || firstItem?.party_name?.toLowerCase().includes(search) || items.some(i => i.item_name?.toLowerCase().includes(search)))) return false;
      if (partyFilter && !firstItem.party_name?.toLowerCase().includes(partyFilter)) return false;
      if (orderFilter && !orderNo.toLowerCase().includes(orderFilter)) return false;
      if (itemNameFilter && !items.some(i => i.item_name?.toLowerCase().includes(itemNameFilter))) return false;

      if (startDate || endDate) {
        const itemDate = new Date(firstItem.created_at || firstItem.updated_at || "");
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate)) return false;
      }

      if (pendingFilter && (isHold || isCancelled || pIdx === -1)) return false;
      if (stepFilters.length > 0 && !stepFilters.includes(pIdx)) return false;
      if (dateFilters.length > 0 && !dateFilters.some((f: any) => orderMatchesDateFilter(items, f))) return false;

      return true;
    });

    // 3. Paginate
    const startIdx = (page - 1) * limit;
    const paginatedOrderNumbers = orderNumbers.slice(startIdx, startIdx + limit);
    const paginatedData = paginatedOrderNumbers.flatMap((orderNo) => groupedByOrder[orderNo]);

    return NextResponse.json({
      data: paginatedData,
      orders: paginatedOrderNumbers,
      total: orderNumbers.length,
      page,
      limit,
      totalPages: Math.ceil(orderNumbers.length / limit),
      totalRows: allO2Ds.length
    });

  } catch (error: any) {
    console.error("GET /api/o2d error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "item") {
      const { name, price, gst, finalPrice } = await req.json();
      // Dropdown pattern
      await client.models.Dropdown.create({
        type: 'o2d_item',
        value: JSON.stringify({ name, price, gst, finalPrice })
      });
      return NextResponse.json({ message: "Item added successfully" });
    }

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const o2dDataArray = JSON.parse(formData.get("o2dData") as string) as any[];
      const screenshotFile = formData.get("order_screenshot") as File;

      let screenshotUrl = "";
      if (screenshotFile && screenshotFile.size > 0) {
        const path = `o2d/${Date.now()}-${screenshotFile.name}`;
        await uploadData({
          path,
          data: await screenshotFile.arrayBuffer(),
          options: { contentType: screenshotFile.type }
        }).result;
        screenshotUrl = path;
      }

      for (const item of o2dDataArray) {
        const timestamp = new Date().toISOString();
        await client.models.O2DRecord.create({
          ...item,
          id: item.id || `O2D-${Date.now()}-${Math.random()}`,
          order_screenshot: screenshotUrl || item.order_screenshot || "",
          created_at: item.created_at || timestamp,
          updated_at: timestamp,
          sheet_created_at: item.sheet_created_at || item.created_at || timestamp,
          sheet_updated_at: timestamp
        });
      }

      return NextResponse.json({ message: "O2D records added successfully" });
    } else {
      const o2dData = await req.json();
      const timestamp = new Date().toISOString();
      await client.models.O2DRecord.create({
        ...o2dData,
        id: o2dData.id || `O2D-${Date.now()}`,
        created_at: o2dData.created_at || timestamp,
        updated_at: timestamp,
        sheet_created_at: o2dData.sheet_created_at || o2dData.created_at || timestamp,
        sheet_updated_at: timestamp
      });
      return NextResponse.json({ message: "O2D record added successfully" });
    }
  } catch (error: any) {
    console.error("POST /api/o2d error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
