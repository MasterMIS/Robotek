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
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { FloorIMS } from "@/types/ims-floor";
import TimeSeriesTable, { TimeBucket } from "@/components/TimeSeriesTable";

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

interface BulkRow {
  id: string;
  item_name: string;
  category: string;
  type: 'IN' | 'OUT';
  qty: string;
}

export default function IMSFloor({ location, onBack }: { location: "1st" | "g", onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');

  const [viewMode, setViewMode] = useState<'default' | 'timeseries'>('default');
  const [timeBucket, setTimeBucket] = useState<TimeBucket>('Daily');

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

  const { data: rawItems = [], mutate, isLoading } = useSWR<FloorIMS[]>(`/api/ims/floor?location=${location}`, fetcher);
  const { data: masterItems = [] } = useSWR<any[]>("/api/ims", fetcher);

  // AGGREGATION LOGIC
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, FloorIMS>();
    rawItems.forEach(item => {
      const key = item.item_name?.toLowerCase().trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { ...item, in_qty: "0", out_qty: "0", live_stock: 0 });
      }
      const agg = map.get(key)!;
      const inVal = parseFloat(item.in_qty) || 0;
      const outVal = parseFloat(item.out_qty) || 0;
      agg.in_qty = (parseFloat(agg.in_qty) + inVal).toString();
      agg.out_qty = (parseFloat(agg.out_qty) + outVal).toString();
      agg.live_stock = parseFloat(agg.in_qty) - parseFloat(agg.out_qty);
      // keep the latest date
      if (item.updated_at && (!agg.updated_at || new Date(item.updated_at) > new Date(agg.updated_at))) {
        agg.updated_at = item.updated_at;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [rawItems]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(aggregatedItems.map(i => i.category))).filter(Boolean);
  }, [aggregatedItems]);

  const masterCategories = useMemo(() => {
    return Array.from(new Set(masterItems.map(i => i.category))).filter(Boolean);
  }, [masterItems]);

  const filteredItems = useMemo(() => {
    return aggregatedItems.filter(item =>
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [aggregatedItems, searchQuery]);

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
    setBulkRows(prev => [...prev, { id: Date.now().toString(), item_name: '', category: '', type: 'IN', qty: '' }]);
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
    const headers = ["Item Name", "Category", "In Qty", "Out Qty", "Live Stock"];
    const rows = filteredItems.map((item) => [
      item.item_name,
      item.category,
      item.in_qty,
      item.out_qty,
      item.live_stock,
    ]);

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
            <div className="p-2.5 bg-[#003875] dark:bg-[#FFD500] rounded-xl shadow-lg shadow-[#003875]/20 dark:shadow-[#FFD500]/20">
              <ClipboardDocumentListIcon className="w-7 h-7 text-white dark:text-[#003875]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{title}</h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inventory Management System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('default')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'default' 
                ? 'bg-white dark:bg-[#111827] text-[#003875] dark:text-[#FFD500] shadow-sm' 
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
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative shrink-0 flex-1 lg:flex-none">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH ITEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-xl text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#003875] dark:text-white w-full lg:w-64 transition-all shadow-sm h-full"
            />
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border border-gray-200 dark:border-white/10 shadow-sm whitespace-nowrap">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export
          </button>
          <button onClick={() => {
            setBulkRows([{ id: Date.now().toString(), item_name: '', category: '', type: 'IN', qty: '' }]);
            setItemModalOpen(true);
          }} className="flex items-center gap-1.5 px-4 py-2 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-[#003875] hover:brightness-110 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm whitespace-nowrap">
            <PlusIcon className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {viewMode === 'timeseries' ? (
        <div className="flex flex-col gap-2 shrink-0 mb-2">
          <div className="flex gap-2">
            {(['Daily', 'Weekly', 'Monthly', 'Quarterly'] as TimeBucket[]).map(bucket => (
              <button
                key={bucket}
                onClick={() => setTimeBucket(bucket)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeBucket === bucket
                    ? 'bg-[#003875] text-white dark:bg-[#FFD500] dark:text-[#003875] shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                }`}
              >
                {bucket}
              </button>
            ))}
          </div>
          <TimeSeriesTable 
            transactions={rawItems.map(item => ({ 
              item_name: item.item_name, 
              category: item.category, 
              date: item.date || item.updated_at || '', 
              in_qty: parseFloat(item.in_qty) || 0, 
              out_qty: parseFloat(item.out_qty) || 0 
            }))}
            bucket={timeBucket}
            isLoading={isLoading}
            searchQuery={searchQuery}
          />
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0 mt-2">
        {filteredItems.length > 0 && !isLoading && (
          <div className="py-2 px-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#1f2937]/50 shrink-0">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
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
              <thead className="bg-gray-100 dark:bg-[#1f2937] sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3 border-b border-gray-200 dark:border-white/10 text-center sticky left-0 bg-gray-100 dark:bg-[#1f2937] z-30 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] w-20">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logs</span>
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Category</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Item Name</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Total In</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Total Out</th>
                  <th className="py-2.5 px-4 text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right bg-gray-50 dark:bg-white/5 w-32">Live Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedItems.map((item) => {
                  const health = getHealthColors(item.live_stock || 0);
                  return (
                    <tr
                      key={item.item_name}
                      className="hover:bg-blue-50/30 dark:hover:bg-white/[0.03] even:bg-gray-50/50 dark:even:bg-[#1f2937]/30 transition-colors group"
                    >
                      <td className="py-1 px-2 text-center sticky left-0 z-20 transition-colors border-r shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] bg-white group-even:bg-gray-50/50 dark:bg-[#111827] dark:group-even:bg-[#182031] group-hover:bg-blue-50/30 dark:group-hover:bg-[#1a2335] border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { 
                            setSelectedLogItem(item.item_name);
                            setIsLogModalOpen(true);
                          }} className="text-[#003875] dark:text-[#FFD500] hover:scale-110 transition-transform" title="View Transactions">
                            <EyeIcon className="w-5 h-5" />
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
              className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_0_40px_rgba(0,56,117,0.3)] dark:shadow-[0_0_40px_rgba(255,213,0,0.1)] w-full max-w-4xl overflow-hidden border border-[#003875]/30 dark:border-[#FFD500]/20 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-blue-800/20 dark:border-white/5 bg-gradient-to-r from-[#003875] to-blue-800 dark:from-[#1f2937] dark:to-[#111827] text-white shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <EyeIcon className="w-5 h-5 text-blue-200 dark:text-[#FFD500]" />
                  Transaction Logs - {selectedLogItem}
                </h3>
                <button onClick={() => setIsLogModalOpen(false)} className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 dark:bg-[#1f2937] rounded-lg shadow-sm transition-colors">
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
                          <button onClick={() => confirmDelete(log.id.toString())} className="text-rose-400 hover:text-rose-600 transition-colors">
                            <TrashIcon className="w-4 h-4 mx-auto" />
                          </button>
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
                      <div className="flex-1 min-w-[250px] w-full">
                        <FloatingInput 
                          label="Item Name *" 
                          name={`item_name_${row.id}`} 
                          list="master-items-list" 
                          value={row.item_name} 
                          onChange={(val) => handleBulkRowChange(row.id, "item_name", val)} 
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <FloatingInput 
                          label="Category" 
                          name={`category_${row.id}`} 
                          list="category-list" 
                          value={row.category} 
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
                        <div className="w-24">
                          <FloatingInput 
                            label="Qty *" 
                            name={`qty_${row.id}`} 
                            type="number" 
                            step="0.01" 
                            value={row.qty} 
                            onChange={(val) => handleBulkRowChange(row.id, "qty", val)} 
                          />
                        </div>
                      </div>
                      {bulkRows.length > 1 && (
                        <button 
                          onClick={() => removeBulkRow(row.id)}
                          className="absolute -top-2 -right-2 md:static md:top-auto md:right-auto p-1.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/40 transition-colors shadow-sm"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
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
