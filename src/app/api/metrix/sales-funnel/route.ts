import { NextRequest, NextResponse } from "next/server";
import { salesService, followUpService } from "@/lib/sales-sheets";
import { auth } from "@/auth";

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

    const [allLeads, allFollowUps] = await Promise.all([
      salesService.getAll(),
      followUpService.getAll()
    ]);

    // Parse Date Filters
    let filteredLeads = allLeads;
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      filteredLeads = allLeads.filter(l => {
        if (!l.created_at) return false;
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      });
    }

    const parseAmount = (val: any) => {
      if (!val) return 0;
      const num = parseFloat(String(val).replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Define Funnel Logic
    const isLost = (status: string) => {
      const s = (status || "").toLowerCase().trim();
      return ['lost', 'not qualified lead', 'potential lead but not interesting', 'deal in reserved area'].includes(s);
    };

    const isWon = (status: string) => {
      const s = (status || "").toLowerCase().trim();
      return ['1st billing', '2nd billing', '3rd billing', 'existing customer'].includes(s);
    };

    const isEngaged = (status: string) => {
      const s = (status || "").toLowerCase().trim();
      return ['arrange meeting', 'demonstration', 'transferred to ss', 'negotiation'].includes(s) || isWon(s);
    };

    const isQualified = (status: string, qualifiedStatus: string) => {
      const s = (status || "").toLowerCase().trim();
      const qs = (qualifiedStatus || "").toLowerCase().trim();
      if (qs === 'qualified') return true;
      if (['qualifying process', 'transferring process', 'lead generated'].includes(s)) return false;
      if (isLost(s) && qs !== 'qualified') return false; // Not qualified if lost before qualifying
      return isEngaged(s);
    };

    let totalLeadsCount = 0;
    let totalPipelineValue = 0;
    let qualifiedCount = 0;
    let engagedCount = 0;
    let wonCount = 0;
    let wonValue = 0;

    const sourceStatsMap: Record<string, { count: number, wonCount: number, amount: number, wonAmount: number }> = {};
    const teamStatsMap: Record<string, { count: number, wonCount: number, amount: number, wonAmount: number }> = {};
    const trendDataMap: Record<string, { date: string, generated: number, won: number }> = {};

    const qualStatsMap: Record<string, number> = { "Qualified": 0, "Not Qualified": 0, "Pending": 0 };
    const priorityStatsMap: Record<string, number> = { "High": 0, "Medium": 0, "Low": 0, "None": 0 };
    const processStatsMap: Record<string, number> = {};

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const getTrendKey = (date: Date, gran: string) => {
      const y = date.getFullYear();
      const m = date.getMonth();
      if (gran === 'day') return date.toISOString().split('T')[0];
      if (gran === 'week') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const startOfWeek = new Date(d.setDate(diff));
        return startOfWeek.toISOString().split('T')[0];
      }
      if (gran === 'quarter') {
        const q = Math.floor(m / 3) + 1;
        return `${y}-Q${q}`;
      }
      if (gran === 'year') return `${y}`;
      return `${y}-${String(m + 1).padStart(2, '0')}`;
    };

    const getTrendLabel = (key: string, gran: string) => {
      if (gran === 'day') {
        const [y, m, d] = key.split('-');
        return `${d}-${months[parseInt(m) - 1]}`;
      }
      if (gran === 'week') {
        const [y, m, d] = key.split('-');
        return `W/C ${d}-${months[parseInt(m) - 1]}`;
      }
      if (gran === 'quarter') {
        const [y, q] = key.split('-');
        return `${q}-${y}`;
      }
      if (gran === 'year') return key;
      const [y, m] = key.split('-');
      return `${months[parseInt(m) - 1]}-${y}`;
    };

    filteredLeads.forEach(lead => {
      const amount = parseAmount(lead.investment_amount);
      const status = lead.status || "";
      const qs = lead.qualified_status || "";
      const source = lead.sources_of_customer || "Unknown";
      const team = lead.sales_person_assigned || "Unassigned";

      // Basic Funnel Counts
      totalLeadsCount++;
      totalPipelineValue += amount;
      
      const q = isQualified(status, qs);
      const e = isEngaged(status);
      const w = isWon(status);

      if (q) qualifiedCount++;
      if (e) engagedCount++;
      if (w) {
        wonCount++;
        wonValue += amount;
      }

      // Source Stats
      if (!sourceStatsMap[source]) sourceStatsMap[source] = { count: 0, wonCount: 0, amount: 0, wonAmount: 0 };
      sourceStatsMap[source].count++;
      sourceStatsMap[source].amount += amount;
      if (w) {
        sourceStatsMap[source].wonCount++;
        sourceStatsMap[source].wonAmount += amount;
      }

      // Team Stats
      if (!teamStatsMap[team]) teamStatsMap[team] = { count: 0, wonCount: 0, amount: 0, wonAmount: 0 };
      teamStatsMap[team].count++;
      teamStatsMap[team].amount += amount;
      if (w) {
        teamStatsMap[team].wonCount++;
        teamStatsMap[team].wonAmount += amount;
      }

      // Trend Stats (based on created date)
      if (lead.created_at) {
        const d = new Date(lead.created_at);
        const key = getTrendKey(d, granularity);
        if (!trendDataMap[key]) {
          trendDataMap[key] = { date: key, generated: 0, won: 0 };
        }
        trendDataMap[key].generated++;
        if (w) {
          trendDataMap[key].won++; // Note: this attributes the 'win' to the lead creation date.
        }
      }

      // Qualification Stats
      if (qs === 'qualified') qualStatsMap["Qualified"]++;
      else if (['not qualified', 'not qualified lead'].includes(qs.toLowerCase())) qualStatsMap["Not Qualified"]++;
      else qualStatsMap["Pending"]++;

      // Priority Stats
      const priority = (lead.lead_priority_type || "None").trim();
      const pKey = ['high', 'medium', 'low'].includes(priority.toLowerCase()) ? priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase() : "None";
      if (priorityStatsMap[pKey] !== undefined) priorityStatsMap[pKey]++;

      // Process Stats
      const proc = (status || "Unknown").trim();
      const procKey = proc ? proc.charAt(0).toUpperCase() + proc.slice(1).toLowerCase() : "Unknown";
      processStatsMap[procKey] = (processStatsMap[procKey] || 0) + 1;
    });

    const followUpStatsMap: Record<string, number> = {};
    const filteredLeadIds = new Set(filteredLeads.map(l => l.id));
    allFollowUps.forEach(f => {
      if (filteredLeadIds.has(f.lead_id)) {
        const s = (f.status || "Unknown").trim();
        const sKey = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Unknown";
        followUpStatsMap[sKey] = (followUpStatsMap[sKey] || 0) + 1;
      }
    });

    const formatDonut = (map: Record<string, number>) => Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

    const funnelStages = [
      { stage: "Total Leads", count: totalLeadsCount, value: totalPipelineValue, conversionRate: 100 },
      { stage: "Qualified", count: qualifiedCount, value: 0, conversionRate: totalLeadsCount > 0 ? Math.round((qualifiedCount / totalLeadsCount) * 100) : 0 },
      { stage: "Engaged", count: engagedCount, value: 0, conversionRate: qualifiedCount > 0 ? Math.round((engagedCount / qualifiedCount) * 100) : 0 },
      { stage: "Won", count: wonCount, value: wonValue, conversionRate: engagedCount > 0 ? Math.round((wonCount / engagedCount) * 100) : 0 },
    ];

    const sourceStats = Object.entries(sourceStatsMap)
      .map(([source, stats]) => ({
        source,
        ...stats,
        conversionRate: stats.count > 0 ? Math.round((stats.wonCount / stats.count) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const teamStats = Object.entries(teamStatsMap)
      .map(([salesperson, stats]) => ({
        salesperson,
        ...stats,
        conversionRate: stats.count > 0 ? Math.round((stats.wonCount / stats.count) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const trendData = Object.values(trendDataMap)
      .map(t => ({
        ...t,
        displayDate: getTrendLabel(t.date, granularity)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15);

    return NextResponse.json({
      summary: {
        totalLeads: totalLeadsCount,
        pipelineValue: totalPipelineValue,
        wonValue: wonValue,
        winRate: totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0,
      },
      funnelStages,
      sourceStats,
      teamStats,
      trendData,
      deepDive: {
        qualification: formatDonut(qualStatsMap),
        priority: formatDonut(priorityStatsMap),
        process: formatDonut(processStatsMap).sort((a, b) => b.value - a.value),
        followUp: formatDonut(followUpStatsMap).sort((a, b) => b.value - a.value)
      }
    });

  } catch (error: any) {
    console.error("Sales Funnel API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
