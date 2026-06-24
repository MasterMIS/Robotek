import { NextRequest, NextResponse } from "next/server";
import { o2dkbService } from "@/lib/o2dkb-sheets";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCSV(data: any[], selectedSteps: number[], includeDetails: boolean): string {
  const O2DKB_STEP_SHORTS = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8", "Step 9", "Step 10", "Step 11"];
  
  // Define column groups
  const detailHeaders = [
    "Order No",
    "Party Name",
    "Item Name",
    "Item Specification",
    "Item Qty",
    "Est Amount",
    "Created At",
    "Filled By",
    "Remark",
  ];

  // Dynamic headers based on user selection
  let headers: string[] = [];
  if (includeDetails) headers = [...detailHeaders];

  selectedSteps
    .sort((a, b) => a - b)
    .forEach((stepIdx) => {
      const stepName = O2DKB_STEP_SHORTS[stepIdx - 1];
      headers.push(`${stepName} (Status)`);
      headers.push(`${stepName} (Actual)`);
      headers.push(`${stepName} (Planned)`);
      
      if (stepIdx === 1) {
        headers.push(`${stepName} (Voucher Number)`);
        headers.push(`${stepName} (Attach Bill)`);
      } else if (stepIdx === 7) {
        headers.push(`${stepName} (Attach Billty)`);
      }
    });

  const csvRows = [headers.join(",")];

  data.forEach((item) => {
    let row: string[] = [];

    if (includeDetails) {
      row = [
        item.order_no,
        `"${(item.party_name || "").replace(/"/g, '""')}"`,
        `"${(item.item_name || "").replace(/"/g, '""')}"`,
        `"${(item.item_specification || "").replace(/"/g, '""')}"`,
        item.item_qty || "",
        item.est_amount || "",
        (() => {
          if (!item.created_at) return "-";
          const d = new Date(item.created_at);
          if (isNaN(d.getTime())) return "-";
          const pad = (n: number) => n.toString().padStart(2, "0");
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        })(),
        `"${item.filled_by || ""}"`,
        `"${(item.remark || "").replace(/"/g, '""')}"`,
      ];
    }

    selectedSteps
      .sort((a, b) => a - b)
      .forEach((stepIdx) => {
        const status = (item as any)[`status_${stepIdx}`] || "-";
        const actualStr = (item as any)[`actual_${stepIdx}`];
        const actual = actualStr && !isNaN(new Date(actualStr).getTime())
          ? new Date(actualStr).toLocaleString()
          : "-";
        const plannedStr = (item as any)[`planned_${stepIdx}`];
        const planned = plannedStr && !isNaN(new Date(plannedStr).getTime())
          ? new Date(plannedStr).toLocaleString()
          : "-";
        row.push(status);
        row.push(`"${actual}"`);
        row.push(`"${planned}"`);
        
        if (stepIdx === 1) {
          row.push(`"${((item as any).voucher_num_1 || "").toString().replace(/"/g, '""')}"`);
          row.push(`"${((item as any).attach_bill_1 || "").toString().replace(/"/g, '""')}"`);
        } else if (stepIdx === 7) {
          row.push(`"${((item as any).attach_billty_7 || "").toString().replace(/"/g, '""')}"`);
        }
      });

    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedSteps = [], includeDetails = true } = body;

    // Fetch all O2DKB data
    const allO2DKBs = await o2dkbService.getAll();
    
    if (allO2DKBs.length === 0) {
      return NextResponse.json({ error: "No data to export" }, { status: 400 });
    }

    const expandO2DKBItem = (item: any): any[] => {
      if (item.item_details) {
        try {
          const parsed = typeof item.item_details === 'string' ? JSON.parse(item.item_details) : item.item_details;
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((detail: any, idx: number) => ({
              ...item,
              id: idx === 0 ? item.id : `${item.id}-${idx}`, 
              item_name: detail.item_name || "",
              item_qty: detail.item_qty || "",
              est_amount: detail.est_amount || "",
              item_specification: detail.item_specification || "",
            }));
          }
        } catch(e) {
          console.error("Failed to parse item_details during export", e);
        }
      }
      // Provide defaults if no item_details
      return [{
        ...item,
        item_name: item.item_name || "",
        item_qty: item.item_qty || "",
        est_amount: item.est_amount || "",
        item_specification: item.item_specification || ""
      }];
    };

    const expandedO2DKBs = allO2DKBs.flatMap(expandO2DKBItem);

    // Generate CSV
    const csvContent = generateCSV(expandedO2DKBs, selectedSteps, includeDetails);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `O2DKB_Export_${timestamp}.csv`;

    // Return CSV as direct download (works on localhost and AWS)
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}
