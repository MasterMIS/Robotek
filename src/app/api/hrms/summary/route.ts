import { NextResponse } from "next/server";
import { getServiceForModule, getHrmsStepConfig } from "@/lib/hrms-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const [rData, cData, sData, oData, rConf, cConf, sConf, oConf] = await Promise.all([
      getServiceForModule("recruitment").getAll(),
      getServiceForModule("candidate").getAll(),
      getServiceForModule("sales").getAll(),
      getServiceForModule("onboard").getAll(),
      getHrmsStepConfig("recruitment"),
      getHrmsStepConfig("candidate"),
      getHrmsStepConfig("sales"),
      getHrmsStepConfig("onboard")
    ]);

    const getActiveStep = (item: any) => {
      if (item.cancelled) return -1;
      for (let i = 1; i <= 20; i++) {
        if (item[`planned_${i}`] && !item[`actual_${i}`]) return i;
      }
      return 0; // completed
    };

    const processCounts = (items: any[], config: any[]) => {
      let totalPending = 0;
      const assignedPending: Record<string, number> = {};

      items.forEach(it => {
        const step = getActiveStep(it);
        if (step > 0) {
          totalPending++;
          const responsible = config[step - 1]?.responsible_person || "";
          const users = responsible.split(",").map((u: string) => u.trim().toLowerCase()).filter(Boolean);
          users.forEach((u: string) => {
            assignedPending[u] = (assignedPending[u] || 0) + 1;
          });
        }
      });

      return { totalPending, assignedPending };
    };

    return NextResponse.json({
      recruitment: processCounts(rData, rConf),
      candidate: processCounts(cData, cConf),
      sales: processCounts(sData, sConf),
      onboard: processCounts(oData, oConf),
    });
  } catch (error: any) {
    console.error("HRMS Summary API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
