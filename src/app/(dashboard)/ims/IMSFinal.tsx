"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const getHealthColors = (live: number) => {
  if (live < 0) return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10";
  if (live === 0) return "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10";
  return "text-[#003875] dark:text-[#FFD500] bg-blue-50 dark:bg-[#FFD500]/10";
};

export default function IMSFinal({ onBack }: { onBack: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: masterItems = [], isLoading: isLoadingMaster } = useSWR("/api/ims", fetcher);
  const { data: firstItems = [], isLoading: isLoadingFirst } = useSWR("/api/ims/floor?location=1st", fetcher);
  const { data: gItems = [], isLoading: isLoadingG } = useSWR("/api/ims/floor?location=g", fetcher);

  const isLoading = isLoadingMaster || isLoadingFirst || isLoadingG;

  const aggregatedItems = useMemo(() => {
    const map = new Map<string, any>();
    
    const addToMap = (item: any) => {
      const key = item.item_name?.toLowerCase().trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { 
          item_name: item.item_name, 
          category: item.category || 'Uncategorized', 
          in_qty: 0, 
          out_qty: 0, 
          live_stock: 0 
        });
      }
      const agg = map.get(key)!;
      const inVal = parseFloat(item.in_qty) || 0;
      const outVal = parseFloat(item.out_qty) || 0;
      agg.in_qty += inVal;
      agg.out_qty += outVal;
      agg.live_stock += (inVal - outVal);
      // keep the latest category if not set
      if (agg.category === 'Uncategorized' && item.category) {
        agg.category = item.category;
      }
    };

    masterItems.forEach(addToMap);
    firstItems.forEach(addToMap);
    gItems.forEach(addToMap);

    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [masterItems, firstItems, gItems]);

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

  const handleExport = () => {
    const exportData = filteredItems.map(item => ({
      Category: item.category,
      "Item Name": item.item_name,
      "Total In": item.in_qty,
      "Total Out": item.out_qty,
      "Live Stock": item.live_stock
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Final_IMS");
    XLSX.writeFile(wb, `Final_IMS_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 bg-white dark:bg-[#111827] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-700 rounded-xl shadow-lg shadow-orange-900/20">
              <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">Final IMS</h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Storage Overview</p>
            </div>
          </div>
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
        </div>
      </div>

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
                  <th className="py-2.5 px-3 border-b border-gray-200 dark:border-white/10 text-center sticky left-0 bg-gray-100 dark:bg-[#1f2937] z-30 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] w-12">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">#</span>
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Category</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Item Name</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Total In</th>
                  <th className="py-2.5 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right">Total Out</th>
                  <th className="py-2.5 px-4 text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-200 dark:border-white/10 text-right bg-gray-50 dark:bg-white/5 w-32">Live Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedItems.map((item, idx) => {
                  const health = getHealthColors(item.live_stock || 0);
                  return (
                    <tr
                      key={item.item_name}
                      className="hover:bg-orange-50/30 dark:hover:bg-white/[0.03] even:bg-gray-50/50 dark:even:bg-[#1f2937]/30 transition-colors group"
                    >
                      <td className="py-1 px-2 text-center sticky left-0 z-10 transition-colors border-r shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] bg-white group-even:bg-gray-50/50 dark:bg-[#111827] dark:group-even:bg-[#182031] group-hover:bg-orange-50/30 dark:group-hover:bg-[#1a2335] border-gray-100 dark:border-white/5">
                        <span className="text-[10px] font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                      </td>
                      <td className="py-1 px-3">
                        <span className="inline-block px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-wide">
                        {item.item_name}
                      </td>
                      <td className="py-1 px-3 text-[11px] font-black text-emerald-600 dark:text-emerald-400 text-right">
                        {item.in_qty !== 0 ? item.in_qty.toLocaleString() : "-"}
                      </td>
                      <td className="py-1 px-3 text-[11px] font-black text-rose-600 dark:text-rose-400 text-right">
                        {item.out_qty !== 0 ? item.out_qty.toLocaleString() : "-"}
                      </td>
                      <td className={`py-1 px-4 text-[12px] font-black text-right transition-colors bg-gray-50/50 dark:bg-white/[0.02] ${health}`}>
                        {item.live_stock.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 text-[11px] font-black uppercase tracking-widest">
                      {searchQuery ? "No items found matching search" : "No items available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
