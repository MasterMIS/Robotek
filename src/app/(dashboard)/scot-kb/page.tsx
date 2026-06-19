"use client";

import { useState, useRef, useMemo } from "react";
import useSWR from "swr";
import { read, utils } from "xlsx";
import {
  ChartBarIcon,
  DocumentArrowUpIcon,
  TableCellsIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneArrowUpRightIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  CalendarIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  PhoneArrowDownLeftIcon,
  NoSymbolIcon,
  InformationCircleIcon,
  ShoppingCartIcon
} from "@heroicons/react/24/outline";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { O2D } from "@/types/o2d";
import { DataFeeder } from "@/types/data-feeder";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function ScotKbPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "data-feeder" | "scot">("dashboard");

  const { data: o2dDataRes, isValidating: isO2DLoading } = useSWR(
    `/api/o2d?limit=-1`,
    fetcher
  );

  const { data: feederData, mutate: mutateFeeder, isValidating: isFeederLoading } = useSWR(
    `/api/data-feeder?limit=-1`,
    fetcher
  );

  const o2ds: O2D[] = o2dDataRes?.data || [];
  const feeders: DataFeeder[] = feederData?.data || [];

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchScot, setSearchScot] = useState("");
  const [scotPage, setScotPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedScotMonth, setSelectedScotMonth] = useState<string>("");

  const [searchFeeder, setSearchFeeder] = useState("");
  const [feederPage, setFeederPage] = useState(1);

  // Parse Duration to Seconds
  const parseDurationToSeconds = (dur: string) => {
    if (!dur) return 0;
    let seconds = 0;
    const hMatch = dur.match(/(\d+)h/);
    const mMatch = dur.match(/(\d+)m/);
    const sMatch = dur.match(/(\d+)s/);
    if (hMatch) seconds += parseInt(hMatch[1]) * 3600;
    if (mMatch) seconds += parseInt(mMatch[1]) * 60;
    if (sMatch) seconds += parseInt(sMatch[1]);
    return seconds;
  };

  const formatSecondsToDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Converts an Excel/Google Sheets serial date (e.g. 46127.00012) to a Date object.
  const excelSerialToDate = (serial: string | number): Date | null => {
    if (!serial) return null;
    const num = typeof serial === 'string' ? parseFloat(serial) : serial;
    if (isNaN(num)) return null;
    if (num > 40000 && num < 60000) {
      const date = new Date((num - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    const d = new Date(serial as string);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatCallDate = (callDate: string | number | undefined): string => {
    if (!callDate) return "No Date";
    const d = excelSerialToDate(callDate);
    if (!d) return String(callDate);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`; // e.g. 19 Jun 26
  };

  const formatCallTime = (callTime: string | number | undefined): string => {
    if (!callTime) return "No Time";
    const num = typeof callTime === 'string' ? parseFloat(callTime) : callTime;
    if (isNaN(num) || num >= 1 || num < 0) return String(callTime); // Not a standard excel time fraction
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Parse Excel/CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("Reading file...");

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const json = utils.sheet_to_json<any>(worksheet, { raw: false });

      // Map rows to DataFeeder objects
      const itemsToInsert = json.map((row: any) => ({
        employeeName: row["Employee Name"] || "",
        employeeNumber: row["Employee Number"] || String(row["Employee Number"] || ""),
        toName: row["To Name"] || "",
        countryCode: String(row["Country Code"] || ""),
        toNumber: String(row["To Number"] || ""),
        callType: row["Call Type"] || "",
        duration: String(row["Duration"] || ""),
        callDate: row["Call Date"] || "",
        callTime: row["Call Time"] || "",
      }));

      setUploadMessage("Uploading data...");
      
      const res = await fetch("/api/data-feeder/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToInsert })
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadMessage(`Success: ${itemsToInsert.length} records!`);
      mutateFeeder();
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setTimeout(() => setUploadMessage(""), 4000);
    } catch (error: any) {
      console.error(error);
      setUploadMessage("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    feeders.forEach(f => {
      const d = excelSerialToDate(f.callDate);
      if (d) set.add(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().substring(2)}`);
    });
    return Array.from(set);
  }, [feeders]);

  const activeScotMonth = selectedScotMonth || (uniqueMonths.length > 0 ? uniqueMonths[0] : "");

  const scotMonthDates = useMemo(() => {
    if (!activeScotMonth) return [];
    const set = new Set<string>();
    feeders.forEach(f => {
      const d = excelSerialToDate(f.callDate);
      if (d) {
        const mStr = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().substring(2)}`;
        if (mStr === activeScotMonth) {
          const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
          set.add(dateStr);
        }
      }
    });
    o2ds.forEach(o => {
      const d = new Date(o.created_at);
      if (!isNaN(d.getTime())) {
        const mStr = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().substring(2)}`;
        if (mStr === activeScotMonth) {
          const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
          set.add(dateStr);
        }
      }
    });
    return Array.from(set).sort();
  }, [feeders, o2ds, activeScotMonth]);

  // Cross-reference logic for Scot Tab
  const scotRows = useMemo(() => {
    // 1. Group feeders by To Name and extract call types by date
    const feederGroup = new Map<string, { originalName: string, employeeName: string, callsByDate: Record<string, string> }>();
    feeders.forEach(f => {
      const key = f.toName?.toLowerCase().trim();
      if (!key) return;
      const d = excelSerialToDate(f.callDate);
      if (!d) return;
      
      const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
      
      const group = feederGroup.get(key) || { originalName: f.toName, employeeName: f.employeeName, callsByDate: {} };
      if (f.employeeName) group.employeeName = f.employeeName;
      group.callsByDate[dateStr] = f.callType;
      feederGroup.set(key, group);
    });
    
    // 2. Group O2Ds by normalized party_name
    const o2dGroup = new Map<string, O2D[]>();
    o2ds.forEach(o => {
      const name = (o.party_name || '').toLowerCase().trim();
      if (!name) return;
      const group = o2dGroup.get(name) || [];
      group.push(o);
      o2dGroup.set(name, group);
    });

    const rows = Array.from(feederGroup.values()).map(data => {
      const toName = data.originalName;
      const normalizedToName = toName.toLowerCase().trim();
      const orders = o2dGroup.get(normalizedToName) || [];
      
      const ordersByDate: Record<string, boolean> = {};
      
      // Sort orders by created_at desc (newest first)
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      orders.forEach(o => {
         const d = new Date(o.created_at);
         if (!isNaN(d.getTime())) {
           const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
           ordersByDate[dateStr] = true;
         }
      });
      
      const totalOrders = orders.length;
      let lastOrderDate: Date | null = null;
      let frequencyDays: number | null = null;
      let nextPlannedDate: Date | null = null;

      if (totalOrders > 0) {
        lastOrderDate = new Date(orders[0].created_at);
        if (totalOrders > 1) {
          const firstOrderDate = new Date(orders[totalOrders - 1].created_at);
          const diffTime = lastOrderDate.getTime() - firstOrderDate.getTime();
          frequencyDays = Math.max(1, Math.round(diffTime / (86400000 * (totalOrders - 1))));
          
          nextPlannedDate = new Date(lastOrderDate.getTime() + (frequencyDays * 86400000));
        }
      }

      return {
        toName,
        employeeName: data.employeeName,
        callsByDate: data.callsByDate,
        ordersByDate,
        totalOrders,
        lastOrderDate,
        frequencyDays,
        nextPlannedDate,
        rawOrders: orders
      };
    });

    // Search filter
    const searchTerm = searchScot.toLowerCase().trim();
    if (!searchTerm) return rows;
    
    return rows.filter(r => r.toName.toLowerCase().includes(searchTerm));
  }, [feeders, o2ds, searchScot]);

  const paginatedScotRows = scotRows.slice((scotPage - 1) * itemsPerPage, scotPage * itemsPerPage);

  const filteredFeeders = feeders.filter(f => {
    if (!searchFeeder) return true;
    const term = searchFeeder.toLowerCase();
    return f.toName?.toLowerCase().includes(term) || f.employeeName?.toLowerCase().includes(term) || f.toNumber?.includes(term);
  });
  const paginatedFeeders = filteredFeeders.slice((feederPage - 1) * itemsPerPage, feederPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in zoom-in-95 duration-500">
      {/* Header - Apple/Scheduler Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl">
            <InformationCircleIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Scot KB</h1>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Call Data Integration & Analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <ChartBarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab("data-feeder")} 
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'data-feeder' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Data Feeder</span>
            </button>
            <button 
              onClick={() => setActiveTab("scot")} 
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'scot' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <TableCellsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Scot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <AnalyticsDashboard feeders={feeders} />
      )}

      {/* Data Feeder Tab */}
      {activeTab === "data-feeder" && (
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-500">
            {/* Header / Actions Row */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <TableCellsIcon className="w-5 h-5 text-blue-500" />
                  Recent Feeds
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  {/* File Upload Button */}
                  <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2">
                    {uploadMessage && (
                      <span className="text-[10px] font-bold text-blue-500 animate-pulse whitespace-nowrap">
                        {uploadMessage}
                      </span>
                    )}
                    <label 
                      htmlFor="file-upload" 
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap ${
                        uploading 
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 pointer-events-none' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                      }`}
                    >
                      {uploading ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <DocumentArrowUpIcon className="w-3.5 h-3.5" />}
                      {uploading ? "Importing..." : "Select File"}
                    </label>
                  </div>

                  {/* Pagination Actions */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setFeederPage(p => Math.max(1, p - 1))} disabled={feederPage === 1} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-300">Prev</button>
                    <span className="flex items-center px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{feederPage} / {Math.ceil(filteredFeeders.length / itemsPerPage) || 1}</span>
                    <button onClick={() => setFeederPage(p => Math.min(Math.ceil(filteredFeeders.length / itemsPerPage), p + 1))} disabled={feederPage >= Math.ceil(filteredFeeders.length / itemsPerPage)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-300">Next</button>
                  </div>

                  {/* Search Input */}
                  <input 
                    type="text" 
                    placeholder="Search Names or Numbers..." 
                    value={searchFeeder} 
                    onChange={(e) => {setSearchFeeder(e.target.value); setFeederPage(1);}} 
                    className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-white w-full sm:w-64 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Employee Details</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Target Info</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Call Metrics</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedFeeders.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No data available</td></tr>
                  ) : paginatedFeeders.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">{f.employeeName || "Unknown"}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">#{f.employeeNumber || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <UserGroupIcon className="w-3.5 h-3.5 text-slate-400" />
                            {f.toName || "Unknown"}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                            <PhoneIcon className="w-3 h-3 text-slate-400" />
                            {f.countryCode ? `+${f.countryCode} ` : ""}{f.toNumber || "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest rounded">
                            {f.callType || 'N/A'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                            <ClockIcon className="w-3 h-3 text-slate-400" />
                            {f.duration || '0s'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {formatCallDate(f.callDate)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 ml-5">
                            {formatCallTime(f.callTime)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scot Tab */}
      {activeTab === "scot" && (
        <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-500">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <TableCellsIcon className="w-5 h-5 text-emerald-500" />
              Party Call Cross-Reference
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Pagination Actions */}
              <div className="flex gap-1.5">
                <button onClick={() => setScotPage(p => Math.max(1, p - 1))} disabled={scotPage === 1} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-300">Prev</button>
                <span className="flex items-center px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{scotPage} / {Math.ceil(scotRows.length / itemsPerPage) || 1}</span>
                <button onClick={() => setScotPage(p => Math.min(Math.ceil(scotRows.length / itemsPerPage), p + 1))} disabled={scotPage >= Math.ceil(scotRows.length / itemsPerPage)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-700 dark:text-slate-300">Next</button>
              </div>

              {/* Search Input */}
              <input 
                type="text" 
                placeholder="Search Party Name..." 
                value={searchScot} 
                onChange={(e) => {setSearchScot(e.target.value); setScotPage(1);}} 
                className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-white w-full sm:w-64 transition-all"
              />

              {/* Month Selector */}
              {uniqueMonths.length > 0 && (
                <select 
                  value={activeScotMonth}
                  onChange={(e) => setSelectedScotMonth(e.target.value)}
                  className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-white w-full sm:w-auto transition-all"
                >
                  {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Target Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Total Orders</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Last Order Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Order Frequency</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Next Planned Date</th>
                  {scotMonthDates.map(dateStr => {
                    const d = new Date(dateStr);
                    const day = d.getDate();
                    const month = d.toLocaleString('default', { month: 'short' });
                    return (
                      <th key={dateStr} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center whitespace-nowrap">
                        {day}{day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'} {month}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScotRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No target records found</td></tr>
                ) : paginatedScotRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-emerald-500" />
                          {row.toName}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <UserGroupIcon className="w-3 h-3 text-slate-400" />
                          {row.employeeName || "Unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl">
                        {row.totalOrders}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {row.lastOrderDate ? (
                          <>
                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                            {row.lastOrderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </>
                        ) : (
                          <span className="opacity-50 text-slate-400 italic">No Orders</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.frequencyDays ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20 shadow-sm">
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          {row.frequencyDays} Days
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.nextPlannedDate ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 shadow-sm">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {row.nextPlannedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">N/A</span>
                      )}
                    </td>
                    {scotMonthDates.map(dateStr => {
                      const cType = row.callsByDate[dateStr];
                      const hasOrder = row.ordersByDate[dateStr];
                      return (
                        <td key={dateStr} className="px-4 py-4 text-center border-l border-slate-100 dark:border-slate-800/50">
                          <div className="flex items-center justify-center gap-1">
                            {cType && (
                              <span title={`Call Type: ${cType}`} className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${
                                cType.toUpperCase().includes('MISS') ? 'bg-rose-500' :
                                cType.toUpperCase().includes('OUT') ? 'bg-emerald-500' :
                                cType.toUpperCase().includes('REJ') ? 'bg-amber-500' :
                                cType.toUpperCase().includes('IN') ? 'bg-blue-500' :
                                'bg-slate-500'
                              }`}>
                                {cType.charAt(0).toUpperCase()}
                              </span>
                            )}
                            {hasOrder && (
                              <span title="Order Placed" className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-500 text-white shadow-sm">
                                <ShoppingCartIcon className="w-3 h-3" />
                              </span>
                            )}
                            {!cType && !hasOrder && (
                              <span className="text-slate-200 dark:text-slate-800">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
