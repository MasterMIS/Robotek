import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/../amplify/data/resource';
import { auth } from "@/auth";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache variables to prevent "thundering herd" full-scans
let globalFetchPromise: Promise<any[]> | null = null;
let lastFetchTime = 0;
let cachedData: any[] | null = null;
const CACHE_TTL = 5000; // 5 seconds

// Helper: Fetch ALL records from DynamoDB with caching and deduplication
async function fetchAllO2DRecords() {
  const now = Date.now();
  
  if (cachedData && (now - lastFetchTime < CACHE_TTL)) {
    return cachedData;
  }

  if (globalFetchPromise) {
    return globalFetchPromise;
  }

  globalFetchPromise = (async () => {
    try {
      let allRecords: any[] = [];
      let nextToken: string | null | undefined = undefined;
      do {
        const response: any = await client.models.O2DRecord.list({ 
            nextToken,
            limit: 1000
        });
        allRecords = [...allRecords, ...response.data];
        nextToken = response.nextToken;
      } while (nextToken);
      
      cachedData = allRecords;
      lastFetchTime = Date.now();
      return allRecords;
    } finally {
      globalFetchPromise = null;
    }
  })();

  return globalFetchPromise;
}

// Helper: Get step config (TAT/Person) - Mocked or extracted from Dropdowns
async function getStepConfigs() {
  const res: any = await client.models.Dropdown.list({
    filter: { type: { eq: 'o2d_step_config' } }
  });
  return res.data.map((d: any) => JSON.parse(d.value));
}

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = (session?.user as any)?.username || "";
    const userRole = ((session?.user as any)?.role || "User").toUpperCase();

    const allO2Ds = await fetchAllO2DRecords();
    const stepConfigs = (userRole === "USER" && currentUser) ? await getStepConfigs() : null;

    // Group by order_no
    const groupedByOrder: Record<string, any[]> = {};
    allO2Ds.forEach((item) => {
      const orderNo = item.order_no || "Unknown";
      if (!groupedByOrder[orderNo]) groupedByOrder[orderNo] = [];
      groupedByOrder[orderNo].push(item);
    });

    const stepCounts = Array(13).fill(0); // 0-10: steps 1-11, 11: Hold, 12: Cancelled

    Object.values(groupedByOrder).forEach((orderItems) => {
      const firstItem = orderItems[0];
      
      if (firstItem.cancelled) {
        stepCounts[12]++;
        return;
      }
      if (firstItem.hold) {
        stepCounts[11]++;
        return;
      }

      const pendingStep = getPendingStepIdx(orderItems);
      if (pendingStep >= 1 && pendingStep <= 11) {
        if (stepConfigs) {
          const config = stepConfigs[pendingStep - 1];
          if (config?.responsible_person) {
            const responsible = config.responsible_person.split(",").map((s: string) => s.trim());
            if (!responsible.includes(currentUser)) return;
          }
        }
        stepCounts[pendingStep - 1]++;
      }
    });

    return NextResponse.json({
      stepCounts,
      totalOrders: Object.keys(groupedByOrder).length,
      totalRows: allO2Ds.length,
    });
  } catch (error: any) {
    console.error("Error fetching O2D summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
