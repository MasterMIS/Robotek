"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowLeftIcon,
  EyeIcon,
  TableCellsIcon,
  ChartBarIcon,
  TagIcon,
  FolderIcon,
  HashtagIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";
import { FloorIMS } from "@/types/ims-floor";
import TimeSeriesTable, { TimeBucket } from "@/components/TimeSeriesTable";
import DateFilterBar, { FilterPeriod } from "@/components/DateFilterBar";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { CalendarIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
};

const FloatingInput = ({
  label, value, onChange, type = "text", step, disabled, name, list, icon: Icon
}: { label: string, value: any, onChange: (val: string) => void, type?: string, step?: string, disabled?: boolean, name?: string, list?: string, icon?: React.ElementType }) => (
  <div className="relative z-0 w-full mt-2">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />}
    <input
      type={type}
      step={step}
      name={name}
      id={name}
      list={list}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`block px-3 pb-2.5 pt-2.5 w-full text-[11px] font-bold text-gray-900 bg-transparent rounded-lg border-2 border-gray-200 appearance-none dark:text-white dark:border-white/10 dark:focus:border-[#FFD500] focus:outline-none focus:ring-0 focus:border-[#003875] uppercase disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5 relative z-0 ${Icon ? 'pl-9' : ''}`}
      placeholder=" "
    />
    <label htmlFor={name} className="absolute text-[9px] font-black text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02] px-1 start-3 uppercase tracking-widest top-[-6px] z-10 leading-none">
      {label}
    </label>
  </div>
);

interface BulkRow {
  id: string;
  item_name: string;
  category: string;
  type: 'IN' | 'OUT';
  qty: string;
  date?: string;
  packed_status?: string;
}

interface AuditRow {
  id: string;
  item_name: string;
  category: string;
  live_stock: number;
  physical_qty: string;
  diff_qty: number;
  diff_type: 'IN' | 'OUT' | 'NONE';
}

export default function IMSFloor({ location, onBack }: { location: "1st" | "g", onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');

  const [viewMode, setViewMode] = useState<'default' | 'timeseries' | 'datewise'>('default');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('ALL');
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const [packedFilter, setPackedFilter] = useState<'ALL' | 'PACKED' | 'UNPACKED'>('ALL');

  const mappedTimeBucket: TimeBucket = useMemo(() => {
    if (filterPeriod === 'WEEK') return 'Weekly';
    if (filterPeriod === 'MONTH') return 'Monthly';
    if (filterPeriod === 'QUARTERLY' || filterPeriod === 'YEARLY') return 'Quarterly';
    return 'Daily';
  }, [filterPeriod]);

  const showStatus = (msg: string, type: 'loading' | 'success' | 'error' = 'loading') => {
    setStatusMessage(msg);
    setStatusType(type);
    setIsStatusModalOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals state
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  
  // Transaction Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogItem, setSelectedLogItem] = useState<string | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Form states
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const { data: rawItems = [], mutate, isLoading } = useSWR<FloorIMS[]>(`/api/ims/floor?location=${location}`, fetcher);
  const { data: masterItems = [] } = useSWR<any[]>("/api/ims", fetcher);

  const dateRange = useMemo(() => {
    let start, end;
    if (filterPeriod === 'CUSTOM') {
      if (!filterStartDate || !filterEndDate) return null;
      start = startOfDay(filterStartDate);
      end = endOfDay(filterEndDate);
    } else {
      switch (filterPeriod) {
        case 'ALL':
          return null;
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

function parseDateStr(dStr: string) {
  if (!dStr) return 0;
  let ts = Date.parse(dStr);
  if (!isNaN(ts)) return ts;
  const parts = dStr.split(/[-/]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y.length === 4) {
      ts = Date.parse(`${y}-${m}-${d}`);
      if (!isNaN(ts)) return ts;
    }
  }
  return 0;
}

  const filteredRawItems = useMemo(() => {
    // First calculate running stock for all rawItems
    const sortedAll = [...rawItems].sort((a, b) => {
      const timeA = parseDateStr(a.date || a.updated_at || "");
      const timeB = parseDateStr(b.date || b.updated_at || "");
      return timeA - timeB;
    });
    const stockMap = new Map<string, number>();
    
    const itemsWithRunningStock = sortedAll.map(item => {
      const key = item.item_name.toLowerCase().trim();
      const inVal = parseFloat(item.in_qty) || 0;
      const outVal = parseFloat(item.out_qty) || 0;
      const current = (stockMap.get(key) || 0) + (inVal - outVal);
      stockMap.set(key, current);
      return { ...item, running_stock: current };
    });

    // Reverse to show latest entry on top
    itemsWithRunningStock.reverse();

    if (!dateRange) return itemsWithRunningStock;
    return itemsWithRunningStock.filter(item => {
      const ts = parseDateStr(item.date || item.updated_at || "");
      if (!ts) return false;
      const itemDate = new Date(ts);
      return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [rawItems, dateRange]);

  const allTimeStockMap = useMemo(() => {
    const map = new Map<string, number>();
    rawItems.forEach(item => {
      const key = item.item_name?.toLowerCase().trim();
      if (!key) return;
      const inVal = parseFloat(item.in_qty) || 0;
      const outVal = parseFloat(item.out_qty) || 0;
      map.set(key, (map.get(key) || 0) + inVal - outVal);
    });
    return map;
  }, [rawItems]);

  // AGGREGATION LOGIC
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, FloorIMS>();
    filteredRawItems.forEach(item => {
      const key = item.item_name?.toLowerCase().trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { ...item, in_qty: "0", out_qty: "0", live_stock: allTimeStockMap.get(key) || 0 });
      }
      const agg = map.get(key)!;
      const inVal = parseFloat(item.in_qty) || 0;
      const outVal = parseFloat(item.out_qty) || 0;
      agg.in_qty = (parseFloat(agg.in_qty) + inVal).toString();
      agg.out_qty = (parseFloat(agg.out_qty) + outVal).toString();
      
      const ts = parseDateStr(item.updated_at || "");
      const aggTs = parseDateStr(agg.updated_at || "");
      if (ts > aggTs) {
        agg.updated_at = item.updated_at;
        agg.packed_status = item.packed_status || agg.packed_status;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [filteredRawItems, allTimeStockMap]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(aggregatedItems.map(i => i.category))).filter(Boolean);
  }, [aggregatedItems]);

  const masterCategories = useMemo(() => {
    return Array.from(new Set(masterItems.map(i => i.category))).filter(Boolean);
  }, [masterItems]);

  const filteredItems = useMemo(() => {
    return aggregatedItems.filter(item => {
      const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPacked = packedFilter === 'ALL' || 
                            (packedFilter === 'PACKED' && item.packed_status === 'PACKED') ||
                            (packedFilter === 'UNPACKED' && item.packed_status === 'UNPACKED');
      return matchesSearch && matchesPacked;
    });
  }, [aggregatedItems, searchQuery, packedFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const transactionLogs = useMemo(() => {
    if (!selectedLogItem) return [];
    return rawItems
      .filter(i => i.item_name?.toLowerCase().trim() === selectedLogItem.toLowerCase().trim())
      .reverse(); // latest first
  }, [rawItems, selectedLogItem]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getHealthColors = (live: number) => {
    if (live < 0) return { color: "bg-gray-400", text: "text-gray-500", label: "Negative" };
    if (live === 0) return { color: "bg-rose-500", text: "text-rose-600", label: "Stockout" };
    return { color: "bg-emerald-500", text: "text-emerald-600", label: "In Stock" };
  };

  const handleBulkRowChange = (id: string, field: keyof BulkRow, value: string) => {
    setBulkRows(prev => prev.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        if (field === "item_name") {
          const masterItem = masterItems.find((i: any) => i.item_name.toLowerCase() === value.toLowerCase());
          if (masterItem) {
            newRow.category = masterItem.category;
          }
        }
        return newRow;
      }
      return row;
    }));
  };

  const addBulkRow = () => {
    setBulkRows(prev => [...prev, { id: Date.now().toString(), item_name: '', category: '', type: 'IN', qty: '', date: '', packed_status: '' }]);
  };

  const removeBulkRow = (id: string) => {
    setBulkRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveItem = async () => {
    // Bulk Save Logic - Ledger Style Append Only
    for(const row of bulkRows) {
      if(!row.item_name || !row.qty || parseFloat(row.qty) <= 0) {
          showStatus("Please fill all fields and ensure qty > 0", "error");
          return;
      }
    }
    setSubmitting(true);
    showStatus("Processing entries...", "loading");

    try {
      const today = new Date().toISOString().split('T')[0];

      // Send a POST request for EVERY row to append to ledger
      for (const row of bulkRows) {
        const qty = parseFloat(row.qty) || 0;
        const newItem: Partial<FloorIMS> = {
          item_name: row.item_name.trim(),
          category: row.category,
          in_qty: row.type === 'IN' ? qty.toString() : "0",
          out_qty: row.type === 'OUT' ? qty.toString() : "0",
          date: row.date || today,
          packed_status: row.packed_status || "",
          updated_at: new Date().toISOString()
        };
        await fetch(`/api/ims/floor?location=${location}`, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });
      }
      mutate();
      setItemModalOpen(false);
      setBulkRows([]);
      showStatus("Records Saved Successfully!", "success");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch(e) {
      showStatus("Error saving records.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const addAuditRow = () => {
    setAuditRows(prev => [...prev, { id: Date.now().toString(), item_name: '', category: '', live_stock: 0, physical_qty: '', diff_qty: 0, diff_type: 'NONE' }]);
  };

  const removeAuditRow = (id: string) => {
    setAuditRows(prev => prev.filter(r => r.id !== id));
  };

  const handleAuditRowChange = (id: string, field: keyof AuditRow, value: string) => {
    setAuditRows(prev => prev.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        if (field === "item_name") {
          let totalIn = 0;
          let totalOut = 0;
          let category = '';
          rawItems.forEach(i => {
            if (i.item_name?.toLowerCase().trim() === value.toLowerCase().trim()) {
              totalIn += parseFloat(i.in_qty) || 0;
              totalOut += parseFloat(i.out_qty) || 0;
              category = i.category || category;
            }
          });
          
          if (totalIn > 0 || totalOut > 0 || category) {
            newRow.category = category;
            newRow.live_stock = totalIn - totalOut;
          } else {
            newRow.category = '';
            newRow.live_stock = 0;
          }
          
          // Recalculate difference immediately
          if (newRow.physical_qty) {
            const phys = parseFloat(newRow.physical_qty) || 0;
            const diff = phys - newRow.live_stock;
            newRow.diff_qty = Math.abs(diff);
            newRow.diff_type = diff > 0 ? 'IN' : diff < 0 ? 'OUT' : 'NONE';
          }
        }
        if (field === "physical_qty") {
          const phys = parseFloat(value);
          if (!isNaN(phys)) {
            const diff = phys - row.live_stock;
            newRow.diff_qty = Math.abs(diff);
            newRow.diff_type = diff > 0 ? 'IN' : diff < 0 ? 'OUT' : 'NONE';
          } else {
            newRow.diff_qty = 0;
            newRow.diff_type = 'NONE';
          }
        }
        return newRow;
      }
      return row;
    }));
  };

  const handleSaveAudit = async () => {
    const validRows = auditRows.filter(r => r.item_name && r.physical_qty && r.diff_type !== 'NONE' && r.diff_qty > 0);
    
    if (validRows.length === 0) {
      showStatus("No valid differences to apply. Add items with physical quantities that differ from live stock.", "error");
      return;
    }

    setSubmitting(true);
    showStatus("Processing stock adjustments...", "loading");

    try {
      const today = new Date().toISOString().split('T')[0];

      for (const row of validRows) {
        const newItem: Partial<FloorIMS> = {
          item_name: row.item_name.trim(),
          category: row.category,
          in_qty: row.diff_type === 'IN' ? row.diff_qty.toString() : "0",
          out_qty: row.diff_type === 'OUT' ? row.diff_qty.toString() : "0",
          date: today,
          updated_at: new Date().toISOString()
        };
        await fetch(`/api/ims/floor?location=${location}`, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });
      }
      mutate();
      setIsAuditModalOpen(false);
      setAuditRows([]);
      showStatus("Physical Stock Reconciled!", "success");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch(e) {
      showStatus("Error saving adjustments.", "error");
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
    showStatus(`Deleting transaction...`, "loading");
    try {
      const res = await fetch(`/api/ims/floor?location=${location}&id=${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
        showStatus("Transaction Deleted Successfully!", "success");
        setTimeout(() => setIsStatusModalOpen(false), 1500);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      showStatus("Error deleting transaction.", "error");
    } finally {
      setSubmitting(false);
      setPendingDeleteId(null);
      setIsConfirmOpen(false);
    }
  };

  const handleExport = () => {
    let headers: string[];
    let rows: any[][];

    if (viewMode === 'datewise') {
      headers = ["Date", "Category", "Item Name", "In Qty", "Out Qty", "Live Stock"];
      rows = filteredRawItems.map(log => [
        formatDate(log.date || log.updated_at),
        log.category,
        log.item_name,
        log.in_qty !== "0" && log.in_qty !== "" ? `+${log.in_qty}` : "-",
        log.out_qty !== "0" && log.out_qty !== "" ? `-${log.out_qty}` : "-",
        (log as any).running_stock
      ]);
    } else {
      headers = ["Item Name", "Category", "In Qty", "Out Qty", "Live Stock"];
      rows = filteredItems.map((item) => [
        item.item_name,
        item.category,
        item.in_qty,
        item.out_qty,
        item.live_stock,
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
    link.setAttribute("download", `ims_${location}_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const title = location === "1st" ? "IMS - 1st Floor" : "IMS - G Floor";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1c] flex flex-col h-[calc(100vh-4rem)] p-2 gap-2">
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={statusType}
        message={statusMessage}
        onClose={() => setIsStatusModalOpen(false)}
      />

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
            <div className={`p-2.5 rounded-xl shadow-lg ${location === '1st' ? 'bg-gradient-to-br from-purple-600 to-fuchsia-800 shadow-purple-900/20' : 'bg-gradient-to-br from-emerald-600 to-teal-800 shadow-emerald-900/20'}`}>
              <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-black uppercase tracking-tight leading-none mb-1 ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{title}</h1>
              <p className={`text-[10px] font-black uppercase tracking-widest ${location === '1st' ? 'text-purple-600/70 dark:text-purple-400/70' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>Inventory Management System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('default')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'default' 
                ? `bg-white dark:bg-[#111827] shadow-sm ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TableCellsIcon className="w-4 h-4" /> Default
          </button>
          <button
            onClick={() => setViewMode('timeseries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'timeseries' 
                ? 'bg-white dark:bg-[#111827] text-[#003875] dark:text-[#FFD500] shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ChartBarIcon className="w-4 h-4" /> Time Series
          </button>
          <button
            onClick={() => setViewMode('datewise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'datewise' 
                ? `bg-white dark:bg-[#111827] shadow-sm ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Date-Wise
          </button>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">

          <button onClick={handleExport} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border shadow-sm whitespace-nowrap ${
            location === '1st' 
              ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
          }`}>
            <ArrowDownTrayIcon className="w-4 h-4" /> Export
          </button>
          <button onClick={() => {
            setAuditRows([]);
            setIsAuditModalOpen(true);
            addAuditRow(); // start with one empty row
          }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm border ${
            location === '1st' 
              ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' 
              : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
          }`}>
            <ClipboardDocumentCheckIcon className="w-4 h-4" /> Physical Check
          </button>
          <button
            onClick={() => {
              setBulkRows([{ id: Date.now().toString(), item_name: '', category: '', type: 'IN', qty: '', date: '', packed_status: '' }]);
              setItemModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-md hover:-translate-y-0.5 whitespace-nowrap ${
              location === '1st' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <PlusIcon className="w-4 h-4 stroke-2" /> Add Log
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2 shrink-0">
        <DateFilterBar 
          period={filterPeriod}
          setPeriod={setFilterPeriod}
          currentDate={filterDate}
          setCurrentDate={setFilterDate}
          startDate={filterStartDate}
          setStartDate={setFilterStartDate}
          endDate={filterEndDate}
          setEndDate={setFilterEndDate}
          theme={location === '1st' ? 'purple' : 'emerald'}
        />

        <div className="flex items-center gap-2">
          <div className="relative shrink-0 flex-1 lg:flex-none">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH ITEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#003875] dark:text-white w-full lg:w-64 transition-all shadow-sm h-[38px]"
            />
          </div>
          {location === '1st' && (
            <select
              value={packedFilter}
              onChange={(e) => setPackedFilter(e.target.value as 'ALL' | 'PACKED' | 'UNPACKED')}
              className="px-3 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-purple-500 dark:text-white shadow-sm h-[38px] cursor-pointer"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="PACKED">PACKED</option>
              <option value="UNPACKED">UNPACKED</option>
            </select>
          )}
        </div>
      </div>

      {viewMode === 'datewise' ? (
        <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0 mt-2">
          {filteredRawItems.length > 0 && !isLoading && (
            <div className={`py-2 px-4 border-b flex items-center justify-between shrink-0 ${location === '1st' ? 'border-purple-200/50 dark:border-purple-500/10 bg-purple-50/50 dark:bg-purple-500/5' : 'border-emerald-200/50 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                Showing {filteredRawItems.length} transactions
              </p>
            </div>
          )}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : (
              <table className="w-full text-left border-collapse relative">
                <thead className={`sticky top-0 z-20 shadow-sm ${location === '1st' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                  <tr>
                    <th className={`py-2.5 px-4 text-[10px] font-black uppercase tracking-widest border-b ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Date</th>
                    <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Category</th>
                    <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Item Name</th>
                    <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-right ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>In</th>
                    <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-right ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Out</th>
                    <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-right ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Live Stock</th>
                    {location === '1st' && (
                      <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-center text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20">Status</th>
                    )}
                    <th className={`py-2.5 px-4 text-[10px] font-black uppercase tracking-widest border-b text-center w-20 ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Act</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${location === '1st' ? 'divide-purple-100 dark:divide-purple-500/10' : 'divide-emerald-100 dark:divide-emerald-500/10'}`}>
                  {filteredRawItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">
                      <td className="py-2 px-4 text-[11px] font-bold text-gray-500">{formatDate(log.date || log.updated_at)}</td>
                      <td className="py-2 px-3 text-[11px] font-bold text-gray-500 uppercase">{log.category}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-gray-900 dark:text-white uppercase">{log.item_name}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-emerald-600 dark:text-emerald-400 text-right">{log.in_qty !== "0" && log.in_qty !== "" ? `+${log.in_qty}` : "-"}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-rose-600 dark:text-rose-400 text-right">{log.out_qty !== "0" && log.out_qty !== "" ? `-${log.out_qty}` : "-"}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-[#003875] dark:text-[#FFD500] text-right">{(log as any).running_stock}</td>
                      {location === '1st' && (
                        <td className="py-2 px-3 text-center">
                          {log.packed_status === 'PACKED' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md text-[9px] font-black uppercase">Packed</span>
                          ) : log.packed_status === 'UNPACKED' ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-md text-[9px] font-black uppercase">Unpacked</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )}
                      <td className="py-2 px-4 text-center">
                        <button onClick={() => confirmDelete(log.id.toString())} className="text-rose-400 hover:text-rose-600 transition-colors">
                          <TrashIcon className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRawItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-[11px] font-black uppercase">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : viewMode === 'timeseries' ? (
        <div className="flex flex-col gap-2 shrink-0 mb-2">
          <TimeSeriesTable 
            transactions={rawItems.map(item => ({ 
              item_name: item.item_name, 
              category: item.category, 
              date: item.date || item.updated_at || '', 
              in_qty: parseFloat(item.in_qty) || 0, 
              out_qty: parseFloat(item.out_qty) || 0 
            }))}
            bucket={mappedTimeBucket}
            isLoading={isLoading}
            searchQuery={searchQuery}
          />
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0 mt-2">
        {filteredItems.length > 0 && !isLoading && (
          <div className={`py-2 px-4 border-b flex items-center justify-between shrink-0 ${location === '1st' ? 'border-purple-200/50 dark:border-purple-500/10 bg-purple-50/50 dark:bg-purple-500/5' : 'border-emerald-200/50 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} unique items
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {isLoading ? (
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
              <thead className={`sticky top-0 z-20 shadow-sm ${location === '1st' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                <tr>
                  <th className={`py-2.5 px-3 border-b text-center sticky left-0 z-30 w-12 ${location === '1st' ? 'border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-900/20 shadow-[1px_0_0_0_#e9d5ff] dark:shadow-[1px_0_0_0_rgba(168,85,247,0.2)]' : 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/20 shadow-[1px_0_0_0_#a7f3d0] dark:shadow-[1px_0_0_0_rgba(16,185,129,0.2)]'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${location === '1st' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>#</span>
                  </th>
                  <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b whitespace-nowrap ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Category</th>
                  <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b whitespace-nowrap ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Item Name</th>
                  <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-right ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Total In</th>
                  <th className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest border-b text-right ${location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>Total Out</th>
                  <th className={`py-2.5 px-4 text-[10px] font-black uppercase tracking-widest border-b text-right w-32 ${location === '1st' ? 'text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 bg-purple-100/50 dark:bg-purple-500/10' : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 bg-emerald-100/50 dark:bg-emerald-500/10'}`}>Live Stock</th>
                  {location === '1st' && (
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-widest border-b text-center text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 w-24">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${location === '1st' ? 'divide-purple-100 dark:divide-purple-500/10' : 'divide-emerald-100 dark:divide-emerald-500/10'}`}>
                {paginatedItems.map((item, idx) => {
                  const health = getHealthColors(item.live_stock || 0);
                  return (
                    <tr
                      key={item.item_name}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className={`py-1 px-2 text-center sticky left-0 z-10 transition-colors border-r bg-white dark:bg-[#111827] ${
                          location === '1st' 
                            ? 'shadow-[1px_0_0_0_#e9d5ff] dark:shadow-[1px_0_0_0_rgba(168,85,247,0.2)] group-hover:bg-purple-50/50 dark:group-hover:bg-[#1a2335] border-purple-100 dark:border-purple-500/10' 
                            : 'shadow-[1px_0_0_0_#a7f3d0] dark:shadow-[1px_0_0_0_rgba(16,185,129,0.2)] group-hover:bg-emerald-50/50 dark:group-hover:bg-[#1a2335] border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { 
                            setSelectedLogItem(item.item_name);
                            setIsLogModalOpen(true);
                          }} className="text-gray-400 hover:text-[#003875] dark:hover:text-[#FFD500] transition-colors" title="View Transactions">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">{item.category}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[300px]" title={item.item_name}>{item.item_name}</td>
                      <td className="py-2 px-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-right">{item.in_qty}</td>
                      <td className="py-2 px-3 text-[11px] font-bold text-rose-600 dark:text-rose-400 text-right">{item.out_qty}</td>
                      <td className="py-1 px-4 bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="flex flex-col gap-1 w-full justify-end items-end">
                          <span className={`text-sm font-black ${health.text}`}>{item.live_stock}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{health.label}</span>
                        </div>
                      </td>
                      {location === '1st' && (
                        <td className="py-2 px-4 text-center">
                          {item.packed_status === 'PACKED' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md text-[9px] font-black uppercase">Packed</span>
                          ) : item.packed_status === 'UNPACKED' ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-md text-[9px] font-black uppercase">Unpacked</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-[11px] font-black uppercase">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      <datalist id="category-list">
        {masterCategories.map(cat => (
          <option key={cat} value={cat as string} />
        ))}
      </datalist>

      <datalist id="master-items-list">
        {masterItems.map((item: any) => (
          <option key={item.id} value={item.item_name} />
        ))}
      </datalist>

      {/* Transaction Log Modal */}
      <AnimatePresence>
        {isLogModalOpen && selectedLogItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)] w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1f2937]/50 shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-gray-900 dark:text-white">
                  <EyeIcon className="w-5 h-5 text-gray-400" />
                  Transaction Logs - {selectedLogItem}
                </h3>
                <button onClick={() => setIsLogModalOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-[#111827]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 dark:bg-[#1f2937] sticky top-0 z-20">
                    <tr>
                      <th className="py-2.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Date</th>
                      <th className="py-2.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">In Qty</th>
                      <th className="py-2.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Out Qty</th>
                      <th className="py-2.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-center w-20">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {transactionLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-4 text-[11px] font-bold text-gray-500">{formatDate(log.date || log.updated_at)}</td>
                        <td className="py-2 px-4 text-[11px] font-black text-emerald-600 dark:text-emerald-400 text-right">{log.in_qty !== "0" && log.in_qty !== "" ? `+${log.in_qty}` : "-"}</td>
                        <td className="py-2 px-4 text-[11px] font-black text-rose-600 dark:text-rose-400 text-right">{log.out_qty !== "0" && log.out_qty !== "" ? `-${log.out_qty}` : "-"}</td>
                        <td className="py-2 px-4 text-center">
                          {!String(log.id).startsWith("outform-") && (
                            <button onClick={() => confirmDelete(log.id.toString())} className="text-rose-400 hover:text-rose-600 transition-colors">
                              <TrashIcon className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {transactionLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 text-[11px] font-black uppercase">No logs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Entry Modal */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_0_40px_rgba(0,56,117,0.3)] dark:shadow-[0_0_40px_rgba(255,213,0,0.1)] w-full max-w-5xl overflow-hidden border border-[#003875]/30 dark:border-[#FFD500]/20 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-blue-800/20 dark:border-white/5 bg-gradient-to-r from-[#003875] to-blue-800 dark:from-[#1f2937] dark:to-[#111827] text-white shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-blue-200 dark:text-[#FFD500]" />
                  Add Multiple Items - {title}
                </h3>
                <button onClick={() => setItemModalOpen(false)} className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 dark:bg-[#1f2937] rounded-lg shadow-sm transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111827]">
                <div className="space-y-4">
                  <button 
                    onClick={addBulkRow}
                    className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#003875] dark:text-[#FFD500] hover:bg-blue-50 dark:hover:bg-[#FFD500]/10 rounded-xl transition-colors border border-dashed border-[#003875]/30 dark:border-[#FFD500]/30 w-full justify-center"
                  >
                    <PlusIcon className="w-4 h-4" /> Add Another Row
                  </button>
                  {bulkRows.map((row, index) => (
                    <div key={row.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl relative group">
                      <div className="flex-1 min-w-[200px] w-full">
                        <FloatingInput 
                          label="Item Name *" 
                          name={`item_name_${row.id}`} 
                          list="master-items-list" 
                          value={row.item_name} 
                          icon={TagIcon}
                          onChange={(val) => handleBulkRowChange(row.id, "item_name", val)} 
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <FloatingInput 
                          label="Category" 
                          name={`category_${row.id}`} 
                          list="category-list" 
                          value={row.category} 
                          icon={FolderIcon}
                          onChange={(val) => handleBulkRowChange(row.id, "category", val)} 
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                          <button 
                            onClick={() => handleBulkRowChange(row.id, "type", "IN")}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${row.type === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                          >
                            IN
                          </button>
                          <button 
                            onClick={() => handleBulkRowChange(row.id, "type", "OUT")}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${row.type === 'OUT' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                          >
                            OUT
                          </button>
                        </div>
                        {location === '1st' && (
                          <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg shrink-0">
                            <button 
                              onClick={() => handleBulkRowChange(row.id, "packed_status", "PACKED")}
                              className={`px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${row.packed_status === 'PACKED' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                              PACKED
                            </button>
                            <button 
                              onClick={() => handleBulkRowChange(row.id, "packed_status", "UNPACKED")}
                              className={`px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${row.packed_status === 'UNPACKED' ? 'bg-gray-400 text-white shadow-sm dark:bg-gray-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                              UNPACKED
                            </button>
                          </div>
                        )}
                        <div className="w-24">
                          <FloatingInput 
                            label="Qty *" 
                            type="number" 
                            step="0.01" 
                            name={`qty_${row.id}`} 
                            value={row.qty} 
                            icon={HashtagIcon}
                            onChange={(val) => handleBulkRowChange(row.id, "qty", val)} 
                          />
                        </div>
                        <div className="w-40">
                          <FloatingInput 
                            label="Date" 
                            type="date" 
                            name={`date_${row.id}`} 
                            value={row.date || ''} 
                            icon={CalendarDaysIcon}
                            onChange={(val) => handleBulkRowChange(row.id, "date", val)} 
                          />
                        </div>
                        <button onClick={() => removeBulkRow(row.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-[#1f2937]/50 shrink-0">
                <button onClick={() => setItemModalOpen(false)} className="px-5 py-2 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white dark:hover:bg-[#111827] shadow-sm border border-gray-200 dark:border-white/10 transition-colors">Cancel</button>
                <button 
                  onClick={handleSaveItem} 
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003875] to-blue-600 dark:from-[#FFD500] dark:to-yellow-400 dark:text-[#003875] uppercase tracking-widest hover:brightness-110 shadow-lg shadow-blue-500/20 dark:shadow-yellow-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Record(s)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Physical Stock Check (Audit) Modal */}
      <AnimatePresence>
        {isAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`bg-white dark:bg-[#111827] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] w-full max-w-5xl overflow-hidden border flex flex-col max-h-[90vh] ${
                location === '1st' ? 'border-purple-600/30 dark:border-purple-400/20' : 'border-emerald-600/30 dark:border-emerald-400/20'
              }`}
            >
              <div className={`flex items-center justify-between p-5 border-b bg-gradient-to-r text-white shrink-0 ${
                location === '1st' ? 'from-purple-600 to-fuchsia-800 border-purple-800/20' : 'from-emerald-600 to-teal-800 border-emerald-800/20'
              }`}>
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-white/90" />
                  Physical Stock Audit
                </h3>
                <button onClick={() => setIsAuditModalOpen(false)} className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 dark:bg-[#1f2937] rounded-lg shadow-sm transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111827]">
                <div className="space-y-4">
                  <button 
                    onClick={addAuditRow}
                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-opacity-10 rounded-xl transition-colors border border-dashed w-full justify-center ${
                      location === '1st' ? 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10' : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    <PlusIcon className="w-4 h-4" /> Add Item to Audit
                  </button>
                  {auditRows.map((row) => (
                    <div key={row.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl relative group">
                      <div className="flex-1 min-w-[200px] w-full">
                        <FloatingInput 
                          label="Item Name *" 
                          name={`audit_item_${row.id}`} 
                          list="master-items-list" 
                          value={row.item_name} 
                          icon={TagIcon}
                          onChange={(val) => handleAuditRowChange(row.id, "item_name", val)} 
                        />
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Live Stock</span>
                          <span className={`text-sm font-black ${getHealthColors(row.live_stock).text}`}>{row.live_stock}</span>
                        </div>
                        
                        <div className="w-24 shrink-0">
                          <FloatingInput 
                            label="Physical Qty *" 
                            type="number" 
                            step="0.01" 
                            name={`phys_qty_${row.id}`} 
                            value={row.physical_qty} 
                            icon={HashtagIcon}
                            onChange={(val) => handleAuditRowChange(row.id, "physical_qty", val)} 
                          />
                        </div>

                        <div className="flex flex-col items-center justify-center w-28 shrink-0 h-10 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Difference</span>
                          {row.diff_type === 'IN' && (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider leading-none">
                              +{row.diff_qty} (ADD)
                            </span>
                          )}
                          {row.diff_type === 'OUT' && (
                            <span className="text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider leading-none">
                              -{row.diff_qty} (OUT)
                            </span>
                          )}
                          {row.diff_type === 'NONE' && row.physical_qty && row.item_name && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-wider leading-none">
                              MATCHED
                            </span>
                          )}
                          {(!row.physical_qty || !row.item_name) && (
                            <span className="text-gray-300 dark:text-gray-600 text-xs font-black uppercase tracking-wider leading-none">
                              -
                            </span>
                          )}
                        </div>

                        <button onClick={() => removeAuditRow(row.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 self-end md:self-center">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-[#1f2937]/50 shrink-0">
                <button onClick={() => setIsAuditModalOpen(false)} className="px-5 py-2 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white dark:hover:bg-[#111827] shadow-sm border border-gray-200 dark:border-white/10 transition-colors">Cancel</button>
                <button 
                  onClick={handleSaveAudit} 
                  disabled={submitting || auditRows.filter(r => r.diff_type !== 'NONE').length === 0}
                  className={`px-6 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:brightness-110 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    location === '1st' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-purple-500/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20'
                  }`}
                >
                  {submitting ? 'Applying...' : 'Apply Adjustments'}
                </button>
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
        title="Delete Transaction"
        message={`Are you sure you want to completely remove this transaction log from the system? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
      />
    </div>
  );
}
