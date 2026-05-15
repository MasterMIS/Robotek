"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import CooReport from "@/components/CooReport";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  HandThumbUpIcon,
  CheckBadgeIcon,
  ShareIcon,
  DocumentTextIcon,
  ArrowPathRoundedSquareIcon,
  InboxArrowDownIcon,
  CurrencyDollarIcon,
  ClipboardIcon,
  ArrowLeftIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ComposedChart,
  Bar,
  BarChart,
  ReferenceLine,
} from "recharts";


const fetcher = (url: string) => fetch(url).then(res => res.json());

// --- Icons for Steps ---
const STEP_ICONS = [
  ClipboardIcon, MagnifyingGlassIcon, HandThumbUpIcon, CheckBadgeIcon, ArchiveBoxIcon,
  ShareIcon, DocumentTextIcon, ArrowPathRoundedSquareIcon, TruckIcon, InboxArrowDownIcon, CurrencyDollarIcon
];

// --- Helper Components ---

const CompactTile = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-navy-800 p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl ring-1 ring-black/5 flex items-center gap-3">
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <h4 className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">{value}</h4>
    </div>
  </div>
);

const TrendTable = ({ title, data, type }: { title: string, data: any[], type: 'count' | 'amount' }) => (
  <div className="bg-white dark:bg-navy-800 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden h-full">
    <div className="p-4 border-b border-gray-50 dark:border-white/5">
      <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{title}</h3>
    </div>
    <div className="overflow-auto max-h-[300px] custom-scrollbar">
      <table className="w-full text-left">
        <thead className="bg-gray-50 dark:bg-white/5 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase">Month</th>
            <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase text-right">{type === 'count' ? 'Orders' : 'Revenue'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300">{row.month}</td>
              <td className="px-4 py-2 text-[10px] font-black text-gray-900 dark:text-white text-right">
                {type === 'count' ? row.count : `${(row.amount / 100000).toFixed(2)}L`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- Main Page ---

export default function MetrixPage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("overview");
  const [drillDownParty, setDrillDownParty] = useState<any>(null);
  const [drillDownCategory, setDrillDownCategory] = useState<any>(null);
  const [forecastType, setForecastType] = useState("category");
  const [forecastTarget, setForecastTarget] = useState("");
  const [granularity, setGranularity] = useState("month");

  const { data, error, isLoading, isValidating } = useSWR(
    `/api/metrix?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&targetDate=${targetDate}&granularity=${granularity}`,
    fetcher,
    { keepPreviousData: true }
  );

  const { data: cooData, isLoading: cooLoading } = useSWR(
    activeTab === "forecast"
      ? `/api/metrix/coo?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&granularity=${granularity}`
      : null,
    fetcher,
    { keepPreviousData: true, refreshInterval: 300000 }
  );


  const [roadmapSearchQuery, setRoadmapSearchQuery] = useState("");
  const [extraRoadmapOrders, setExtraRoadmapOrders] = useState<any[]>([]);

  const colors = ["#003875", "#FFD500", "#CE2029", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

  const forecastData = useMemo(() => {
    if (!data) return [];
    let history: any[] = [];
    if (forecastType === "category") {
      const cat = data.categories.all.find((c: any) => c.category === forecastTarget);
      history = cat?.history || [];
    } else if (forecastType === "party") {
      const p = data.parties.all.find((p: any) => p.party === forecastTarget);
      history = p?.history || [];
    }
    if (history.length < 2) return [];
    const dailyAvg = history.reduce((sum, h) => sum + h.amount, 0) / history.length;
    const lastDate = new Date(history[history.length - 1].date);
    const results = [...history.map(h => ({ ...h, isForecast: false }))];
    for (let i = 1; i <= 4; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + (i * 7));
      results.push({
        date: nextDate.toISOString().split('T')[0],
        amount: Math.round(dailyAvg * (1 + (Math.random() * 0.2 - 0.1))),
        isForecast: true
      });
    }
    return results;
  }, [data, forecastType, forecastTarget]);

  if (error) return <div className="p-10 text-rose-500 font-black uppercase text-[10px] bg-white dark:bg-navy-800 rounded-3xl border border-rose-100 m-4 shadow-xl flex items-center gap-3">
    <ExclamationCircleIcon className="w-5 h-5" />
    <span>Critical Error: Failed to synchronize logistics engine.</span>
  </div>;

  if (!data && isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#fcfaf4] dark:bg-navy-950">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
        className="w-12 h-12 border-4 border-gray-100 border-t-[#003875] dark:border-t-[#FFD500] rounded-full mb-6 shadow-sm" 
      />
      <div className="text-center">
        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] animate-pulse">Syncing Metrix Intelligence</p>
        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2">Connecting to Logistics Core...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfaf4] dark:bg-navy-950 p-2 lg:p-3 custom-scrollbar">
      <div className="w-full space-y-3">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-navy-800 p-3 rounded-2xl border border-gray-100 dark:border-white/5 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#003875] dark:bg-[#FFD500] rounded-xl relative">
              <ChartBarIcon className="w-5 h-5 text-white dark:text-[#003875]" />
              {isValidating && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">O2D <span className="text-[#003875] dark:text-[#FFD500] italic">ENGINE</span></h1>
              <p className="text-gray-400 font-bold text-[8px] uppercase tracking-widest mt-1">Analytics Control Center</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-navy-900 p-1 rounded-xl">
              {([
                { key: "overview", label: "Overview" },
                { key: "roadmap", label: "Roadmap" },
                { key: "parties", label: "Parties" },
                { key: "categories", label: "Categories" },
                { key: "forecast", label: "⚡ COO Report" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setDrillDownParty(null); setDrillDownCategory(null); }}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === key
                      ? key === "forecast"
                        ? 'bg-[#003875] text-white shadow-sm'
                        : 'bg-white dark:bg-navy-800 text-[#003875] dark:text-[#FFD500] shadow-sm'
                      : key === "forecast"
                        ? 'text-[#003875] dark:text-amber-400 hover:text-[#003875]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {label}
                </button>
              ))}

            </div>

            <div className="flex items-center gap-1 bg-gray-50 dark:bg-navy-900 p-1 rounded-xl border border-gray-100 dark:border-white/5">
              {[
                { id: 'day', label: 'Day', color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
                { id: 'week', label: 'Week', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
                { id: 'month', label: 'Month', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
                { id: 'quarter', label: 'Quarterly', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' },
                { id: 'year', label: 'Yearly', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGranularity(g.id)}
                  className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${granularity === g.id
                      ? `${g.color} shadow-sm ring-1 ring-black/5`
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-navy-900 p-1.5 rounded-xl border border-gray-100 dark:border-white/5">
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-transparent border-none text-[9px] font-black text-gray-600 dark:text-gray-300 outline-none w-24"
              />
              <span className="text-gray-300 text-[9px] font-black">TO</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-transparent border-none text-[9px] font-black text-gray-600 dark:text-gray-300 outline-none w-24"
              />
              {(dateRange.startDate || dateRange.endDate) && (
                <button onClick={() => setDateRange({ startDate: "", endDate: "" })} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                  <XMarkIcon className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Left Column (40% approx - lg:col-span-5) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* Tiles */}
                  <div className="grid grid-cols-2 gap-3 h-fit">
                    <CompactTile label="Orders" value={data.stats.total} icon={ShoppingBagIcon} color="bg-blue-600" />
                    <CompactTile label="Revenue" value={`${(data.stats.totalAmount / 100000).toFixed(1)}L`} icon={CurrencyDollarIcon} color="bg-[#003875]" />
                    <CompactTile label="OTD Count" value={data.stats.otdCount} icon={CheckBadgeIcon} color="bg-emerald-600" />
                    <CompactTile label="Delayed" value={data.stats.delayedCount} icon={ExclamationCircleIcon} color="bg-rose-600" />
                    <CompactTile label="Pending" value={data.stats.pending} icon={ArrowPathIcon} color="bg-amber-600" />
                    <CompactTile label="OTD %" value={`${data.stats.otdRate}%`} icon={ChartBarIcon} color="bg-indigo-600" />
                  </div>

                  {/* Delivery Performance (OTD %) */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5 flex-1">
                    <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Delivery Performance (OTD %)</h3>
                    <div className="h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="otdRate" stroke="#003875" strokeWidth={3} dot={{ r: 3, fill: "#003875" }}>
                            <LabelList dataKey="otdRate" position="top" offset={10} style={{ fontSize: 12, fontWeight: 900, fill: '#003875' }} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Right Column (60% approx - lg:col-span-7) */}
                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Party Distribution Analysis */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5 flex flex-col h-full min-h-[400px]">
                    <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-8 border-b pb-4 border-gray-50 dark:border-white/5">Party Distribution Analysis</h3>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="w-full h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                            <Pie
                              data={data.parties.top20.slice(0, 8)}
                              cx="50%" cy="50%"
                              innerRadius={35} outerRadius={60}
                              paddingAngle={5}
                              dataKey="count" nameKey="party"
                              label={({ party, percent }: any) => {
                                const safeName = String(party || "Unknown");
                                const truncated = safeName.length > 12 ? safeName.slice(0, 12) + '...' : safeName;
                                return `${truncated} (${(percent * 100).toFixed(0)}%)`;
                              }}
                              labelLine={true}
                            >
                              {data.parties.top20.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-6 space-y-2 w-full">
                        {data.parties.top20.slice(0, 5).map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                              <p className="text-[11px] font-black uppercase text-gray-900 dark:text-white truncate">{p.party}</p>
                            </div>
                            <p className="text-[11px] font-black text-[#003875] dark:text-[#FFD500]">{p.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category Market Share */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5 flex flex-col h-full min-h-[400px]">
                    <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-8 border-b pb-4 border-gray-50 dark:border-white/5">Category Market Share</h3>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="w-full h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                            <Pie
                              data={data.categories.top20.slice(0, 8)}
                              cx="50%" cy="50%"
                              innerRadius={35} outerRadius={60}
                              paddingAngle={5}
                              dataKey="count" nameKey="category"
                              label={({ category, percent }: any) => {
                                const safeName = String(category || "Unknown");
                                const truncated = safeName.length > 12 ? safeName.slice(0, 12) + '...' : safeName;
                                return `${truncated} (${(percent * 100).toFixed(0)}%)`;
                              }}
                              labelLine={true}
                            >
                              {data.categories.top20.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-6 space-y-2 w-full">
                        {data.categories.top20.slice(0, 5).map((c: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                              <p className="text-[11px] font-black uppercase text-gray-900 dark:text-white truncate">{c.category}</p>
                            </div>
                            <p className="text-[11px] font-black text-[#003875] dark:text-[#FFD500]">{(c.amount / 1000).toFixed(0)}k</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Trend Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* Monthly Revenue Flow */}
                <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                  <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-8 border-b pb-4 border-gray-50 dark:border-white/5">Monthly Revenue Flow (Lacs)</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.trends} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                        <YAxis axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} tickFormatter={(val) => `${(val / 100000).toFixed(1)}L`} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={4} dot={{ r: 4, fill: "#10B981" }}>
                          <LabelList dataKey="amount" position="top" offset={12} style={{ fontSize: 12, fontWeight: 900, fill: '#10B981' }} formatter={(val: any) => `${(val / 100000).toFixed(1)}L`} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Order Velocity */}
                <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                  <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-8 border-b pb-4 border-gray-50 dark:border-white/5">Monthly Order Velocity</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.trends} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                        <YAxis axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="count" stroke="#003875" strokeWidth={4} dot={{ r: 4, fill: "#003875" }}>
                          <LabelList dataKey="count" position="top" offset={12} style={{ fontSize: 12, fontWeight: 900, fill: '#003875' }} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "parties" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!drillDownParty ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top 20 Parties */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                      <h3 className="text-sm font-black text-emerald-600 uppercase tracking-tight flex items-center gap-2">
                        <ArrowUpCircleIcon className="w-5 h-5" /> Top 20 Performers
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {data.parties.top20.map((p: any, idx: number) => (
                        <button key={idx} onClick={() => setDrillDownParty(p)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-left group border border-transparent hover:border-emerald-200">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-emerald-500 transition-colors">#{idx + 1}</span>
                            <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{p.party}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-emerald-600">{p.count} Orders</p>
                            <p className="text-[9px] font-bold text-gray-400">{(p.amount / 100000).toFixed(2)}L INR</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom 20 Parties */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                      <h3 className="text-sm font-black text-rose-600 uppercase tracking-tight flex items-center gap-2">
                        <ArrowDownCircleIcon className="w-5 h-5" /> At Risk (Bottom 20)
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {data.parties.bottom20.map((p: any, idx: number) => (
                        <button key={idx} onClick={() => setDrillDownParty(p)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left group border border-transparent hover:border-rose-200">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-rose-500 transition-colors">#{idx + 1}</span>
                            <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{p.party}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-rose-600">{p.count} Orders</p>
                            <p className="text-[9px] font-bold text-gray-400">{(p.amount / 1000).toFixed(1)}k INR</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-navy-800 p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                  <button onClick={() => setDrillDownParty(null)} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] font-black uppercase text-[10px] mb-6 hover:translate-x-[-4px] transition-transform">
                    <ArrowLeftIcon className="w-4 h-4" /> Back to List
                  </button>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Stats & Charts */}
                    <div className="lg:col-span-4 space-y-3">
                      <div className="p-4 bg-[#FFD500] rounded-2xl text-[#003875] shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Party Analysis</h4>
                        <h2 className="text-xl font-black mt-1 leading-tight uppercase">{drillDownParty.party}</h2>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#003875]/10 pt-4">
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Business</p><p className="text-lg font-black text-[#003875]">{(drillDownParty.amount / 100000).toFixed(2)}L</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Orders</p><p className="text-lg font-black text-[#003875]">{drillDownParty.count}</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">OTD Success</p><p className="text-lg font-black text-emerald-600">{drillDownParty.otdRate}%</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Delayed</p><p className="text-lg font-black text-rose-600">{drillDownParty.delayedCount}</p></div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-white/5 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase mb-3 px-1">Category Mix (%)</h4>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={drillDownParty.categoryList.slice(0, 5)}
                                cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5}
                                dataKey="count" nameKey="category"
                                label={({ category, percent }: any) => `${category.slice(0, 8)} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={false}
                              >
                                {drillDownParty.categoryList.slice(0, 5).map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-white/5 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase mb-3 px-1 text-rose-600 flex items-center gap-2"><SparklesIcon className="w-3 h-3" /> Pitch Opportunities</h4>
                        <div className="space-y-1">
                          {drillDownParty.untappedCategories.slice(0, 5).map((uc: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-navy-800 rounded-lg border border-gray-100 dark:border-white/5">
                              <p className="text-[9px] font-black uppercase text-gray-900 dark:text-white truncate">{uc.category}</p>
                              <div className="text-right">
                                <p className="text-[7px] font-bold text-gray-400 uppercase">Avg Sale</p>
                                <p className="text-[8px] font-black text-rose-500">{(uc.marketAvg / 1000).toFixed(1)}k</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Trend Charts */}
                    <div className="lg:col-span-8 space-y-3">
                      <div className="bg-white dark:bg-white/5 p-4 rounded-3xl h-[350px] shadow-2xl ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Order & Revenue Velocity (Week Wise)</h4>
                          <div className="flex gap-3">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#003875]" /><span className="text-[7px] font-black uppercase">Revenue</span></div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[7px] font-black uppercase">Orders</span></div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drillDownParty.history} margin={{ top: 20, right: 30, left: 40, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                              dataKey="displayDate"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }}
                              dy={5}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#003875" strokeWidth={3} dot={{ r: 4, fill: '#003875' }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="amount" position="top" offset={10} formatter={(val: any) => `${(val / 100000).toFixed(1)}L`} style={{ fontSize: 12, fontWeight: 900, fill: '#003875' }} />
                            </Line>
                            <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="count" position="bottom" offset={10} style={{ fontSize: 12, fontWeight: 900, fill: '#10B981' }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white dark:bg-white/5 p-4 rounded-3xl h-[250px] shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">OTD% Performance Trend</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drillDownParty.history} margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Line type="monotone" dataKey="otdRate" stroke="#003875" strokeWidth={3} dot={{ r: 3, fill: "#003875" }}>
                              <LabelList dataKey="otdRate" position="top" offset={10} style={{ fontSize: 12, fontWeight: 900, fill: '#003875' }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white dark:bg-navy-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
                        <h4 className="text-[10px] font-black uppercase mb-4 text-gray-400 tracking-widest">Active Category Performance</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-50 dark:border-white/5">
                              <tr><th className="py-3 px-2">Category</th><th className="py-3 px-2 text-right">Transactions</th><th className="py-3 px-2 text-right">Total Revenue</th><th className="py-3 px-2 text-right">Avg Order</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                              {drillDownParty.categoryList.map((c: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-3 px-2 text-[10px] font-black text-gray-900 dark:text-white uppercase">{c.category}</td>
                                  <td className="py-3 px-2 text-[10px] font-black text-[#003875] dark:text-[#FFD500] text-right">{c.count}</td>
                                  <td className="py-3 px-2 text-[10px] font-black text-gray-900 dark:text-white text-right">{(c.amount / 1000).toFixed(1)}k</td>
                                  <td className="py-3 px-2 text-[10px] font-bold text-emerald-600 text-right">{(c.amount / (c.count || 1) / 1000).toFixed(1)}k</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "categories" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!drillDownCategory ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top 20 Categories */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                      <h3 className="text-sm font-black text-emerald-600 uppercase tracking-tight flex items-center gap-2">
                        <ArrowUpCircleIcon className="w-5 h-5" /> Top 20 Categories
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {data.categories.top20.map((c: any, idx: number) => (
                        <button key={idx} onClick={() => setDrillDownCategory(c)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-left group border border-transparent hover:border-emerald-200">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-emerald-500 transition-colors">#{idx + 1}</span>
                            <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate">{c.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-emerald-600">{c.count} Items</p>
                            <p className="text-[9px] font-bold text-gray-400">{(c.amount / 100000).toFixed(2)}L INR</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom 20 Categories */}
                  <div className="bg-white dark:bg-navy-800 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                      <h3 className="text-sm font-black text-rose-600 uppercase tracking-tight flex items-center gap-2">
                        <ArrowDownCircleIcon className="w-5 h-5" /> Bottom 20 Categories
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {data.categories.bottom20.map((c: any, idx: number) => (
                        <button key={idx} onClick={() => setDrillDownCategory(c)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left group border border-transparent hover:border-rose-200">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-rose-500 transition-colors">#{idx + 1}</span>
                            <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate">{c.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-rose-600">{c.count} Items</p>
                            <p className="text-[9px] font-bold text-gray-400">{(c.amount / 1000).toFixed(1)}k INR</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-navy-800 p-4 lg:p-5 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5">
                  <button onClick={() => setDrillDownCategory(null)} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] font-black uppercase text-[10px] mb-6 hover:translate-x-[-4px] transition-transform">
                    <ArrowLeftIcon className="w-4 h-4" /> Back to List
                  </button>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Stats */}
                    <div className="lg:col-span-4 space-y-3">
                      <div className="p-4 bg-[#FFD500] rounded-2xl text-[#003875] shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Category Analysis</h4>
                        <h2 className="text-xl font-black mt-1 leading-tight uppercase">{drillDownCategory.category}</h2>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#003875]/10 pt-4">
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Business</p><p className="text-lg font-black text-[#003875]">{(drillDownCategory.amount / 100000).toFixed(2)}L</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Quantity</p><p className="text-lg font-black text-[#003875]">{drillDownCategory.count}</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">OTD Success</p><p className="text-lg font-black text-emerald-600">{drillDownCategory.otdRate}%</p></div>
                          <div><p className="text-[8px] font-bold opacity-60 uppercase">Delayed</p><p className="text-lg font-black text-rose-600">{drillDownCategory.delayedCount}</p></div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-white/5 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 h-[600px] flex flex-col">
                        <h4 className="text-[9px] font-black uppercase mb-4 text-gray-400">Item Performance (Top 30 / Bottom 30)</h4>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                          {/* Top 30 */}
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-emerald-500 uppercase mb-2 px-1">Top Selling Items</p>
                            {drillDownCategory.top30Items.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-navy-900 rounded-lg">
                                <p className="text-[9px] font-black uppercase text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</p>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-emerald-600">{item.count} qty</p>
                                  <p className="text-[8px] font-bold text-gray-400">{(item.amount / 1000).toFixed(1)}k</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Bottom 30 */}
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-rose-500 uppercase mb-2 px-1">Bottom Selling Items</p>
                            {drillDownCategory.bottom30Items.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-navy-900 rounded-lg">
                                <p className="text-[9px] font-black uppercase text-gray-900 dark:text-white truncate max-w-[200px]">{item.name}</p>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-rose-600">{item.count} qty</p>
                                  <p className="text-[8px] font-bold text-gray-400">{(item.amount / 1000).toFixed(1)}k</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Chart */}
                    <div className="lg:col-span-8 space-y-3">
                      <div className="bg-white dark:bg-white/5 p-4 rounded-[2rem] h-[300px] shadow-2xl ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Monthly Segment Velocity (Qty vs Revenue)</h4>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#003875]" /><span className="text-[8px] font-black uppercase">Revenue</span></div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black uppercase">Quantity</span></div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drillDownCategory.history} margin={{ top: 20, right: 30, left: 30, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} dy={10} angle={-45} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#003875" strokeWidth={4} dot={{ r: 6, fill: '#003875' }}>
                              <LabelList dataKey="amount" position="top" offset={15} formatter={(val: any) => `${(val / 1000).toFixed(1)}k`} style={{ fontSize: 12, fontWeight: 900, fill: '#003875' }} />
                            </Line>
                            <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981' }}>
                              <LabelList dataKey="count" position="bottom" offset={15} style={{ fontSize: 12, fontWeight: 900, fill: '#10B981' }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white dark:bg-white/5 p-4 rounded-[2rem] h-[250px] shadow-2xl ring-1 ring-black/5">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">OTD% Performance Trend</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drillDownCategory.history} margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Line type="monotone" dataKey="otdRate" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: "#10B981" }}>
                              <LabelList dataKey="otdRate" position="top" offset={10} style={{ fontSize: 12, fontWeight: 900, fill: '#10B981' }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "forecast" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <CooReport data={cooData} loading={cooLoading} />
            </motion.div>
          )}

          {activeTab === "roadmap" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-navy-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-2xl ring-1 ring-black/5 mt-2">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-50 dark:border-white/5 pb-4">
               <div className="flex items-center gap-4">
                 <div><h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Execution Roadmap</h3><p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Real-time Logistics Lifecycle</p></div>
                 <div className="h-10 w-px bg-gray-100 dark:bg-white/10 hidden md:block" />
                 <div className="flex flex-col">
                   <p className="text-[10px] font-black text-gray-400 uppercase leading-none">{targetDate === new Date().toISOString().split('T')[0] ? "Today's Orders" : "Filtered Orders"}</p>
                   <p className="text-xl font-black text-[#003875] dark:text-[#FFD500] leading-none mt-1">{data.todayCount || 0}</p>
                 </div>
               </div>

                <div className="flex flex-wrap items-center gap-2">
                 <div className="flex items-center gap-2 bg-gray-50 dark:bg-navy-900 px-3 py-1.5 rounded-xl ring-1 ring-black/5">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    <input 
                      list="roadmap-orders"
                      type="text" 
                      placeholder="FIND ANY ORDER..." 
                      value={roadmapSearchQuery}
                      onChange={(e) => {
                        setRoadmapSearchQuery(e.target.value);
                        // Trigger API search for specific order if length > 2
                        if (e.target.value.length > 2) {
                           fetch(`/api/metrix?targetDate=${targetDate}&search=${e.target.value}`)
                             .then(res => res.json())
                             .then(newData => {
                                if (newData.roadmap && newData.roadmap.length > 0) {
                                  const found = newData.roadmap[0];
                                  setExtraRoadmapOrders((prev: any[]) => {
                                    if (prev.some(o => o.orderNo === found.orderNo)) return prev;
                                    return [found, ...prev];
                                  });
                                }
                             });
                        }
                      }}
                      className="bg-transparent border-none text-[10px] font-black text-[#003875] dark:text-[#FFD500] outline-none w-[180px] placeholder:text-gray-300"
                    />
                    <datalist id="roadmap-orders">
                       {data.searchableOrders?.map((o: any) => (
                         <option key={o.orderNo} value={o.orderNo}>{o.party}</option>
                       ))}
                    </datalist>
                 </div>
                 <div className="flex items-center gap-2 bg-gray-50 dark:bg-navy-900 px-3 py-1.5 rounded-xl ring-1 ring-black/5">
                   <CalendarIcon className="w-3.5 h-3.5 text-gray-400" /><input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-transparent border-none text-[9px] font-black text-[#003875] dark:text-[#FFD500] outline-none" />
                 </div>
               </div>
             </div>

             <div className="space-y-4">
                {[...extraRoadmapOrders, ...(data.roadmap || [])]
                  .filter((o, idx, self) => self.findIndex(t => t.orderNo === o.orderNo) === idx) // Unique
                  .filter(o => 
                    o.orderNo?.toString().toLowerCase().includes(roadmapSearchQuery.toLowerCase()) || 
                    o.party?.toLowerCase().includes(roadmapSearchQuery.toLowerCase())
                  )
                  .map((order: any, idx: number) => {
                     const orderColor = colors[idx % colors.length];
                     return (
                  <div key={idx} className="relative group border-b border-gray-50 dark:border-white/5 pb-4 last:border-0">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 rounded-[2rem] hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm ring-1 ring-black/5" style={{ borderLeft: `4px solid ${orderColor}` }}>
                        
                        {/* Left Info & Items */}
                        <div className="lg:col-span-3 border-r border-gray-50 dark:border-white/5 pr-4">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ backgroundColor: orderColor }}>{idx + 1}</div>
                             <div>
                               <h4 className="text-base font-black text-gray-900 dark:text-white uppercase">#{order.orderNo}</h4>
                               <p className="text-[11px] font-black text-gray-400 uppercase">{order.party}</p>
                             </div>
                           </div>
                           
                           <div className="p-4 rounded-2xl border transition-colors bg-white dark:bg-white/10" style={{ borderColor: `${orderColor}20` }}>
                              <p className="text-[10px] font-black uppercase mb-3 tracking-widest" style={{ color: orderColor }}>Order Payload</p>
                              <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                {order.items.map((it: any, iIdx: number) => (
                                  <div key={iIdx} className="flex justify-between items-center text-[11px] font-black text-gray-700 dark:text-gray-200">
                                    <span className="truncate max-w-[140px] uppercase">{it.name}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${orderColor}15`, color: orderColor }}>x{it.qty}</span>
                                  </div>
                                ))}
                              </div>
                           </div>
                        </div>

                        {/* Right Roadmap Timeline */}
                        <div className="lg:col-span-9 flex flex-col justify-center min-h-[170px] overflow-x-auto custom-scrollbar pb-2">
                           <div className="relative flex items-center justify-between px-8 w-full min-w-[1000px]">
                              {/* Background Connector Line */}
                              <div className="absolute top-[45px] left-12 right-12 h-1 bg-gray-100 dark:bg-white/5 rounded-full" />
                              
                              {/* Progressive Progress Line (Completed Steps) */}
                              <div 
                                className="absolute top-[45px] left-12 h-1 rounded-full transition-all duration-1000" 
                                style={{ 
                                  backgroundColor: orderColor,
                                  width: `${(order.steps.findIndex((s: any) => s.step === order.currentStep) / (order.steps.length - 1)) * 92}%`,
                                }} 
                              />

                              {order.steps.map((step: any, sIdx: number) => {
                                const isCompleted = !!step.actual && step.status !== "No";
                                const isCurrent = order.currentStep === step.step;
                                const isPending = !isCompleted && !isCurrent;
                                const StepIcon = STEP_ICONS[sIdx];
                                
                                return (
                                  <div key={sIdx} className="flex flex-col items-center relative z-10 min-w-[85px]">
                                     {/* Icon Stage Above */}
                                     <div className={`mb-4 transition-all duration-500 ${isCurrent ? 'scale-125' : isPending ? 'opacity-50' : 'opacity-100'}`}>
                                        <div className={`p-2.5 rounded-full ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-500/10' : isCurrent ? 'bg-white dark:bg-navy-900 shadow-xl ring-2' : 'bg-gray-50 dark:bg-white/5'}`} style={isCurrent ? { borderColor: orderColor } : {}}>
                                           <StepIcon className={`w-6 h-6 ${isCompleted ? 'text-emerald-500' : isCurrent ? '' : 'text-gray-400 dark:text-gray-500'}`} style={isCurrent ? { color: orderColor } : {}} />
                                        </div>
                                     </div>

                                     {/* Numbered Progress Circle */}
                                     <div 
                                       className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isCurrent ? 'text-white shadow-md' : 'bg-white dark:bg-navy-900 border-gray-200 text-gray-300'}`}
                                       style={isCurrent ? { backgroundColor: orderColor, borderColor: orderColor } : {}}
                                     >
                                       {sIdx + 1}
                                     </div>

                                     {/* Label & Time Below */}
                                     <div className="absolute -bottom-12 text-center w-28">
                                       <p className={`text-[9px] font-black uppercase leading-tight tracking-tighter ${isCompleted || isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step.name}</p>
                                       <p className={`text-[8px] font-bold mt-1 uppercase ${isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>{step.actual ? new Date(step.actual).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
    </div>
  );
}
