"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  ComputerDesktopIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
  WrenchScrewdriverIcon,
  ArchiveBoxXMarkIcon,
  IdentificationIcon,
  TagIcon,
  DocumentTextIcon,
  UserCircleIcon,
  HashtagIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { AssetItem } from "@/types/asset";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const FloatingInput = ({
  label, value, onChange, type = "text", step, disabled, name, list, icon: Icon
}: { label: string, value: any, onChange: (val: string) => void, type?: string, step?: string, disabled?: boolean, name?: string, list?: string, icon?: any }) => (
  <div className="relative z-0 w-full group">
    {Icon && (
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <input
      type={type}
      step={step}
      name={name}
      id={name}
      list={list}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`block ${Icon ? 'pl-10' : 'px-3'} pr-3 pb-2.5 pt-4 w-full text-sm font-bold text-gray-900 bg-transparent rounded-lg border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-[#FFD500] focus:outline-none focus:ring-0 focus:border-[#003875] peer uppercase disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5`}
      placeholder=" "
    />
    <label htmlFor={name} className={`absolute text-[10px] font-black text-gray-400 dark:text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#111827] px-2 peer-focus:px-2 peer-focus:text-[#003875] peer-focus:dark:text-[#FFD500] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto ${Icon ? 'start-8' : 'start-1'} uppercase tracking-widest`}>{label}</label>
  </div>
);

const FloatingSelect = ({
  label, value, onChange, options, disabled, name, icon: Icon
}: { label: string, value: any, onChange: (val: string) => void, options: string[], disabled?: boolean, name?: string, icon?: any }) => (
  <div className="relative z-0 w-full group">
    {Icon && (
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <select
      name={name}
      id={name}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`block ${Icon ? 'pl-10' : 'px-3'} pr-3 pb-2.5 pt-4 w-full text-sm font-bold text-gray-900 bg-transparent rounded-lg border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-[#FFD500] focus:outline-none focus:ring-0 focus:border-[#003875] peer uppercase disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5`}
    >
      <option value="" disabled className="dark:bg-gray-800">Select Option</option>
      {options.map(opt => <option key={opt} value={opt} className="dark:bg-gray-800">{opt}</option>)}
    </select>
    <label htmlFor={name} className={`absolute text-[10px] font-black text-gray-400 dark:text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#111827] px-2 peer-focus:px-2 peer-focus:text-[#003875] peer-focus:dark:text-[#FFD500] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto ${Icon ? 'start-8' : 'start-1'} uppercase tracking-widest`}>{label}</label>
  </div>
);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = date.getDate().toString().padStart(2, '0');
  const m = date.toLocaleString('default', { month: 'short' });
  const y = date.getFullYear().toString().slice(-2);
  return `${d} ${m} ${y}`.toUpperCase();
};

const SearchableUserSelect = ({
  label, value, onChange, options, icon: Icon
}: { label: string, value: string, onChange: (val: string) => void, options: string[], icon?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  const displayValue = isOpen ? search : value;

  return (
    <div className="relative z-20 w-full group" ref={dropdownRef}>
      {Icon && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500 z-10">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch("");
        }}
        className={`block ${Icon ? 'pl-10' : 'px-3'} pr-3 pb-2.5 pt-4 w-full text-sm font-bold text-gray-900 bg-transparent rounded-lg border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-[#FFD500] focus:outline-none focus:ring-0 focus:border-[#003875] peer uppercase disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-white/5 cursor-text`}
        placeholder=" "
      />
      <label className={`absolute text-[10px] font-black text-gray-400 dark:text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#111827] px-2 peer-focus:px-2 peer-focus:text-[#003875] peer-focus:dark:text-[#FFD500] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto ${Icon ? 'start-8' : 'start-1'} uppercase tracking-widest`}>{label}</label>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer uppercase transition-colors"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AssetManagementPage() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();

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
  const [statusFilter, setStatusFilter] = useState<AssetItem["status"] | "ALL">("ALL");

  // Modals state
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState<Partial<AssetItem>>({});

  const { data: rawItems, mutate: mutateAssets, isLoading: assetsLoading } = useSWR<AssetItem[]>("/api/assets", fetcher);
  const items = rawItems || [];

  const { data: usersData } = useSWR<any[]>("/api/users", fetcher);
  const userOptions = useMemo(() => {
    if (!usersData) return [];
    return usersData.map(u => u.username).sort();
  }, [usersData]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item =>
      (item.asset_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.asset_id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.assigned_to?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.category?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    if (statusFilter !== "ALL") {
      result = result.filter(item => item.status === statusFilter);
    }

    return result;
  }, [items, searchQuery, statusFilter]);

  // KPIs
  const totalAssets = items.length;
  const availableCount = items.filter(i => i.status === "Available").length;
  const inUseCount = items.filter(i => i.status === "In Use").length;
  const maintenanceCount = items.filter(i => i.status === "Maintenance").length;

  const handleSaveItem = async () => {
    setSubmitting(true);
    showStatus(editingItem ? "Updating Asset Record..." : "Creating New Asset...", "loading");
    const isEdit = !!editingItem;
    const method = isEdit ? "PUT" : "POST";

    // Auto-generate Asset ID if not provided on create
    if (!isEdit && !itemForm.asset_id) {
      const maxId = items.reduce((max, item) => {
        if (item.asset_id && item.asset_id.toUpperCase().startsWith("AST-")) {
          const num = parseInt(item.asset_id.replace(/[^0-9]/g, ""), 10);
          return !isNaN(num) && num > max ? num : max;
        }
        return max;
      }, 0);
      itemForm.asset_id = `AST-${String(maxId + 1).padStart(4, '0')}`;
    }

    if (!itemForm.status) {
      itemForm.status = "Available";
    }

    try {
      const res = await fetch("/api/assets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm)
      });

      if (res.ok) {
        mutateAssets();
        setItemModalOpen(false);
        setItemForm({});
        setEditingItem(null);
        showStatus("Record Saved Successfully!", "success");
        setTimeout(() => setIsStatusModalOpen(false), 1500);
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      showStatus("Error saving asset record.", "error");
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
    setIsConfirmOpen(false);
    showStatus(`Deleting asset...`, "loading");
    try {
      const res = await fetch(`/api/assets?id=${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutateAssets();
        showStatus("Asset Deleted Successfully!", "success");
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

  const handleNewAssetClick = () => {
    setEditingItem(null);
    const maxId = items.reduce((max, item) => {
      if (item.asset_id && item.asset_id.toUpperCase().startsWith("AST-")) {
        const num = parseInt(item.asset_id.replace(/[^0-9]/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    const nextId = `AST-${String(maxId + 1).padStart(4, '0')}`;

    setItemForm({ asset_id: nextId, status: "Available" });
    setItemModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'In Use': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 'Maintenance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      case 'Retired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800/50';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1c] flex flex-col h-[calc(100vh-4rem)] p-2 gap-2">
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={statusType}
        message={statusMessage}
        onClose={() => setIsStatusModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Asset"
        message="Are you sure you want to delete this asset? This action cannot be undone."
        onConfirm={performDelete}
        onClose={() => setIsConfirmOpen(false)}
        type="danger"
      />

      {/* Top Header & Actions Row */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl p-3 shadow-sm gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#003875] dark:bg-[#FFD500] rounded-lg shadow-inner">
            <ComputerDesktopIcon className="w-5 h-5 text-white dark:text-[#003875]" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none">Asset Management</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Resource Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH ASSETS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#003875] dark:text-white w-64 transition-all shadow-sm h-full"
            />
          </div>
          <button onClick={handleNewAssetClick} className="flex items-center gap-1.5 px-4 py-2 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-[#003875] hover:brightness-110 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm">
            <PlusIcon className="w-4 h-4" /> Add Asset
          </button>
        </div>
      </div>

      {/* KPI Row (Gradient & Watermarks) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 shrink-0">
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`relative overflow-hidden bg-gradient-to-br from-[#003875] to-blue-800 dark:from-blue-900 dark:to-blue-950 text-white border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${statusFilter === "ALL" ? "ring-2 ring-blue-500 shadow-lg" : "border-transparent shadow-sm"}`}
        >
          <div className="z-10 relative">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Total Assets</p>
            <p className="text-2xl font-black leading-none mt-1">{totalAssets}</p>
          </div>
          <ArchiveBoxIcon className="w-16 h-16 absolute -right-2 -bottom-2 text-white/10 rotate-12 transition-transform group-hover:rotate-0" />
        </div>

        <div
          onClick={() => setStatusFilter("Available")}
          className={`relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${statusFilter === "Available" ? "ring-2 ring-emerald-500 shadow-lg" : "border-transparent shadow-sm"}`}
        >
          <div className="z-10 relative">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Available</p>
            <p className="text-2xl font-black leading-none mt-1">{availableCount}</p>
          </div>
          <CheckBadgeIcon className="w-16 h-16 absolute -right-2 -bottom-2 text-white/10 rotate-12" />
        </div>

        <div
          onClick={() => setStatusFilter("In Use")}
          className={`relative overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-600 dark:to-blue-800 text-white border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${statusFilter === "In Use" ? "ring-2 ring-blue-400 shadow-lg" : "border-transparent shadow-sm"}`}
        >
          <div className="z-10 relative">
            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">In Use</p>
            <p className="text-2xl font-black leading-none mt-1">{inUseCount}</p>
          </div>
          <ComputerDesktopIcon className="w-16 h-16 absolute -right-2 -bottom-2 text-white/20 rotate-12" />
        </div>

        <div
          onClick={() => setStatusFilter("Maintenance")}
          className={`relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-600 dark:to-orange-800 text-white border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${statusFilter === "Maintenance" ? "ring-2 ring-amber-500 shadow-lg" : "border-transparent shadow-sm"}`}
        >
          <div className="z-10 relative">
            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">In Maintenance</p>
            <p className="text-2xl font-black leading-none mt-1">{maintenanceCount}</p>
          </div>
          <WrenchScrewdriverIcon className="w-16 h-16 absolute -right-2 -bottom-2 text-white/20 rotate-12" />
        </div>
      </div>

      {/* Main Data Area (Fills remaining height) */}
      <div className="flex-1 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {assetsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 flex-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-left border-collapse relative">
              <thead className="bg-gray-100 dark:bg-[#1f2937] sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-gray-200 dark:border-white/10 text-center sticky left-0 bg-gray-100 dark:bg-[#1f2937] z-30 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] w-24">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Acts</span>
                  </th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Asset ID</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 whitespace-nowrap">Asset Name</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Assigned To</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Status</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Serial Number</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Purchase Date</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Remarks</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr
                      key={item.id || idx}
                      className="transition-colors group hover:bg-blue-50/30 dark:hover:bg-white/[0.03] even:bg-gray-50/50 dark:even:bg-[#1f2937]/30"
                    >
                      <td className="py-2 px-4 text-center sticky left-0 z-20 transition-colors border-r shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] bg-white group-even:bg-gray-50/50 dark:bg-[#111827] dark:group-even:bg-[#182031] group-hover:bg-blue-50/30 dark:group-hover:bg-[#1a2335] border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingItem(item); setItemForm(item); setItemModalOpen(true); }} className="text-[#003875] dark:text-[#FFD500] hover:scale-110 transition-transform p-1" title="Edit">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => confirmDelete(item.id)} className="text-rose-500 hover:scale-110 transition-transform p-1" title="Delete">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-black text-[#003875] dark:text-[#FFD500] whitespace-nowrap">{item.asset_id}</td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{item.category}</td>
                      <td className="py-3 px-4 text-xs font-black text-gray-900 dark:text-white uppercase">{item.asset_name}</td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{item.assigned_to || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">{item.serial_number || '-'}</td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-500">{formatDate(item.purchase_date)}</td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-500 truncate max-w-[150px]">{item.remarks || '-'}</td>
                      <td className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">{item.location || '-'}</td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                      No Assets Found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Item Modal (Create / Edit) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-4 flex justify-between items-center shrink-0 bg-gradient-to-r from-[#003875] to-blue-900 dark:from-gray-800 dark:to-gray-900 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-white shadow-inner">
                  <ComputerDesktopIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-widest text-sm leading-none">
                    {editingItem ? "Edit Asset Record" : "Create New Asset"}
                  </h3>
                  <p className="text-[10px] font-bold text-blue-200 dark:text-gray-400 uppercase tracking-widest mt-1">
                    {itemForm.asset_id}
                  </p>
                </div>
              </div>
              <button onClick={() => setItemModalOpen(false)} className="text-white/60 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 active:scale-95">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FloatingInput icon={IdentificationIcon} label="Asset ID (Auto)*" value={itemForm.asset_id || ""} onChange={(v) => setItemForm({ ...itemForm, asset_id: v })} disabled />
                <FloatingSelect
                  icon={TagIcon}
                  label="Category"
                  value={itemForm.category || ""}
                  onChange={(v) => setItemForm({ ...itemForm, category: v })}
                  options={["Laptop", "Desktop", "Monitor", "Phone/Tablet", "Network Equipment", "Furniture", "Vehicle", "Other"]}
                />
                <FloatingInput icon={DocumentTextIcon} label="Asset Name*" value={itemForm.asset_name || ""} onChange={(v) => setItemForm({ ...itemForm, asset_name: v })} />
                <SearchableUserSelect
                  icon={UserCircleIcon}
                  label="Assigned To"
                  value={itemForm.assigned_to || ""}
                  onChange={(v) => setItemForm({ ...itemForm, assigned_to: v })}
                  options={userOptions}
                />

                {/* Status Pill Buttons */}
                <div className="md:col-span-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Current Status*</label>
                  <div className="flex flex-wrap gap-2">
                    {["Available", "In Use", "Maintenance", "Retired"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setItemForm({ ...itemForm, status: status as any })}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${itemForm.status === status
                            ? getStatusColor(status) + ' ring-2 ring-offset-1 shadow-md scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <FloatingInput icon={HashtagIcon} label="Serial Number" value={itemForm.serial_number || ""} onChange={(v) => setItemForm({ ...itemForm, serial_number: v })} />
                <FloatingInput icon={CalendarDaysIcon} label="Purchase Date" type="date" value={itemForm.purchase_date || ""} onChange={(v) => setItemForm({ ...itemForm, purchase_date: v })} />
                <FloatingInput icon={MapPinIcon} label="Location" value={itemForm.location || ""} onChange={(v) => setItemForm({ ...itemForm, location: v })} />
                <FloatingInput icon={ChatBubbleBottomCenterTextIcon} label="Remarks" value={itemForm.remarks || ""} onChange={(v) => setItemForm({ ...itemForm, remarks: v })} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setItemModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={submitting || !itemForm.asset_name}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#003875] dark:bg-[#FFD500] text-white dark:text-[#003875] hover:brightness-110 shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
