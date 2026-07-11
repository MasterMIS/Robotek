"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ChartPieIcon,
  CurrencyRupeeIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  TableCellsIcon,
  ChartBarIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, Legend, LabelList, AreaChart, Area, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { IMS } from "@/types/ims";
import * as XLSX from "xlsx";
import TimeSeriesTable, { TimeBucket, Transaction } from "@/components/TimeSeriesTable";
import DateFilterBar, { FilterPeriod } from "@/components/DateFilterBar";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from "date-fns";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate().toString().padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear().toString().slice(-2);
  return `${d} ${m} ${y}`;
};

const FloatingInput = ({
  label, value, onChange, type = "text", step, disabled, name, list
}: { label: string, value: any, onChange: (val: string) => void, type?: string, step?: string, disabled?: boolean, name?: string, list?: string }) => (
  <div className="relative z-0 w-full group">
    <input
      type={type}
      step={step}
      name={name}
      id={name}
      list={list}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block px-3 pb-2.5 pt-4 w-full text-sm font-bold text-gray-900 bg-transparent rounded-lg border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-[#FFD500] focus:outline-none focus:ring-0 focus:border-[#003875] peer uppercase disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5"
      placeholder=" "
    />
    <label htmlFor={name} className="absolute text-[10px] font-black text-gray-400 dark:text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#111827] px-2 peer-focus:px-2 peer-focus:text-[#003875] peer-focus:dark:text-[#FFD500] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1 uppercase tracking-widest">{label}</label>
  </div>
);

type EnrichedIMS = Omit<IMS, "live_stock" | "in_qty" | "out_qty" | "max_level" | "sale_percent" | "avg_daily_con" | "lead_time" | "safety_factor"> & {
  live_stock: number;
  in_qty: number;
  out_qty: number;
  max_level: number;
  sale_percent: number;
  avg_daily_con: number;
  lead_time: number;
  safety_factor: number;
  final_amount_num: number;
};

export default function IMSMaster({ onBack }: { onBack: () => void }) {
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');

  const showStatus = (msg: string, type: 'loading' | 'success' | 'error' = 'loading') => {
    setStatusMessage(msg);
    setStatusType(type);
    setIsStatusModalOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [legendFilter, setLegendFilter] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    showStatus("Parsing file...", "loading");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any[][]>(worksheet, { header: 1 });

      if (jsonData.length <= 1) {
        throw new Error("File is empty or contains only headers.");
      }

      const groupedData: any[] = [];
      let currentGroup: any = null;

      // Skip header row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        const date = row[0];
        const vchNo = row[1];
        const particulars = row[2];
        const description = row[3];
        const qty = row[5];

        if (vchNo) {
          currentGroup = {
            Date: date || "",
            VchNo: vchNo || "",
            Particulars: particulars || "",
            Items: []
          };
          groupedData.push(currentGroup);
        }

        if (currentGroup && description) {
          currentGroup.Items.push({
            Description: description,
            Qty: qty || 0
          });
        }
      }

      if (groupedData.length === 0) {
        throw new Error("No valid data found in the file.");
      }

      showStatus("Importing to Out Form...", "loading");

      const res = await fetch("/api/ims/import-out-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupedData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import");
      }

      showStatus(`Successfully imported ${groupedData.length} records!`, "success");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    } catch (error: any) {
      console.error(error);
      showStatus(error.message || "Error processing file", "error");
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Modals state
  const [isLogsModalOpen, setLogsModalOpen] = useState(false);
  const [logsItem, setLogsItem] = useState<EnrichedIMS | null>(null);
  const { data: logsData = [], isValidating: logsLoading } = useSWR<any[]>(
    isLogsModalOpen && logsItem ? `/api/ims/logs?item=${encodeURIComponent(logsItem.item_name)}` : null,
    fetcher
  );

  // Modals state
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IMS | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState<Partial<IMS>>({});

  const [viewMode, setViewMode] = useState<'default' | 'timeseries' | 'datewise'>('default');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('MONTH');
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const mappedTimeBucket: TimeBucket = useMemo(() => {
    if (filterPeriod === 'WEEK') return 'Weekly';
    if (filterPeriod === 'MONTH') return 'Monthly';
    if (filterPeriod === 'QUARTERLY' || filterPeriod === 'YEARLY') return 'Quarterly';
    return 'Daily';
  }, [filterPeriod]);

  const { data: timeSeriesData = [], isValidating: isTimeSeriesLoading } = useSWR<Transaction[]>(
    viewMode === 'timeseries' || viewMode === 'datewise' ? '/api/ims/time-series' : null,
    fetcher
  );

  const dateRange = useMemo(() => {
    let start, end;
    if (filterPeriod === 'CUSTOM') {
      if (!filterStartDate || !filterEndDate) return null;
      start = startOfDay(filterStartDate);
      end = endOfDay(filterEndDate);
    } else {
      switch (filterPeriod) {
        case 'DAY':
          start = startOfDay(filterDate);
          end = endOfDay(filterDate);
          break;
        case 'WEEK':
          start = startOfWeek(filterDate, { weekStartsOn: 1 });
          end = endOfWeek(filterDate, { weekStartsOn: 1 });
          break;
        case 'MONTH':
          start = startOfMonth(filterDate);
          end = endOfMonth(filterDate);
          break;
        case 'QUARTERLY':
          start = startOfQuarter(filterDate);
          end = endOfQuarter(filterDate);
          break;
        case 'YEARLY':
          start = startOfYear(filterDate);
          end = endOfYear(filterDate);
          break;
      }
    }
    return { start, end };
  }, [filterPeriod, filterDate, filterStartDate, filterEndDate]);

  const datewiseTransactions = useMemo(() => {
    const sortedAll = [...timeSeriesData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const stockMap = new Map<string, number>();
    
    const itemsWithRunningStock = sortedAll.map(item => {
      const key = item.item_name.toLowerCase().trim();
      const inVal = item.in_qty || 0;
      const outVal = item.out_qty || 0;
      const current = (stockMap.get(key) || 0) + (inVal - outVal);
      stockMap.set(key, current);
      return { ...item, running_stock: current };
    });

    itemsWithRunningStock.reverse();

    if (!dateRange) return itemsWithRunningStock;
    return itemsWithRunningStock.filter(item => {
      const itemDate = new Date(item.date);
      return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [timeSeriesData, dateRange]);

  const { data: rawItems = [], mutate: mutateMaster, isLoading: masterLoading } = useSWR<IMS[]>("/api/ims", fetcher);

  const items = useMemo(() => {
    return rawItems.map(item => ({
      ...item,
      in_qty: item.in_qty || 0,
      out_qty: item.out_qty || 0,
      live_stock: item.live_stock || 0,
      max_level: item.max_level || 0,
      sale_percent: item.sale_percent || 0,
      avg_daily_con: item.avg_daily_con || 0,
      lead_time: item.lead_time || 30,
      safety_factor: item.safety_factor || 1,
      final_amount_num: parseFloat(item.final_amount) || 0
    })) as EnrichedIMS[];
  }, [rawItems]);

  const getLegendBucket = (live: number, maxLevel: number) => {
    if (live < 0) return 6;
    if (live === 0) return 5;
    const pct = maxLevel > 0 ? (live / maxLevel) * 100 : 100;
    if (pct <= 20) return 4;
    if (pct <= 50) return 3;
    if (pct <= 100) return 2;
    return 1;
  };

  const bucketCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    items.forEach(item => {
      counts[getLegendBucket(item.live_stock, item.max_level) as keyof typeof counts]++;
    });
    return counts;
  }, [items]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category))).filter(Boolean);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item =>
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id?.toString().includes(searchQuery.toLowerCase())
    );

    if (legendFilter !== null) {
      result = result.filter(item => getLegendBucket(item.live_stock, item.max_level) === legendFilter);
    }

    return result;
  }, [items, searchQuery, legendFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, legendFilter]);

  // KPIs
  const totalItems = items.length;
  const totalLiveStock = items.reduce((acc, curr) => acc + curr.live_stock, 0);
  const lowStockCount = items.filter(item => getLegendBucket(item.live_stock, item.max_level) >= 4).length;
  const totalValue = items.reduce((acc, curr) => acc + (curr.final_amount_num * Math.max(0, curr.live_stock)), 0);

  const getHealth = (live: number, max_level: number) => {
    const bucket = getLegendBucket(live, max_level);
    const max = max_level > 0 ? max_level : Math.max(100, live);
    if (bucket === 6) return { color: "bg-gray-400", text: "text-gray-500", label: "Negative", pct: 0 };
    if (bucket === 5) return { color: "bg-black dark:bg-gray-700", text: "text-gray-900 dark:text-gray-400", label: "Stockout", pct: 0 };

    const percentage = max > 0 ? (live / max) * 100 : 100;
    if (bucket === 1) return { color: "bg-purple-500", text: "text-purple-600", label: "Overstock", pct: Math.min(percentage, 100) };
    if (bucket === 2) return { color: "bg-emerald-500", text: "text-emerald-600", label: "Healthy", pct: percentage };
    if (bucket === 3) return { color: "bg-amber-400", text: "text-amber-600", label: "Warning", pct: percentage };
    if (bucket === 4) return { color: "bg-rose-500", text: "text-rose-600", label: "Critical", pct: percentage };

    return { color: "bg-gray-200", text: "text-gray-500", label: "Unknown", pct: 0 };
  };

  const calcFinalAmount = (est: string, gst: string): string => {
    const estNum = parseFloat(est);
    const gstNum = parseFloat(gst);
    if (!isNaN(estNum) && !isNaN(gstNum)) {
      return (estNum * (1 + gstNum / 100)).toFixed(3);
    }
    return "";
  };

  const handleInputChange = (field: string, value: string) => {
    setItemForm((prev) => {
      const updated: any = { ...prev, [field]: value };
      if (field === "est_amount_item" || field === "gst") {
        updated.final_amount = calcFinalAmount(
          field === "est_amount_item" ? value : prev.est_amount_item || "",
          field === "gst" ? value : prev.gst || ""
        );
      }
      return updated;
    });
  };

  const handleSaveItem = async () => {
    if (!itemForm.item_name || !itemForm.est_amount_item || !itemForm.gst) {
      showStatus("Please fill in all required fields", "error");
      return;
    }

    setSubmitting(true);
    showStatus(editingItem ? "Updating Item..." : "Adding New Item...", "loading");
    const isEdit = !!editingItem;
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/ims";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm)
      });

      if (res.ok) {
        mutateMaster();
        setItemModalOpen(false);
        setItemForm({});
        setEditingItem(null);
        showStatus("Record Saved Successfully!", "success");
        setTimeout(() => setIsStatusModalOpen(false), 1500);
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      showStatus("Error saving item record.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;
    setSubmitting(true);
    showStatus(`Deleting item...`, "loading");
    try {
      const res = await fetch(`/api/ims?id=${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutateMaster();
        showStatus("Item Deleted Successfully!", "success");
        setTimeout(() => setIsStatusModalOpen(false), 1500);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      showStatus("Error deleting item.", "error");
    } finally {
      setSubmitting(false);
      setPendingDeleteId(null);
    }
  };


  const handleExport = () => {
    let headers: string[];
    let rows: any[][];

    if (viewMode === 'datewise') {
      headers = ["Date", "Category", "Item Name", "In Qty", "Out Qty", "Live Stock"];
      rows = datewiseTransactions.map((log: any) => [
        new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
        log.category,
        log.item_name,
        log.in_qty > 0 ? `+${log.in_qty}` : "-",
        log.out_qty > 0 ? `-${log.out_qty}` : "-",
        log.running_stock
      ]);
    } else {
      headers = ["ID", "Item Name", "Est. Amount/Item", "GST", "Final Amount", "Category", "In Qty", "Out Qty", "Live Stock", "Sale %", "Avg Daily Con. (60d)", "Lead Time", "Safety Factor", "Max Level"];
      rows = filteredItems.map((item) => [
        item.id,
        item.item_name,
        item.est_amount_item,
        item.gst,
        item.final_amount,
        item.category,
        item.in_qty,
        item.out_qty,
        item.live_stock,
        item.sale_percent,
        item.avg_daily_con,
        item.lead_time,
        item.safety_factor,
        item.max_level,
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ims_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dashboard Data Prep
  const healthPieData = [
    { name: 'Overstock', value: bucketCounts[1], color: '#8b5cf6' },
    { name: 'Healthy', value: bucketCounts[2], color: '#10b981' },
    { name: 'Warning', value: bucketCounts[3], color: '#fbbf24' },
    { name: 'Critical', value: bucketCounts[4], color: '#f43f5e' },
    { name: 'Stockout', value: bucketCounts[5] + bucketCounts[6], color: '#111827' },
  ].filter(d => d.value > 0);

  const topLiveStockData = useMemo(() => items
    .filter(i => i.live_stock > 0)
    .sort((a, b) => b.live_stock - a.live_stock)
    .slice(0, 10)
    .map(i => ({
      name: i.item_name,
      stock: i.live_stock,
      id: i.id
    })), [items]);

  const lowestStockData = useMemo(() => items
    .filter(i => getLegendBucket(i.live_stock, i.max_level) >= 4) // Only critical/stockout
    .sort((a, b) => a.live_stock - b.live_stock)
    .slice(0, 10)
    .map(i => ({
      name: i.item_name,
      stock: i.live_stock,
      id: i.id
    })), [items]);

  const categoryRadarData = useMemo(() => {
    const catMap: Record<string, number> = {};
    items.forEach(i => {
      if (!i.category) return;
      catMap[i.category] = (catMap[i.category] || 0) + i.live_stock;
    });
    return Object.entries(catMap).map(([cat, vol]) => ({ subject: cat, A: vol, fullMark: 1000 })).slice(0, 6);
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1c] flex flex-col h-[calc(100vh-4rem)] p-2 gap-2">
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={statusType}
        message={statusMessage}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Top Header & Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1f2937] dark:hover:bg-white/10 rounded-xl transition-colors shadow-sm"
              title="Back to IMS Hub"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-800 shadow-lg shadow-blue-900/20 rounded-xl">
                <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-blue-800 dark:text-blue-400 uppercase tracking-tight leading-none mb-1">Master IMS</h1>
                <p className="text-[10px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Main Warehouse & Operations</p>
              </div>
            </div>
          </div>

        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH ID / ITEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#003875] dark:text-white w-64 transition-all shadow-sm h-[32px]"
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border border-blue-200 dark:border-blue-500/20 shadow-sm">
            <ArrowUpTrayIcon className="w-4 h-4" /> Import Out Form
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border border-blue-200 dark:border-blue-500/20 shadow-sm">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export
          </button>
          <button onClick={() => {
            setEditingItem(null);
            setItemForm({ item_name: "", est_amount_item: "", gst: "", final_amount: "", category: "" });
            setItemModalOpen(true);
          }} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm">
            <PlusIcon className="w-4 h-4 stroke-2" /> Add Item
          </button>
        </div>
      </div>

      <DateFilterBar 
        period={filterPeriod}
        setPeriod={setFilterPeriod}
        currentDate={filterDate}
        setCurrentDate={setFilterDate}
        startDate={filterStartDate}
        setStartDate={setFilterStartDate}
        endDate={filterEndDate}
        setEndDate={setFilterEndDate}
        theme="blue"
      />

      <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-start lg:self-auto mb-2">
        <button
          onClick={() => setViewMode('default')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
            viewMode === 'default' 
              ? 'bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <TableCellsIcon className="w-4 h-4" /> Default
        </button>
        <button
          onClick={() => setViewMode('timeseries')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
            viewMode === 'timeseries' 
              ? 'bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ChartBarIcon className="w-4 h-4" /> Time Series
        </button>
        <button
          onClick={() => setViewMode('datewise')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
            viewMode === 'datewise' 
              ? 'bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Date-Wise
        </button>
      </div>

      {viewMode === 'timeseries' ? (
        <div className="flex flex-col gap-2 shrink-0 mb-2">
          <TimeSeriesTable 
            transactions={timeSeriesData}
            bucket={mappedTimeBucket}
            isLoading={isTimeSeriesLoading}
            searchQuery={searchQuery}
          />
        </div>
      ) : viewMode === 'datewise' ? (
        <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0 mt-2">
          {datewiseTransactions.length > 0 && !isTimeSeriesLoading && (
            <div className="py-2 px-4 border-b border-blue-200/50 dark:border-blue-500/10 flex items-center justify-between bg-blue-50/50 dark:bg-[#1f2937]/50 shrink-0">
              <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Showing {datewiseTransactions.length} transactions
              </p>
            </div>
          )}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            {isTimeSeriesLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : (
              <table className="w-full text-left border-collapse relative">
                <thead className="bg-gray-100 dark:bg-[#1f2937] sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="py-2.5 px-4 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Date</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Category</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Item Name</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">In</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Out</th>
                    <th className="py-2.5 px-4 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Live Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {datewiseTransactions.map((log, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 dark:hover:bg-white/[0.03] even:bg-gray-50/50 dark:even:bg-[#1f2937]/30 transition-colors group">
                      <td className="py-2 px-4 text-[11px] font-bold text-gray-500">
                        {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-bold text-gray-500 uppercase">{log.category}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-gray-900 dark:text-white uppercase">{log.item_name}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-emerald-600 dark:text-emerald-400 text-right">{log.in_qty > 0 ? `+${log.in_qty}` : "-"}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-rose-600 dark:text-rose-400 text-right">{log.out_qty > 0 ? `-${log.out_qty}` : "-"}</td>
                      <td className="py-2 px-4 text-[11px] font-black text-[#003875] dark:text-[#FFD500] text-right">{(log as any).running_stock}</td>
                    </tr>
                  ))}
                  {datewiseTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-[11px] font-black uppercase">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
      <>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto bg-white dark:bg-[#111827] p-2 rounded-xl border border-gray-200 dark:border-white/5 flex-1 min-w-0">
          <div className="flex items-center gap-1 px-2 shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">Color Logic:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black text-white text-center cursor-pointer">
            <div onClick={() => setLegendFilter(legendFilter === 1 ? null : 1)} className={`px-4 py-1 rounded min-w-[80px] transition-transform hover:scale-105 ${legendFilter === 1 ? 'ring-2 ring-purple-600 ring-offset-1 bg-purple-600 shadow-md' : 'bg-purple-500'}`}> {'>'} 100% <sup className="font-bold opacity-80">{bucketCounts[1]}</sup></div>
            <div onClick={() => setLegendFilter(legendFilter === 2 ? null : 2)} className={`px-4 py-1 rounded min-w-[120px] transition-transform hover:scale-105 ${legendFilter === 2 ? 'ring-2 ring-emerald-500 ring-offset-1 bg-emerald-500 shadow-md' : 'bg-emerald-400'}`}> 51 - 100% <sup className="font-bold opacity-80">{bucketCounts[2]}</sup></div>
            <div onClick={() => setLegendFilter(legendFilter === 3 ? null : 3)} className={`text-black px-4 py-1 rounded min-w-[120px] transition-transform hover:scale-105 ${legendFilter === 3 ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-400 shadow-md' : 'bg-amber-300'}`}> 21 - 50% <sup className="font-bold opacity-80">{bucketCounts[3]}</sup></div>
            <div onClick={() => setLegendFilter(legendFilter === 4 ? null : 4)} className={`px-4 py-1 rounded min-w-[120px] transition-transform hover:scale-105 ${legendFilter === 4 ? 'ring-2 ring-rose-500 ring-offset-1 bg-rose-500 shadow-md' : 'bg-rose-400'}`}> 1 - 20% <sup className="font-bold opacity-80">{bucketCounts[4]}</sup></div>
            <div onClick={() => setLegendFilter(legendFilter === 5 ? null : 5)} className={`px-4 py-1 rounded min-w-[80px] transition-transform hover:scale-105 ${legendFilter === 5 ? 'ring-2 ring-black dark:ring-gray-700 ring-offset-1 bg-black dark:bg-gray-800 shadow-md' : 'bg-gray-800 dark:bg-gray-700'}`}> 0% <sup className="font-bold opacity-80">{bucketCounts[5]}</sup></div>
            <div onClick={() => setLegendFilter(legendFilter === 6 ? null : 6)} className={`px-4 py-1 rounded min-w-[80px] transition-transform hover:scale-105 ${legendFilter === 6 ? 'ring-2 ring-gray-400 ring-offset-1 bg-gray-400 shadow-md' : 'bg-gray-300'}`}> {'<'} 0% <sup className="font-bold opacity-80">{bucketCounts[6]}</sup></div>
          </div>
          {legendFilter !== null && (
            <button onClick={() => setLegendFilter(null)} className="ml-2 px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-500 rounded text-[9px] uppercase font-black hover:bg-gray-200">Clear</button>
          )}
        </div>

      </div>

      <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">
        {!logsItem && (
          <>
            {filteredItems.length > 0 && !masterLoading && (
              <div className="py-2 px-4 border-b border-blue-200/50 dark:border-blue-500/10 flex items-center justify-between bg-blue-50/50 dark:bg-[#1f2937]/50 shrink-0">
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-500/20 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1.5 rounded bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-500/20 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {masterLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-4">
                        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-6 flex-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse relative">
                    <thead className="bg-blue-50 dark:bg-blue-900/20 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="py-2.5 px-3 border-b border-blue-200 dark:border-blue-500/20 text-center sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-30 shadow-[1px_0_0_0_#bfdbfe] dark:shadow-[1px_0_0_0_rgba(59,130,246,0.2)] w-24">
                          <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Acts</span>
                        </th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 whitespace-nowrap">ID</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 whitespace-nowrap">Category</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 whitespace-nowrap">Item Name</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Est. Amt</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">GST</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Final Amt</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">In Qty</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Out Qty</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Sale %</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Avg Con</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Lead</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">SF</th>
                        <th className="py-2.5 px-3 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-right">Max</th>
                        <th className="py-2.5 px-4 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-blue-200 dark:border-blue-500/20 text-left bg-blue-100/50 dark:bg-blue-500/10 w-56">Stock Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 dark:divide-blue-500/10">
                      {paginatedItems.map((item, idx) => {
                        const health = getHealth(item.live_stock, item.max_level || 0);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/50 dark:hover:bg-white/[0.03] transition-colors group"
                          >
                            <td className="py-1 px-2 text-center sticky left-0 z-20 transition-colors border-r shadow-[1px_0_0_0_#bfdbfe] dark:shadow-[1px_0_0_0_rgba(59,130,246,0.2)] bg-white group-even:bg-blue-50/30 dark:bg-[#111827] dark:group-even:bg-[#182031] group-hover:bg-blue-50/50 dark:group-hover:bg-[#1a2335] border-blue-100 dark:border-blue-500/10">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => { setLogsItem(item); setLogsModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 transition-all" title="View Transaction Logs">
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setEditingItem(item); setItemForm(item); setItemModalOpen(true); }} className="text-[#003875] dark:text-[#FFD500] hover:scale-110 transition-transform" title="Edit">
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => { confirmDelete(item.id.toString()); }} className="text-rose-500 hover:scale-110 transition-transform" title="Delete">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[11px] font-black text-[#003875] dark:text-[#FFD500] whitespace-nowrap">{item.id}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">{item.category}</td>
                            <td className="py-2 px-3 text-[11px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]" title={item.item_name}>{item.item_name}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{item.est_amount_item}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{item.gst}%</td>
                            <td className="py-2 px-3 text-[11px] font-black text-gray-800 dark:text-gray-200 text-right">₹{item.final_amount_num.toFixed(2)}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-right">{item.in_qty}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-rose-600 dark:text-rose-400 text-right">{item.out_qty}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 text-right">{item.sale_percent}%</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{item.avg_daily_con}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{item.lead_time}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{item.safety_factor}</td>
                            <td className="py-2 px-3 text-[11px] font-bold text-[#003875] dark:text-[#FFD500] text-right">{item.max_level}</td>
                            <td className="py-1 px-4 bg-gray-50/50 dark:bg-white/[0.02]">
                              <div className="flex flex-col gap-1 w-full max-w-[180px]">
                                <div className="flex justify-between items-baseline leading-none">
                                  <span className={`text-xs font-black ${health.text}`}>{item.live_stock}</span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase">{health.label}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                                  <div className={`h-full ${health.color} transition-all duration-500`} style={{ width: `${health.pct}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={15} className="py-8 text-center text-gray-400 text-[11px] font-black uppercase">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {logsItem && (
              <div className="flex-1 flex flex-col relative bg-gray-50 dark:bg-[#0a0f1c] min-h-0">
                <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#111827] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setLogsModalOpen(false); setLogsItem(null); }} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                      <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase leading-none">{logsItem.item_name}</h2>
                        <span className="px-2 py-0.5 bg-[#003875]/10 text-[#003875] dark:bg-[#FFD500]/20 dark:text-[#FFD500] border border-[#003875]/20 dark:border-[#FFD500]/30 rounded text-[10px] font-black tracking-widest">ID: {logsItem.id}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{logsItem.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total IN</p>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{logsItem.in_qty}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total OUT</p>
                      <span className="text-xl font-black text-rose-600 dark:text-rose-400">{logsItem.out_qty}</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Live Stock</p>
                      <span className={`text-xl font-black ${getHealth(logsItem.live_stock, logsItem.max_level || 0).text}`}>{logsItem.live_stock}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white dark:bg-[#111827]">
                  {logsLoading ? (
                    <div className="p-8 flex justify-center items-center h-full">
                      <div className="w-8 h-8 border-4 border-[#003875] dark:border-[#FFD500] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : logsData.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-100 dark:bg-[#1f2937] sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="py-2.5 px-6 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 w-40">Date</th>
                          <th className="py-2.5 px-6 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 w-32">Type</th>
                          <th className="py-2.5 px-6 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right w-32">Quantity</th>
                          <th className="py-2.5 px-6 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-mono text-[11px]">
                        {logsData.map((log: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3 px-6 text-gray-500 font-bold whitespace-nowrap">{formatDate(log.date)}</td>
                            <td className="py-3 px-6 whitespace-nowrap">
                              <span className={`flex items-center gap-1.5 w-max px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                {log.type === 'IN' ? <ArrowDownTrayIcon className="w-3.5 h-3.5" /> : <ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                                {log.type}
                              </span>
                            </td>
                            <td className={`py-3 px-6 font-black text-right text-sm ${log.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {log.type === 'IN' ? '+' : '-'}{log.qty}
                            </td>
                            <td className="py-3 px-6 text-gray-600 dark:text-gray-400 font-bold uppercase truncate max-w-[400px]" title={log.remarks}>{log.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                      <ArchiveBoxIcon className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-sans text-[11px] font-black uppercase tracking-widest mt-2">No transaction logs found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <datalist id="category-list">
        {uniqueCategories.map(cat => (
          <option key={cat} value={cat} />
        ))}
      </datalist>

      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_0_40px_rgba(0,56,117,0.3)] dark:shadow-[0_0_40px_rgba(255,213,0,0.1)] w-full max-w-2xl overflow-hidden border border-[#003875]/30 dark:border-[#FFD500]/20"
            >
              <div className="flex items-center justify-between p-5 border-b border-blue-800/20 dark:border-white/5 bg-gradient-to-r from-[#003875] to-blue-800 dark:from-[#1f2937] dark:to-[#111827] text-white">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-blue-200 dark:text-[#FFD500]" />
                  {editingItem ? 'Edit IMS Record' : 'Create IMS Record'}
                </h3>
                <button onClick={() => setItemModalOpen(false)} className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 dark:bg-[#1f2937] rounded-lg shadow-sm transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#111827]">
                
                <FloatingInput label="Category" name="category" list="category-list" value={itemForm.category || ''} onChange={(val) => handleInputChange("category", val)} />
                <div className="hidden md:block"></div>

                <div className="md:col-span-2">
                  <FloatingInput label="Item Name *" name="item_name" value={itemForm.item_name || ''} onChange={(val) => handleInputChange("item_name", val)} />
                </div>

                <FloatingInput label="Est. Amount/Item *" name="est_amount_item" type="number" step="0.01" value={itemForm.est_amount_item || ''} onChange={(val) => handleInputChange("est_amount_item", val)} />
                <FloatingInput label="GST (%) *" name="gst" type="number" step="0.01" value={itemForm.gst || ''} onChange={(val) => handleInputChange("gst", val)} />

                <div className="md:col-span-2">
                  <FloatingInput label="Final Amount" name="final_amount" disabled={true} value={itemForm.final_amount || ''} onChange={() => {}} />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-[#1f2937]/50">
                <button onClick={() => setItemModalOpen(false)} className="px-5 py-2 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white dark:hover:bg-[#111827] shadow-sm border border-gray-200 dark:border-white/10 transition-colors">Cancel</button>
                <button onClick={handleSaveItem} className="px-6 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003875] to-blue-600 dark:from-[#FFD500] dark:to-yellow-400 dark:text-[#003875] uppercase tracking-widest hover:brightness-110 shadow-lg shadow-blue-500/20 dark:shadow-yellow-500/20 transition-all">Save Record</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={performDelete}
        title="Delete Item"
        message={`Are you sure you want to completely remove this item from the system? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
}
