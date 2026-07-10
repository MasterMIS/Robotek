import { NextRequest, NextResponse } from "next/server";
import { getI2RItems } from "@/lib/i2r-sheets";
import { getI2RPackingItems } from "@/lib/i2r-packing-sheets";
import { getReplaceItems } from "@/lib/replace-sheets";
import { auth } from "@/auth";
import { I2R_STEPS } from "@/types/i2r";
import { I2R_PACKING_STEPS } from "@/types/i2r-packing";
import { REPLACE_STEPS } from "@/types/replace";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const granularity = searchParams.get("granularity") || "month";

    const [allI2R, allI2RPacking, allReplace] = await Promise.all([
      getI2RItems().catch(() => []),
      getI2RPackingItems().catch(() => []),
      getReplaceItems().catch(() => [])
    ]);

    const filterByDate = (items: any[]) => {
      let start: Date;
      let end: Date;

      if (startDateParam && endDateParam) {
        start = new Date(startDateParam);
        end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
      } else {
        // Fallback to granularity-based filtering relative to today
        const now = new Date();
        end = new Date(now);
        start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (granularity === 'day') {
          // Keep start as today 00:00:00
        } else if (granularity === 'week') {
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
          start = new Date(start.setDate(diff));
          start.setHours(0, 0, 0, 0);
        } else if (granularity === 'month') {
          start.setDate(1);
        } else if (granularity === 'quarterly') {
          const quarter = Math.floor(start.getMonth() / 3);
          start.setMonth(quarter * 3, 1);
        } else if (granularity === 'yearly') {
          start.setMonth(0, 1);
        }
      }
      
      return items.filter(item => {
        if (!item.created_at) return false;
        let d = new Date(item.created_at);
        if (isNaN(d.getTime())) {
            const parts = item.created_at.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                 d = new Date(parts[0], parseInt(parts[1])-1, parseInt(parts[2]));
              } else {
                 d = new Date(parts[2], parseInt(parts[1])-1, parseInt(parts[0]));
              }
            }
        }
        return d >= start && d <= end;
      });
    };

    const i2rFiltered = filterByDate(allI2R);
    const packingFiltered = filterByDate(allI2RPacking);
    const replaceFiltered = filterByDate(allReplace);

    const calculateFMS = (items: any[], steps: string[]) => {
      const stepData = steps.map((stepName, i) => {
        const index = i + 1;
        let pending = 0;
        let completed = 0;
        items.forEach(item => {
          const status = (item[`status_${index}`] || "").toString().toUpperCase();
          if (status === "COMPLETED" || status === "DONE") {
            completed++;
          } else if (status === "PENDING" || status === "") {
            pending++;
          }
        });
        return { step: index, name: stepName, pending, completed };
      });
      return { total: items.length, steps: stepData };
    };

    return NextResponse.json({
      i2r: calculateFMS(i2rFiltered, I2R_STEPS),
      i2rPacking: calculateFMS(packingFiltered, I2R_PACKING_STEPS),
      replace: calculateFMS(replaceFiltered, REPLACE_STEPS)
    });

  } catch (error: any) {
    console.error("Department Performance API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
