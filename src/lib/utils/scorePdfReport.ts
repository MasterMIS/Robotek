import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Colours ────────────────────────────────────────────────────────────
const NAVY:    [number,number,number] = [0,   56, 117];
const GOLD:    [number,number,number] = [255, 213,   0];
const EMERALD: [number,number,number] = [5,  150, 105];
const AMBER:   [number,number,number] = [217, 119,   6];
const ROSE:    [number,number,number] = [220,  38,  38];
const GRAY:    [number,number,number] = [100, 116, 139];
const WHITE:   [number,number,number] = [255, 255, 255];
const PURPLE:  [number,number,number] = [124,  58, 237];
const DKRED:   [number,number,number] = [153,  27,  27];

const scoreColor = (v: number): [number,number,number] =>
  v >= 80 ? EMERALD : v >= 50 ? AMBER : ROSE;

const fmtDate = (s: string) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"2-digit" });
};
const fmtShort = (iso: string) => {
  if (!iso) return "—";
  const [y,m,d] = iso.split("-");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${mon[parseInt(m)-1]} '${y.slice(-2)}`;
};

const loadImg = (src: string): Promise<HTMLImageElement|null> =>
  new Promise(r => { const i=new Image(); i.crossOrigin="anonymous"; i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; });

// ─── Page header ─────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF, PW: number, page: number, total: number,
  username: string, from: string, to: string, logo: HTMLImageElement|null) {

  doc.setFillColor(...NAVY); doc.rect(0,0,PW,22,"F");
  doc.setFillColor(...GOLD); doc.rect(0,22,PW,1.5,"F");

  doc.setFillColor(...GOLD); doc.roundedRect(10,4.5,13,13,1.5,1.5,"F");
  if (logo) doc.addImage(logo,"PNG",11,5.5,11,11);
  else { doc.setTextColor(...NAVY); doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.text("R",16.5,13.5,{align:"center"}); }

  doc.setTextColor(...WHITE); doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text("ROBOTEK",26,13);
  doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(180,210,255);
  doc.text("MIS PERFORMANCE REPORT",26,18.5);

  // Right side — bigger fonts
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text(username.toUpperCase(), PW-10, 10, {align:"right"});
  doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(200,220,255);
  doc.text(`${fmtShort(from)}  –  ${fmtShort(to)}`, PW-10, 17, {align:"right"});
  doc.setTextColor(...GOLD); doc.setFontSize(7);
  doc.text(`Page ${page} / ${total}`, PW-10, 21, {align:"right"});
}

// ─── Gauge bar ────────────────────────────────────────────────────────────
function drawGauge(doc: jsPDF, x: number, y: number, barW: number,
  value: number, total: number, label: string, isNeg: boolean) {
  const has  = total > 0;
  const pct  = has ? (isNeg ? Math.max(0,100-value) : Math.min(100,Math.max(0,value))) : 0;
  const disp = has ? `${isNeg ? value-100 : value}%` : "—";
  const col  = has ? scoreColor(value) : GRAY;

  doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY);
  doc.text(label,x,y-1.5);
  doc.setFillColor(220,228,240); doc.roundedRect(x,y,barW,4.5,0.8,0.8,"F");
  if (pct>0){ doc.setFillColor(...col); doc.roundedRect(x,y,(pct/100)*barW,4.5,0.8,0.8,"F"); }
  doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(...col);
  doc.text(disp, x+barW, y+4.5, {align:"right"});
}

// ─── Single stat tile ─────────────────────────────────────────────────────
function drawTile(doc: jsPDF, x: number, y: number, w: number, h: number,
  value: string|number, label: string, sub: string, color: [number,number,number]) {
  doc.setFillColor(...color); doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(5); doc.setFont("helvetica","normal");
  doc.text(sub, x+w/2, y+5.5, {align:"center"});
  doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text(String(value), x+w/2, y+h/2+3, {align:"center"});
  doc.setFontSize(5.5); doc.setFont("helvetica","normal");
  doc.text(label.toUpperCase(), x+w/2, y+h-3.5, {align:"center"});
}

// ─── Trend table (Score % + On-Time % per period) ─────────────────────────
function drawTrendTable(doc: jsPDF, M: number, startY: number, CW: number,
  trendData: any[], isNeg: boolean, color: [number,number,number], title: string): number {
  if (!trendData || trendData.length < 2) return startY;

  doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...NAVY);
  doc.text(title, M, startY); 

  const makeRow = (key: string, lbl: string) => [
    lbl,
    ...trendData.map((d:any) => {
      const noD = key==="onTime" ? d.completed===0 : d.total===0;
      if (noD) return "—";
      return `${isNeg ? (d[key]-100) : d[key]}%`;
    })
  ];

  autoTable(doc, {
    startY: startY+3,
    margin: {left:M, right:M},
    head: [["Metric", ...trendData.map((d:any)=>d.label)]],
    body: [makeRow("score","Score %"), makeRow("onTime","On-Time %")],
    theme: "striped",
    headStyles: {fillColor:color, textColor:WHITE, fontSize:6, fontStyle:"bold", halign:"center"},
    bodyStyles: {fontSize:6.5, halign:"center", valign:"middle"},
    columnStyles: {0:{halign:"left", fontStyle:"bold", cellWidth:24}},
    didParseCell: (d) => {
      if (d.section==="body" && d.column.index>0) {
        const v = parseInt(String(d.cell.raw).replace("%",""));
        if (!isNaN(v)) d.cell.styles.textColor = v>=80||v<=-20 ? EMERALD : v>=50||v<=-50 ? AMBER : ROSE;
      }
    },
  });
  return (doc as any).lastAutoTable.finalY + 5;
}

// ─── Main export ─────────────────────────────────────────────────────────
export async function generateUserPDF(
  userToPrint: any,
  dateRange: {from:string; to:string},
  isNegativeMode: boolean,
  chartGranularity: string,
  calculateDelayHours: (items:any[]) => {total:number; avg:number},
  generateTrendData: (items:any[], range:any, gran:string) => any[],
  getTaskDelayMs: (item:any) => number,
  formatDuration: (ms:number) => string|null
) {
  const logo = await loadImg("/logo_compact.png");
  const doc  = new jsPDF("p","mm","a4");
  const PW   = doc.internal.pageSize.getWidth();
  const M    = 14, CW = PW - M*2;
  const fmtNum = (v:number) => isNegativeMode ? v-100 : v;
  const username = userToPrint.user.username;

  // ── Data ──────────────────────────────────────────────────────────────
  const allItems = [
    ...(userToPrint.delegationStats?.items||[]),
    ...(userToPrint.checklistStats?.items ||[]),
    ...(userToPrint.o2dStats?.items       ||[]),
    ...(userToPrint.scotStats?.items      ||[]),
  ];
  const totalDelayed = allItems.filter((i:any)=>i.isLate).length;
  const pendingCount = userToPrint.total - userToPrint.completed;
  const delayStats   = calculateDelayHours(allItems);

  const trendTo=new Date(dateRange.to), trendFrom=new Date(trendTo);
  if      (chartGranularity==="week")      trendFrom.setDate(trendTo.getDate()-70);
  else if (chartGranularity==="month")     trendFrom.setMonth(trendTo.getMonth()-10);
  else if (chartGranularity==="day")       trendFrom.setDate(trendTo.getDate()-14);
  else if (chartGranularity==="quarterly") trendFrom.setMonth(trendTo.getMonth()-30);
  else                                     trendFrom.setFullYear(trendTo.getFullYear()-5);
  const trendRange = {from:trendFrom.toISOString().split("T")[0], to:dateRange.to};

  const categories = [
    {label:"DELEGATIONS",   dispLabel:"Delegation",   items:userToPrint.delegationStats?.items||[], color:[234,88, 12] as [number,number,number]},
    {label:"CHECKLISTS",    dispLabel:"Checklist",    items:userToPrint.checklistStats?.items ||[], color:[5, 150,105] as [number,number,number]},
    {label:"O2D FMS JOBS",  dispLabel:"O2D FMS Jobs", items:userToPrint.o2dStats?.items       ||[], color:[37, 99,235] as [number,number,number]},
    {label:"SCOT TRACKING", dispLabel:"SCOT Tracking",items:userToPrint.scotStats?.items      ||[], color:[124,58,237] as [number,number,number]},
  ];

  const TOTAL_PAGES = 5;

  // ════════════════════════════════════════════════════════════════════
  // PAGE 1 — SUMMARY
  // ════════════════════════════════════════════════════════════════════
  drawHeader(doc,PW,1,TOTAL_PAGES,username,dateRange.from,dateRange.to,logo);
  let y = 29;

  // Profile card
  doc.setFillColor(230,240,255); doc.roundedRect(M,y,CW,36,3,3,"F");
  doc.setFillColor(...NAVY);     doc.roundedRect(M,y,4,36,2,2,"F");

  // Avatar — larger circle + much bigger initial
  doc.setFillColor(...NAVY); doc.circle(M+22,y+18,12,"F");
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.2); doc.circle(M+22,y+18,12,"S");
  doc.setTextColor(...WHITE); doc.setFontSize(22); doc.setFont("helvetica","bold");
  doc.text(username.charAt(0).toUpperCase(), M+22, y+23.5, {align:"center"});

  // Name / chip / info
  doc.setTextColor(...NAVY); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text(username.toUpperCase(), M+40, y+12);
  if (userToPrint.user.roleName) {
    doc.setFillColor(...NAVY); doc.roundedRect(M+40,y+15,26,5.5,1,1,"F");
    doc.setTextColor(...WHITE); doc.setFontSize(6.5);
    doc.text(userToPrint.user.roleName.toUpperCase(), M+53,y+19.5,{align:"center"});
  }
  doc.setTextColor(...GRAY); doc.setFontSize(7.5); doc.setFont("helvetica","normal");
  if (userToPrint.user.designation) doc.text(userToPrint.user.designation, M+40, y+27);
  if (userToPrint.user.office)      doc.text(`Office: ${userToPrint.user.office}`, M+40, y+33);

  // Gauges — right side of card, fixed layout
  const gaugeStartX = M+116, gaugeBarW = 56;
  doc.setFillColor(210,228,250); doc.roundedRect(gaugeStartX-4,y+2,70,32,2,2,"F");
  drawGauge(doc,gaugeStartX,y+10,gaugeBarW,userToPrint.score,     userToPrint.total,    "Score %",   isNegativeMode);
  drawGauge(doc,gaugeStartX,y+24,gaugeBarW,userToPrint.onTimeRate,userToPrint.completed,"On-Time %", isNegativeMode);
  y += 42;

  // 6 stat tiles — single row
  const tiles = [
    {v:userToPrint.total,     l:"Total Tasks",    s:"All assigned",     c:NAVY   },
    {v:userToPrint.completed, l:"Completed",      s:"Done on time",     c:EMERALD},
    {v:pendingCount,          l:"Pending",        s:"Not yet done",     c:AMBER  },
    {v:totalDelayed,          l:"Delayed",        s:"Past due date",    c:ROSE   },
    {v:delayStats.total,      l:"Total Delay Hrs",s:"Cumulative hrs",   c:DKRED  },
    {v:delayStats.avg,        l:"Avg Delay Hrs",  s:"Per delayed task", c:PURPLE },
  ];
  const tw = (CW-5)/6;
  tiles.forEach((t,i) => drawTile(doc,M+i*(tw+1),y,tw,24,t.v,t.l,t.s,t.c));
  y += 30;

  // ── Overall trend table (replaces chart) ─────────────────────────────
  const overallTrend = generateTrendData(allItems, trendRange, chartGranularity);
  y = drawTrendTable(doc, M, y, CW, overallTrend, isNegativeMode, NAVY, "OVERALL PERFORMANCE TREND");

  // Overall category table
  doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...NAVY);
  doc.text("CATEGORY PERFORMANCE", M, y); y+=3;

  const catRows = [
    ["Delegations",  userToPrint.delegationStats],
    ["Checklists",   userToPrint.checklistStats],
    ["O2D FMS Jobs", userToPrint.o2dStats],
    ["SCOT Tracking",userToPrint.scotStats],
  ].map(([lbl,s]:any) => {
    const del=(s?.items||[]).filter((i:any)=>i.isLate).length;
    return [lbl, s?.total||0, s?.completed||0, (s?.total||0)-(s?.completed||0), del,
      s?.total===0?"—":`${fmtNum(s?.score||0)}%`,
      s?.completed===0?"—":`${fmtNum(s?.onTimeRate||0)}%`];
  });
  autoTable(doc,{
    startY:y, margin:{left:M,right:M},
    head:[["Category","Total","Done","Pending","Delayed","Score %","On-Time %"]],
    body:catRows, theme:"striped",
    headStyles:{fillColor:NAVY,textColor:GOLD,fontSize:7,fontStyle:"bold",halign:"center"},
    bodyStyles:{fontSize:7.5,valign:"middle",halign:"center"},
    columnStyles:{0:{halign:"left",fontStyle:"bold",cellWidth:38}},
    didParseCell:(d)=>{
      if (d.section==="body"&&(d.column.index===5||d.column.index===6)){
        const v=parseInt(String(d.cell.raw).replace("%",""));
        if (!isNaN(v)) d.cell.styles.textColor=v>=80||v<=-20?EMERALD:v>=50?AMBER:ROSE;
      }
      if (d.section==="body"&&d.column.index===4&&Number(d.cell.raw)>0) d.cell.styles.textColor=ROSE;
    },
  });
  y=(doc as any).lastAutoTable.finalY+8;

  // All 4 category weekly/period trend tables — on Page 1 (overflow naturally to page 2 if needed)
  categories.forEach(cat=>{
    const catTrend = generateTrendData(cat.items, trendRange, chartGranularity);
    y = drawTrendTable(doc,M,y,CW,catTrend,isNegativeMode,cat.color,`${cat.dispLabel} — Weekly Performance`);
  });

  // ════════════════════════════════════════════════════════════════════
  // PAGES 2-5 — TASK DETAIL LISTS PER CATEGORY
  // ════════════════════════════════════════════════════════════════════
  categories.forEach((cat,pi)=>{
    doc.addPage();
    drawHeader(doc,PW,pi+2,TOTAL_PAGES,username,dateRange.from,dateRange.to,logo);
    let ty=29;

    // Title bar
    doc.setFillColor(...cat.color); doc.roundedRect(M,ty,CW,11,2,2,"F");
    doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont("helvetica","bold");
    doc.text(cat.label, M+5, ty+7.5);
    const d2=cat.items.filter((i:any)=>i.isLate).length;
    const dn=cat.items.filter((i:any)=>i.actualDate&&!i.isLate).length;
    const pd=cat.items.filter((i:any)=>!i.actualDate).length;
    doc.setFontSize(6.5); doc.setFont("helvetica","normal");
    doc.text(`${cat.items.length} Total  •  ${dn} Done  •  ${pd} Pending  •  ${d2} Delayed`,PW-M,ty+7.5,{align:"right"});
    ty+=15;

    if (cat.items.length===0){
      doc.setFontSize(9); doc.setTextColor(...GRAY);
      doc.text("No tasks for this category in the selected period.",M,ty+8);
    } else {
      const rows=cat.items.map((item:any)=>{
        const dlMs=getTaskDelayMs(item);
        const dlStr=dlMs>0?(formatDuration(dlMs)||"—"):"—";
        const status=item.actualDate&&dlMs<=0?"On Time":item.actualDate&&dlMs>0?"Late (Done)":dlMs>0?"Overdue":"Pending";
        return [item.title||"—",fmtDate(item.plannedDate),item.actualDate?fmtDate(item.actualDate):"—",status,dlStr];
      });
      autoTable(doc,{
        startY:ty, margin:{left:M,right:M},
        head:[["Task","Target","Done At","Status","Delay"]],
        body:rows, theme:"striped",
        headStyles:{fillColor:cat.color,textColor:WHITE,fontSize:7,fontStyle:"bold"},
        bodyStyles:{fontSize:7,valign:"middle"},
        columnStyles:{
          0:{cellWidth:83},1:{cellWidth:26,halign:"center"},
          2:{cellWidth:26,halign:"center"},3:{cellWidth:30,halign:"center",fontStyle:"bold"},
          4:{halign:"center"},
        },
        didParseCell:(d)=>{
          if (d.section==="body"&&d.column.index===3){
            const v=String(d.cell.raw);
            d.cell.styles.textColor=v==="On Time"?EMERALD:v==="Pending"?AMBER:ROSE;
          }
          if (d.section==="body"&&d.column.index===4&&d.cell.raw!=="—") d.cell.styles.textColor=ROSE;
        },
      });
    }
  });

  doc.save(`Robotek_MIS_${username}_${dateRange.from}.pdf`);
}
