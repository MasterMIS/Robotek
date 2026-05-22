"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { SalesLead } from "@/types/sales";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TruckIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UserPlusIcon,
  DocumentMagnifyingGlassIcon,
  XCircleIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  ArrowRightOnRectangleIcon,
  ReceiptRefundIcon,
  HandThumbDownIcon,
  MapPinIcon,
  StarIcon,
  NoSymbolIcon,
  InboxIcon
} from "@heroicons/react/24/outline";

import CreateLeadModal from "@/components/sales/CreateLeadModal";
import LeadDetailView from "@/components/sales/LeadDetailView";
import SalesCalendar from "@/components/sales/SalesCalendar";
import EventTimeline from "@/components/sales/EventTimeline";
import { FollowUp } from "@/types/sales";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getStageConfig = (stage: string) => {
  switch (stage.toLowerCase()) {
    case 'lead generated': return { icon: <UserPlusIcon className="w-4 h-4 text-white" />, headerBg: 'bg-blue-600 border-blue-700', cardBg: 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700' };
    case 'transferring process': return { icon: <TruckIcon className="w-4 h-4 text-white" />, headerBg: 'bg-indigo-600 border-indigo-700', cardBg: 'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-700' };
    case 'qualifying process': return { icon: <DocumentMagnifyingGlassIcon className="w-4 h-4 text-white" />, headerBg: 'bg-purple-600 border-purple-700', cardBg: 'bg-purple-100 border-purple-300 dark:bg-purple-900/40 dark:border-purple-700' };
    case 'qualified': return { icon: <ShieldCheckIcon className="w-4 h-4 text-white" />, headerBg: 'bg-emerald-600 border-emerald-700', cardBg: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-700' };
    case 'lost': return { icon: <XCircleIcon className="w-4 h-4 text-white" />, headerBg: 'bg-red-600 border-red-700', cardBg: 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700' };
    case 'arrange meeting': return { icon: <CalendarDaysIcon className="w-4 h-4 text-white" />, headerBg: 'bg-cyan-600 border-cyan-700', cardBg: 'bg-cyan-100 border-cyan-300 dark:bg-cyan-900/40 dark:border-cyan-700' };
    case 'demonstration': return { icon: <VideoCameraIcon className="w-4 h-4 text-white" />, headerBg: 'bg-fuchsia-600 border-fuchsia-700', cardBg: 'bg-fuchsia-100 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:border-fuchsia-700' };
    case 'transferred to ss': return { icon: <ArrowRightOnRectangleIcon className="w-4 h-4 text-white" />, headerBg: 'bg-teal-600 border-teal-700', cardBg: 'bg-teal-100 border-teal-300 dark:bg-teal-900/40 dark:border-teal-700' };
    case 'negotiation': return { icon: <CurrencyDollarIcon className="w-4 h-4 text-white" />, headerBg: 'bg-amber-600 border-amber-700', cardBg: 'bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700' };
    case '1st billing': 
    case '2nd billing': 
    case '3rd billing': return { icon: <ReceiptRefundIcon className="w-4 h-4 text-white" />, headerBg: 'bg-green-600 border-green-700', cardBg: 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700' };
    case 'potential lead but not interesting': return { icon: <HandThumbDownIcon className="w-4 h-4 text-white" />, headerBg: 'bg-orange-600 border-orange-700', cardBg: 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-700' };
    case 'deal in reserved area': return { icon: <MapPinIcon className="w-4 h-4 text-white" />, headerBg: 'bg-rose-600 border-rose-700', cardBg: 'bg-rose-100 border-rose-300 dark:bg-rose-900/40 dark:border-rose-700' };
    case 'existing customer': return { icon: <StarIcon className="w-4 h-4 text-white" />, headerBg: 'bg-yellow-500 border-yellow-600', cardBg: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-700' };
    case 'not qualified lead': return { icon: <NoSymbolIcon className="w-4 h-4 text-white" />, headerBg: 'bg-stone-600 border-stone-700', cardBg: 'bg-stone-100 border-stone-300 dark:bg-stone-900/40 dark:border-stone-700' };
    default: return { icon: <InboxIcon className="w-4 h-4 text-white" />, headerBg: 'bg-gray-600 border-gray-700', cardBg: 'bg-gray-100 border-gray-300 dark:bg-gray-900/40 dark:border-gray-700' };
  }
};

const PIPELINE_STAGES = [
  "Lead Generated",
  "Transferring Process",
  "Qualifying Process",
  "Qualified",
  "Lost",
  "Arrange Meeting",
  "Demonstration",
  "Transferred to SS",
  "Negotiation",
  "3rd Billing",
  "1st billing",
  "2nd Billing",
  "Potential Lead but not Interesting",
  "Deal in Reserved Area",
  "Existing Customer",
  "Not Qualified Lead"
];

export default function SalesPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesLead; direction: "asc" | "desc" } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeLeadAction, setActiveLeadAction] = useState<{ lead: SalesLead, action: 'transfer' | 'qualify' | 'global' | 'followup' } | null>(null);
  
  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: session } = useSession();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: leads = [], mutate, isValidating } = useSWR<SalesLead[]>(
    "/api/sales",
    fetcher,
    { revalidateOnFocus: true }
  );

  // Fetch all follow ups for global calendar
  const { data: allFollowUps = [] } = useSWR<FollowUp[]>(
    "/api/sales/follow-up",
    fetcher,
    { revalidateOnFocus: true }
  );

  const handleSort = (key: keyof SalesLead) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const SortIcon = ({ column }: { column: keyof SalesLead }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === "asc"
      ? <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
      : <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />;
  };

  // Filter Leads
  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return leads;
    const s = debouncedSearch.toLowerCase();
    return leads.filter(lead => (
      (lead.id || "").toLowerCase().includes(s) ||
      (lead.name || "").toLowerCase().includes(s) ||
      (lead.company_name || "").toLowerCase().includes(s) ||
      (lead.phone_number || "").toLowerCase().includes(s) ||
      (lead.status || "").toLowerCase().includes(s)
    ));
  }, [leads, debouncedSearch]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      if (!sortConfig) {
        const aN = parseInt(String(a.id).replace(/\D/g, ""));
        const bN = parseInt(String(b.id).replace(/\D/g, ""));
        if (!isNaN(aN) && !isNaN(bN)) return bN - aN;
        return 0;
      }
      const { key, direction } = sortConfig;
      let aV = a[key] || ""; 
      let bV = b[key] || "";
      if (key === "id") { 
        const aN = parseInt(String(aV).replace(/\D/g, "")); 
        const bN = parseInt(String(bV).replace(/\D/g, "")); 
        if (!isNaN(aN) && !isNaN(bN)) return direction === "asc" ? aN - bN : bN - aN; 
      }
      if (aV < bV) return direction === "asc" ? -1 : 1;
      if (aV > bV) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sortConfig]);

  // Pagination for Table View
  const totalItems = sortedLeads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = sortedLeads.slice(startIndex, startIndex + itemsPerPage);

  // Group by Pipeline Stage for Kanban View
  const groupedLeads = useMemo(() => {
    const groups: Record<string, SalesLead[]> = {};
    PIPELINE_STAGES.forEach(stage => {
      groups[stage] = [];
    });
    groups["Other"] = [];

    filteredLeads.forEach(lead => {
      const status = lead.status?.trim() || "Lead Generated"; 
      let matchedStage = PIPELINE_STAGES.find(s => s.toLowerCase() === status.toLowerCase());
      if (matchedStage) {
        groups[matchedStage].push(lead);
      } else {
        groups["Other"].push(lead);
      }
    });

    return groups;
  }, [filteredLeads]);

  // Actions
  const openTransferModal = (lead: SalesLead) => {
    setActiveLeadAction({ lead, action: 'transfer' });
  };
  
  const openQualifyModal = (lead: SalesLead) => {
    setActiveLeadAction({ lead, action: 'qualify' });
  };
  
  const openGlobalModal = (lead: SalesLead) => {
    setActiveLeadAction({ lead, action: 'global' });
  };

  const openFollowUpModal = (lead: SalesLead) => {
    setActiveLeadAction({ lead, action: 'followup' });
  };

  if (activeLeadAction) {
    return (
      <LeadDetailView 
        lead={activeLeadAction.lead} 
        initialTab={activeLeadAction.action} 
        onClose={() => setActiveLeadAction(null)} 
        onUpdate={() => mutate()} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center gap-4 px-1 shrink-0">
        <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Sales Pipeline</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Manage Leads &amp; Deals</p>
        </div>
        <div className="w-full lg:w-1/3 flex justify-center flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
            <button 
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-3 md:px-5 py-1.5 font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all rounded-full whitespace-nowrap shadow-md ${viewMode === "table" ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700'}`}
            >
              <ListBulletIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 md:px-5 py-1.5 font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all rounded-full whitespace-nowrap shadow-md ${viewMode === "kanban" ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700'}`}
            >
              <ViewColumnsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1"></div>
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 transition-colors rounded-full" title="Create Lead">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="w-full lg:w-1/3 flex justify-end shrink-0">
          <div className="relative group w-full max-w-sm">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
            <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-full shadow-sm focus:border-[#FFD500] outline-none font-bold text-[12px] text-gray-700 dark:text-white transition-all" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4">
        {/* Main Pipeline Column */}
        <div className="w-full lg:w-[75%] flex flex-col overflow-hidden">
          {viewMode === "table" ? (
        <div style={{ borderColor: "var(--panel-border)" }} className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500 flex flex-col flex-1">
          <div style={{ backgroundColor: "var(--panel-card)", borderBottom: "1px solid var(--panel-border)" }} className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 md:gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}</p>
                <div className="flex gap-0.5">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">First</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronLeftIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">Last</button>
                </div>
              </div>
              <div className="hidden xs:block h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
              <div className="flex items-center gap-2">
                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "var(--panel-card)" }} className="overflow-x-auto overflow-y-auto flex-1 transition-colors duration-500 custom-scrollbar">
            <table className="w-full text-left border-collapse table-auto min-w-[800px]">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200">
                  <th onClick={() => handleSort("id")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">Lead ID <SortIcon column="id" /></div></th>
                  <th onClick={() => handleSort("name")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">Name <SortIcon column="name" /></div></th>
                  <th onClick={() => handleSort("company_name")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden sm:table-cell"><div className="flex items-center">Company <SortIcon column="company_name" /></div></th>
                  <th onClick={() => handleSort("phone_number")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">Phone <SortIcon column="phone_number" /></div></th>
                  <th onClick={() => handleSort("status")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">Status <SortIcon column="status" /></div></th>
                  <th onClick={() => handleSort("sales_person_assigned")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden lg:table-cell"><div className="flex items-center">Assigned To <SortIcon column="sales_person_assigned" /></div></th>
                  <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50/30">
                {isValidating && !leads.length ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center"><div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-2" /><p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Loading...</p></td></tr>
                ) : paginatedLeads.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center"><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No leads found</p></td></tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-orange-50/10 border-b-2 border-gray-200 dark:border-white/10 last:border-0 transition-colors group">
                      <td className="px-3 md:px-4 py-3">
                        <span className="font-black text-[11px] md:text-xs text-[#003875] dark:text-[#FFD500] leading-tight">{lead.id}</span>
                      </td>
                      <td className="px-3 md:px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-black text-[11px] md:text-xs text-gray-900 dark:text-white leading-tight truncate">{lead.name || "—"}</p>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300 hidden sm:table-cell">
                        {lead.company_name || "—"}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300">
                        {lead.phone_number || "—"}
                      </td>
                      <td className="px-3 md:px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${
                          lead.status ? 'bg-orange-50 dark:bg-white/5 border-orange-200 dark:border-white/10 text-[#003875] dark:text-sky-400' : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          {lead.status || "Lead Generated"}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 hidden lg:table-cell">
                        <p className="text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300">{lead.sales_person_assigned || "—"}</p>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openTransferModal(lead)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-all" title="Transfer Process"><TruckIcon className="w-4 h-4" /></button>
                          <button onClick={() => openQualifyModal(lead)} className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white rounded-lg transition-all" title="Qualify Process"><ShieldCheckIcon className="w-4 h-4" /></button>
                          <button onClick={() => openGlobalModal(lead)} className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-600 dark:hover:text-white rounded-lg transition-all" title="Global Fields"><GlobeAltIcon className="w-4 h-4" /></button>
                          <button onClick={() => openFollowUpModal(lead)} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white rounded-lg transition-all" title="Follow Ups"><ChatBubbleLeftRightIcon className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board Container */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
          <div className="flex gap-4 h-full px-2" style={{ width: 'max-content' }}>
            
            {isValidating && leads.length === 0 ? (
              <div className="w-full flex justify-center mt-20">
                <div className="w-8 h-8 border-4 border-gray-100 border-t-[#FFD500] rounded-full animate-spin" />
              </div>
            ) : (
              [...PIPELINE_STAGES, "Other"].map(stage => {
                const stageLeads = groupedLeads[stage];
                if (stage === "Other" && stageLeads.length === 0) return null; // Hide 'Other' if empty

                return (
                  <div key={stage} className="flex flex-col w-80 max-h-full bg-gray-50 dark:bg-navy-900/50 rounded-2xl border border-gray-200 dark:border-white/5 flex-shrink-0">
                    {/* Column Header */}
                    <div className={`p-3 border-b rounded-t-2xl flex justify-between items-center sticky top-0 z-10 ${getStageConfig(stage).headerBg}`}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`p-1.5 rounded-lg bg-white/20 shadow-sm`}>
                          {getStageConfig(stage).icon}
                        </div>
                        <h3 className={`text-xs font-black uppercase tracking-widest truncate pr-2 text-white`}>
                          {stage}
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-black shadow-sm text-white`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Kanban Cards Container */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                      {stageLeads.map(lead => (
                        <div key={lead.id} className={`group rounded-xl p-3 shadow-sm border transition-all hover:shadow-md ${getStageConfig(stage).cardBg} hover:brightness-95 dark:hover:brightness-110`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">{lead.id}</span>
                            {lead.lead_priority_type && (
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                lead.lead_priority_type.toLowerCase() === 'high' ? 'bg-red-50 text-red-600' :
                                lead.lead_priority_type.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600' :
                                'bg-green-50 text-green-600'
                              }`}>
                                {lead.lead_priority_type}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1 truncate">{lead.name || "Unnamed"}</h4>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate mb-3">{lead.company_name || lead.phone_number}</p>
                          
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 dark:border-white/5">
                            <div className="flex -space-x-2 overflow-hidden">
                               {/* Initials Avatar for Assigned Person */}
                               <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-[#003875] dark:bg-[#FFD500] flex items-center justify-center">
                                 <span className="text-[8px] font-black text-white dark:text-black">
                                    {(lead.sales_person_assigned || "U").substring(0,2).toUpperCase()}
                                 </span>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-1 transition-opacity">
                              <button onClick={() => openTransferModal(lead)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-all" title="Transfer Process"><TruckIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openQualifyModal(lead)} className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white rounded-lg transition-all" title="Qualify Process"><ShieldCheckIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openGlobalModal(lead)} className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-600 dark:hover:text-white rounded-lg transition-all" title="Global Fields"><GlobeAltIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openFollowUpModal(lead)} className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-all" title="Manage Follow Ups"><ChatBubbleLeftRightIcon className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="h-20 border-2 border-dashed border-gray-200 dark:border-zinc-700/50 rounded-xl flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
        </div>

        {/* Global Roadmap Sidebar */}
        <div className="w-full lg:w-[25%] flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <SalesCalendar 
            followUps={allFollowUps} 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate} 
          />
          
          <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 flex-1">
            <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#003875] dark:bg-[#FFD500]" />
              Recent Follow Ups
            </h3>
            <EventTimeline 
              followUps={allFollowUps} 
              selectedDate={selectedDate} 
            />
          </div>
        </div>
      </div>

      <CreateLeadModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => { setIsCreateModalOpen(false); mutate(); }} 
      />
    </div>
  );
}
