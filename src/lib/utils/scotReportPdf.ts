import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Colours ────────────────────────────────────────────────────────────
const NAVY:    [number, number, number] = [0,   56, 117];
const GOLD:    [number, number, number] = [255, 213,   0];
const EMERALD: [number, number, number] = [5,  150, 105];
const AMBER:   [number, number, number] = [217, 119,   6];
const ROSE:    [number, number, number] = [220,  38,  38];
const GRAY:    [number, number, number] = [100, 116, 139];
const WHITE:   [number, number, number] = [255, 255, 255];
const PURPLE:  [number, number, number] = [124,  58, 237];
const LIGHT_BG:[number, number, number] = [248, 250, 252];

const fmtDate = (s: string) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
};

const fmtShort = (iso: string) => {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${mon[parseInt(m) - 1]} '${y.slice(-2)}`;
};

// Helper to get ISO week number
const getWeekNumber = (d: Date): number => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// ─── Draw Page Header ──────────────────────────────────────────────────
function drawHeader(
  doc: jsPDF, 
  PW: number, 
  page: number, 
  total: number,
  salesCoordinator: string, 
  from: string, 
  to: string
) {
  doc.setFillColor(...NAVY); 
  doc.rect(0, 0, PW, 22, "F");
  
  doc.setFillColor(...GOLD); 
  doc.rect(0, 22, PW, 1.5, "F");

  // Title block
  doc.setTextColor(...WHITE); 
  doc.setFontSize(13); 
  doc.setFont("helvetica", "bold");
  doc.text("ROBOTEK", 14, 10);
  
  doc.setFontSize(7.5); 
  doc.setFont("helvetica", "normal"); 
  doc.setTextColor(180, 210, 255);
  doc.text("COORDINATOR WEEKLY PERFORMANCE REPORT", 14, 15);

  // Sales Coordinator context
  doc.setTextColor(...WHITE); 
  doc.setFontSize(9); 
  doc.setFont("helvetica", "bold");
  doc.text(`COORDINATOR: ${salesCoordinator.toUpperCase()}`, PW - 14, 10, { align: "right" });

  // Date range info
  const dFrom = new Date(from);
  let periodLabel = "";
  if (!isNaN(dFrom.getTime())) {
    periodLabel = `WEEK ${getWeekNumber(dFrom)}, ${dFrom.getFullYear()}`;
  }

  if (periodLabel) {
    doc.setFontSize(7.5); 
    doc.setFont("helvetica", "bold"); 
    doc.setTextColor(...GOLD);
    doc.text(periodLabel, PW - 14, 14, { align: "right" });
    
    doc.setFontSize(6.5); 
    doc.setFont("helvetica", "normal"); 
    doc.setTextColor(200, 220, 255);
    doc.text(`${fmtShort(from)} – ${fmtShort(to)}`, PW - 14, 18, { align: "right" });
  } else {
    doc.setFontSize(7.5); 
    doc.setFont("helvetica", "normal"); 
    doc.setTextColor(200, 220, 255);
    doc.text(`${fmtShort(from)} – ${fmtShort(to)}`, PW - 14, 16, { align: "right" });
  }

  doc.setTextColor(...GOLD); 
  doc.setFontSize(7);
  doc.text(`Page ${page} of ${total}`, PW - 14, 21.5, { align: "right" });
}

// ─── Single Stat KPI Tile ────────────────────────────────────────────────
function drawTile(
  doc: jsPDF, 
  x: number, 
  y: number, 
  w: number, 
  h: number,
  value: string | number, 
  label: string, 
  sub: string, 
  color: [number, number, number]
) {
  doc.setFillColor(...color); 
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  
  doc.setTextColor(...WHITE);
  doc.setFontSize(5); 
  doc.setFont("helvetica", "normal");
  doc.text(sub, x + w / 2, y + 5.5, { align: "center" });
  
  doc.setFontSize(14); 
  doc.setFont("helvetica", "bold");
  doc.text(String(value), x + w / 2, y + h / 2 + 2.5, { align: "center" });
  
  doc.setFontSize(5.5); 
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x + w / 2, y + h - 3.5, { align: "center" });
}

// ─── Main PDF Export function ──────────────────────────────────────────
export async function generateScotReportPDF(salesCoordinatorData: any, dateRange: { from: string; to: string }) {
  const doc = new jsPDF("p", "mm", "a4");
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 14; 
  const CW = PW - M * 2;
  const username = salesCoordinatorData.salesCoordinator;

  // ════════════════════════════════════════════════════════════════════
  // PAGE 1 — PROFILE & METRICS SUMMARY
  // ════════════════════════════════════════════════════════════════════
  let y = 29;

  // Coordinator Profile Banner
  doc.setFillColor(...LIGHT_BG); 
  doc.roundedRect(M, y, CW, 32, 2, 2, "F");
  doc.setFillColor(...NAVY); 
  doc.roundedRect(M, y, 4, 32, 1.5, 1.5, "F");

  // Profile Emblem Circle
  doc.setFillColor(...NAVY); 
  doc.circle(M + 18, y + 16, 10, "F");
  doc.setDrawColor(...GOLD); 
  doc.setLineWidth(1.0); 
  doc.circle(M + 18, y + 16, 10, "S");
  doc.setTextColor(...WHITE); 
  doc.setFontSize(18); 
  doc.setFont("helvetica", "bold");
  doc.text(username.charAt(0).toUpperCase(), M + 18, y + 21, { align: "center" });

  // Representative Name & Designation
  doc.setTextColor(...NAVY); 
  doc.setFontSize(12); 
  doc.setFont("helvetica", "bold");
  doc.text(username.toUpperCase(), M + 34, y + 10);
  
  doc.setFillColor(...NAVY); 
  doc.roundedRect(M + 34, y + 13.5, 36, 5.0, 0.8, 0.8, "F");
  doc.setTextColor(...WHITE); 
  doc.setFontSize(6); 
  doc.text("SALES COORDINATOR", M + 52, y + 17, { align: "center" });

  // Color-coded Follow-up Performance Score Badge
  const fuScore = salesCoordinatorData.followUpScore || 0;
  const badgeColor = fuScore >= 80 ? EMERALD : fuScore >= 50 ? AMBER : ROSE;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(M + 73, y + 13.5, 28, 5.0, 0.8, 0.8, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(`SCORE: ${fuScore}%`, M + 87, y + 17, { align: "center" });

  doc.setTextColor(...GRAY); 
  doc.setFontSize(7); 
  doc.setFont("helvetica", "normal");
  doc.text(`Reporting Period: ${fmtShort(dateRange.from)} to ${fmtShort(dateRange.to)}`, M + 34, y + 24);
  doc.text(`Active assigned client portfolio size: ${salesCoordinatorData.totalParties} parties`, M + 34, y + 29);

  // Targets / Week Summary on Right of Profile Block
  const progressBoxX = M + 120;
  const progressBoxW = 58;
  doc.setFillColor(230, 240, 255); 
  doc.roundedRect(progressBoxX, y + 2, progressBoxW, 28, 2, 2, "F");

  const plannedWeek = salesCoordinatorData.totalWeeklyPlanned || 0;
  const actualWeek = salesCoordinatorData.totalWeeklyActual || 0;
  const targetPct = plannedWeek > 0 ? Math.min(100, Math.round((actualWeek / plannedWeek) * 100)) : 0;

  doc.setTextColor(...NAVY); 
  doc.setFontSize(6.5); 
  doc.setFont("helvetica", "bold");
  doc.text("WEEKLY ORDER TARGETS", progressBoxX + 4, y + 8);

  doc.setFontSize(5.5); 
  doc.setFont("helvetica", "normal"); 
  doc.setTextColor(...GRAY);
  doc.text(`Planned Orders: ${plannedWeek}  |  Actual Received: ${actualWeek}`, progressBoxX + 4, y + 13);

  // Mini Targets progress bar
  doc.setFillColor(210, 220, 235); 
  doc.roundedRect(progressBoxX + 4, y + 17, progressBoxW - 8, 3.5, 0.5, 0.5, "F");
  if (targetPct > 0) {
    doc.setFillColor(...(targetPct >= 80 ? EMERALD : targetPct >= 50 ? AMBER : ROSE));
    doc.roundedRect(progressBoxX + 4, y + 17, ((progressBoxW - 8) * targetPct) / 100, 3.5, 0.5, 0.5, "F");
  }

  doc.setTextColor(...(targetPct >= 80 ? EMERALD : targetPct >= 50 ? AMBER : ROSE));
  doc.setFontSize(8); 
  doc.setFont("helvetica", "bold");
  doc.text(`${targetPct}% Target Achieved`, progressBoxX + 4, y + 26);

  y += 38;

  // ── KPI Summary Cards ──
  const wonCount = salesCoordinatorData.statusCounts?.["Order Won"] || 0;
  const lostCount = salesCoordinatorData.statusCounts?.["Order Lost"] || 0;
  const cbCount = salesCoordinatorData.statusCounts?.["Call Later"] || 0;
  const naCount = salesCoordinatorData.statusCounts?.["Not Answered"] || 0;

  const tiles = [
    { v: salesCoordinatorData.totalParties, l: "Parties Defined", s: "Calls Tab Portfolio", c: NAVY },
    { v: salesCoordinatorData.totalDirectCalls, l: "Feeder Attempts", s: "Inbound / Outbound", c: AMBER },
    { v: `${salesCoordinatorData.followUpScore}%`, l: "Follow-up Score", s: `Planned: ${salesCoordinatorData.plannedFollowUps} | Done: ${salesCoordinatorData.actualFollowUps}`, c: EMERALD },
    { v: wonCount, l: "Orders Won", s: "Conversions", c: EMERALD },
    { v: lostCount, l: "Orders Lost", s: "Unsuccessful", c: ROSE },
    { v: cbCount + naCount, l: "Callback / NA", s: "Pending Actions", c: PURPLE }
  ];

  const tw = (CW - 5) / 6;
  tiles.forEach((t, i) => drawTile(doc, M + i * (tw + 1), y, tw, 22, t.v, t.l, t.s, t.c));
  
  y += 28;

  // ── Section: Left (Feeder Call Breakdown) & Right (Weekly Target Summary Table) Side-by-Side Cards ──
  doc.setFontSize(8); 
  doc.setFont("helvetica", "bold"); 
  doc.setTextColor(...NAVY);
  doc.text("DIRECT CALL BREAKDOWN", M, y);
  doc.text("WEEKLY PERFORMANCE SUMMARY", M + 92, y);
  
  const totalCalls = salesCoordinatorData.totalDirectCalls || 0;
  const incCalls = salesCoordinatorData.directCallsIncoming || 0;
  const outCalls = salesCoordinatorData.directCallsOutgoing || 0;
  const misCalls = salesCoordinatorData.directCallsMissed || 0;

  const incPct = totalCalls > 0 ? Math.round((incCalls / totalCalls) * 100) : 0;
  const outPct = totalCalls > 0 ? Math.round((outCalls / totalCalls) * 100) : 0;
  const misPct = totalCalls > 0 ? Math.max(0, 100 - incPct - outPct) : 0;

  // Left Card Widget: Call types distribution
  doc.setFillColor(245, 247, 250); 
  doc.roundedRect(M, y + 2.5, 88, 24, 1.5, 1.5, "F");

  const leftBarW = 80;
  const incW = (leftBarW * incPct) / 100;
  const outW = (leftBarW * outPct) / 100;
  const misW = (leftBarW * misPct) / 100;

  // Draw calls progress track background
  doc.setFillColor(230, 235, 242); 
  doc.roundedRect(M + 4, y + 5.5, leftBarW, 3.0, 0.6, 0.6, "F");

  // Draw calls colored progress segments
  let leftX = M + 4;
  if (incW > 0) {
    doc.setFillColor(...EMERALD);
    doc.roundedRect(leftX, y + 5.5, incW, 3.0, 0.4, 0.4, "F");
    leftX += incW;
  }
  if (outW > 0) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(leftX, y + 5.5, outW, 3.0, 0.4, 0.4, "F");
    leftX += outW;
  }
  if (misW > 0) {
    doc.setFillColor(...ROSE);
    doc.roundedRect(leftX, y + 5.5, misW, 3.0, 0.4, 0.4, "F");
  }

  // Draw Left Legend circle indicators (Vertical Stack)
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");

  doc.setFillColor(...EMERALD);
  doc.circle(M + 6, y + 13.0, 1.0, "F");
  doc.setTextColor(...NAVY);
  doc.text(`INCOMING CALLS: ${incCalls} (${incPct}%)`, M + 9, y + 14.0);

  doc.setFillColor(...NAVY);
  doc.circle(M + 6, y + 17.5, 1.0, "F");
  doc.setTextColor(...NAVY);
  doc.text(`OUTGOING CALLS: ${outCalls} (${outPct}%)`, M + 9, y + 18.5);

  doc.setFillColor(...ROSE);
  doc.circle(M + 6, y + 22.0, 1.0, "F");
  doc.setTextColor(...NAVY);
  doc.text(`MISSED CALLS:     ${misCalls} (${misPct}%)`, M + 9, y + 23.0);

  // Right Card Widget: Custom-drawn targets table comparing orders vs follow-ups
  doc.setFillColor(245, 247, 250); 
  doc.roundedRect(M + 92, y + 2.5, 90, 24, 1.5, 1.5, "F");

  // Grid Header
  doc.setFillColor(...NAVY);
  doc.roundedRect(M + 92, y + 2.5, 90, 5.0, 1.0, 1.0, "F");
  
  doc.setTextColor(...WHITE); 
  doc.setFontSize(5.5); 
  doc.setFont("helvetica", "bold");
  doc.text("METRIC", M + 96, y + 6.0);
  doc.text("PLANNED", M + 128, y + 6.0, { align: "center" });
  doc.text("ACTUAL", M + 150, y + 6.0, { align: "center" });
  doc.text("GAP %", M + 172, y + 6.0, { align: "center" });

  // Grid row lines
  doc.setDrawColor(225, 230, 240); 
  doc.setLineWidth(0.3);
  doc.line(M + 92, y + 14.0, M + 182, y + 14.0);
  doc.line(M + 92, y + 20.5, M + 182, y + 20.5);

  // Weekly Orders Row
  const ordPlan = salesCoordinatorData.totalWeeklyPlanned || 0;
  const ordAct = salesCoordinatorData.totalWeeklyActual || 0;
  const ordGap = ordPlan > 0 ? Math.round(((ordAct - ordPlan) / ordPlan) * 100) : 0;

  doc.setTextColor(...NAVY); 
  doc.setFontSize(6.0); 
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Orders", M + 96, y + 11.5);
  doc.setFont("helvetica", "normal");
  doc.text(String(ordPlan), M + 128, y + 11.5, { align: "center" });
  doc.text(String(ordAct), M + 150, y + 11.5, { align: "center" });
  
  if (ordGap < 0) {
    doc.setTextColor(...ROSE); 
    doc.setFont("helvetica", "bold");
    doc.text(`${ordGap}%`, M + 172, y + 11.5, { align: "center" });
  } else {
    doc.setTextColor(...EMERALD); 
    doc.setFont("helvetica", "bold");
    doc.text(`+${ordGap}%`, M + 172, y + 11.5, { align: "center" });
  }

  // Weekly Follow-ups Row
  const fuPlan = salesCoordinatorData.plannedFollowUps || 0;
  const fuAct = salesCoordinatorData.actualFollowUps || 0;
  const fuGap = fuPlan > 0 ? Math.round(((fuAct - fuPlan) / fuPlan) * 100) : 0;

  doc.setTextColor(...NAVY); 
  doc.setFontSize(6.0); 
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Follow-ups", M + 96, y + 18.0);
  doc.setFont("helvetica", "normal");
  doc.text(String(fuPlan), M + 128, y + 18.0, { align: "center" });
  doc.text(String(fuAct), M + 150, y + 18.0, { align: "center" });

  if (fuGap < 0) {
    doc.setTextColor(...ROSE); 
    doc.setFont("helvetica", "bold");
    doc.text(`${fuGap}%`, M + 172, y + 18.0, { align: "center" });
  } else {
    doc.setTextColor(...EMERALD); 
    doc.setFont("helvetica", "bold");
    doc.text(`+${fuGap}%`, M + 172, y + 18.0, { align: "center" });
  }

  y += 31;

  // ── Section: Parties Analysis ──
  doc.setFontSize(8); 
  doc.setFont("helvetica", "bold"); 
  doc.setTextColor(...NAVY);
  doc.text("PARTIES PIPELINE & DASHBOARD ANALYSIS", M, y);
  y += 3.5;

  const partyRows = salesCoordinatorData.parties.map((p: any) => {
    const db = p.dashboard || {};
    const remMonth = (db.actualMonth || 0) - (db.monthlyPlanned || 0);
    const remWeek = (db.actualWeek || 0) - (db.weeklyPlanned || 0);
    
    return [
      p.partyName || "—",
      p.salesPerson || "—",
      p.customerType || "—",
      db.monthlyPlanned || "0",
      db.actualMonth || "0",
      String(remMonth),
      db.weeklyPlanned || "0",
      db.actualWeek || "0",
      String(remWeek),
      `${p.followUpAttemptsCount || 0} / ${p.isPlanned ? 1 : 0}`,
      p.feederCallAttemptsCount || "0",
      p.latestStatus || "Pending"
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [[
      "Party Name", "Sales Rep", "Type", 
      "Month Plan", "Month Act", "Month Rem", 
      "Week Plan", "Week Act", "Week Rem", 
      "Follow-up Done/Due", "Direct Calls", "Latest Status"
    ]],
    body: partyRows,
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: GOLD, fontSize: 5.5, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 5.5, halign: "center", valign: "middle" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 26 },
      1: { halign: "left", fontStyle: "normal", cellWidth: 16 },
      2: { cellWidth: 10 },
      3: { cellWidth: 10 },
      4: { cellWidth: 10 },
      5: { cellWidth: 10, fontStyle: "bold" },
      6: { cellWidth: 10 },
      7: { cellWidth: 10 },
      8: { cellWidth: 10, fontStyle: "bold" },
      9: { fontStyle: "bold", cellWidth: 18 },
      10: { cellWidth: 10 },
      11: { fontStyle: "bold", cellWidth: 16 }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 11) {
        const val = String(d.cell.raw);
        if (val === "Order Won") d.cell.styles.textColor = EMERALD;
        else if (val === "Order Lost") d.cell.styles.textColor = ROSE;
        else if (val === "Not Answered" || val === "Call Later") d.cell.styles.textColor = AMBER;
      }
      if (d.section === "body" && d.column.index === 9) {
        const val = String(d.cell.raw);
        if (val.endsWith("/ 1")) {
          if (val.startsWith("0 /")) {
            d.cell.styles.textColor = ROSE;
          } else {
            d.cell.styles.textColor = EMERALD;
          }
        } else if (val.endsWith("/ 0") && !val.startsWith("0 /")) {
          d.cell.styles.textColor = PURPLE;
        }
      }
      if (d.section === "body" && (d.column.index === 5 || d.column.index === 8)) {
        const val = Number(d.cell.raw);
        if (!isNaN(val) && val < 0) {
          d.cell.styles.textColor = ROSE;
          d.cell.styles.fontStyle = "bold";
        } else if (!isNaN(val) && val > 0) {
          d.cell.styles.textColor = EMERALD;
          d.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // PAGES 2+ — DIRECT CALLS & FOLLOW-UP HISTORIES
  // ════════════════════════════════════════════════════════════════════
  let ty = (doc as any).lastAutoTable.finalY + 10;
  if (ty + 35 > PH - 15) {
    doc.addPage();
    ty = 28;
  }

  // Direct Call Logs (Feeder) Section
  doc.setFillColor(...NAVY); 
  doc.roundedRect(M, ty, CW, 8, 1, 1, "F");
  doc.setTextColor(...WHITE); 
  doc.setFontSize(8); 
  doc.setFont("helvetica", "bold");
  doc.text(`DIRECT CALL ATTEMPTS FROM DATA FEEDER (${salesCoordinatorData.totalDirectCalls} LOGS)`, M + 4, ty + 5.5);
  
  ty += 11.5;

  const feederCallsRows = (salesCoordinatorData.feederCalls || []).map((c: any) => [
    `${c.callDate ? new Date((parseFloat(c.callDate) - 25569) * 86400 * 1000).toLocaleDateString('en-GB') : "—"} ${c.callTime || ""}`,
    c.callType || "—",
    c.duration || "—",
    c.toName || "—",
    c.toNumber || "—",
    c.notes || "—"
  ]);

  autoTable(doc, {
    startY: ty,
    margin: { left: M, right: M },
    head: [["Date & Time", "Type", "Duration", "To Name", "Number", "Notes"]],
    body: feederCallsRows.length > 0 ? feederCallsRows : [["—", "—", "—", "—", "—", "No call logs recorded this week"]],
    theme: "striped",
    headStyles: { fillColor: AMBER, textColor: WHITE, fontSize: 6.5, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 6.5, halign: "center", valign: "middle" },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 15 },
      2: { cellWidth: 15 },
      3: { cellWidth: 32, halign: "left" },
      4: { cellWidth: 24 },
      5: { halign: "left" }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const val = String(d.cell.raw).toLowerCase();
        if (val === "incoming") d.cell.styles.textColor = EMERALD;
        else if (val === "outgoing") d.cell.styles.textColor = NAVY;
        else if (val === "missed") d.cell.styles.textColor = ROSE;
      }
    }
  });

  ty = (doc as any).lastAutoTable.finalY + 10;

  // Add page if follow up table would spill over immediately
  if (ty + 30 > PH - 15) {
    doc.addPage();
    ty = 28;
  }

  // Follow-up Logs Section
  doc.setFillColor(...EMERALD); 
  doc.roundedRect(M, ty, CW, 8, 1, 1, "F");
  doc.setTextColor(...WHITE); 
  doc.setFontSize(8); 
  doc.setFont("helvetica", "bold");
  doc.text(`DETAILED FOLLOW-UP LOGS FROM CALLS TAB (${salesCoordinatorData.totalFollowUpAttempts} LOGS)`, M + 4, ty + 5.5);

  ty += 11.5;

  // Gather follow ups across all parties under this coordinator, sorted by date descending
  const allFollowUps = salesCoordinatorData.parties.reduce((acc: any[], p: any) => {
    (p.followUpAttempts || []).forEach((fu: any) => {
      acc.push({
        partyName: p.partyName,
        createdAt: fu.createdAt,
        status: fu.status,
        remarks: fu.remarks,
        createdBy: fu.createdBy
      });
    });
    return acc;
  }, []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const followUpRows = allFollowUps.map((fu: any) => [
    fu.createdAt ? new Date(fu.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—",
    fu.partyName || "—",
    fu.status || "—",
    fu.remarks || "—",
    fu.createdBy || "—"
  ]);

  autoTable(doc, {
    startY: ty,
    margin: { left: M, right: M },
    head: [["Date & Time", "Party Name", "Updated Status", "Conversation Remarks / Notes", "Logged By"]],
    body: followUpRows.length > 0 ? followUpRows : [["—", "—", "—", "No follow-up attempts made this week", "—"]],
    theme: "striped",
    headStyles: { fillColor: EMERALD, textColor: WHITE, fontSize: 6.5, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 6.5, halign: "center", valign: "middle" },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 40, halign: "left", fontStyle: "bold" },
      2: { cellWidth: 22 },
      3: { halign: "left" },
      4: { cellWidth: 22 }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 2) {
        const val = String(d.cell.raw);
        if (val === "Order Won") d.cell.styles.textColor = EMERALD;
        else if (val === "Order Lost") d.cell.styles.textColor = ROSE;
        else if (val === "Not Answered" || val === "Call Later") d.cell.styles.textColor = AMBER;
      }
    }
  });

  // ── Print Header on all pages ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawHeader(doc, PW, i, pageCount, username, dateRange.from, dateRange.to);
  }

  doc.save(`Scot_Coordinator_Report_${username.replace(/\s+/g, '_')}_${dateRange.from}.pdf`);
}
