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
    case 'lead generated': return { icon: <UserPlusIcon className="w-4 h-4" />, borderColor: 'border-blue-500', textColor: 'text-blue-600 dark:text-blue-400' };
    case 'transferring process': return { icon: <TruckIcon className="w-4 h-4" />, borderColor: 'border-indigo-500', textColor: 'text-indigo-600 dark:text-indigo-400' };
    case 'qualifying process': return { icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />, borderColor: 'border-purple-500', textColor: 'text-purple-600 dark:text-purple-400' };
    case 'qualified': return { icon: <ShieldCheckIcon className="w-4 h-4" />, borderColor: 'border-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' };
    case 'lost': return { icon: <XCircleIcon className="w-4 h-4" />, borderColor: 'border-red-500', textColor: 'text-red-600 dark:text-red-400' };
    case 'arrange meeting': return { icon: <CalendarDaysIcon className="w-4 h-4" />, borderColor: 'border-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400' };
    case 'demonstration': return { icon: <VideoCameraIcon className="w-4 h-4" />, borderColor: 'border-fuchsia-500', textColor: 'text-fuchsia-600 dark:text-fuchsia-400' };
    case 'transferred to ss': return { icon: <ArrowRightOnRectangleIcon className="w-4 h-4" />, borderColor: 'border-teal-500', textColor: 'text-teal-600 dark:text-teal-400' };
    case 'negotiation': return { icon: <CurrencyDollarIcon className="w-4 h-4" />, borderColor: 'border-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
    case '1st billing': 
    case '2nd billing': 
    case '3rd billing': return { icon: <ReceiptRefundIcon className="w-4 h-4" />, borderColor: 'border-green-500', textColor: 'text-green-600 dark:text-green-400' };
    case 'potential lead but not interesting': return { icon: <HandThumbDownIcon className="w-4 h-4" />, borderColor: 'border-orange-500', textColor: 'text-orange-600 dark:text-orange-400' };
    case 'deal in reserved area': return { icon: <MapPinIcon className="w-4 h-4" />, borderColor: 'border-rose-500', textColor: 'text-rose-600 dark:text-rose-400' };
    case 'existing customer': return { icon: <StarIcon className="w-4 h-4" />, borderColor: 'border-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' };
    case 'not qualified lead': return { icon: <NoSymbolIcon className="w-4 h-4" />, borderColor: 'border-stone-500', textColor: 'text-stone-600 dark:text-stone-400' };
    default: return { icon: <InboxIcon className="w-4 h-4" />, borderColor: 'border-gray-500', textColor: 'text-gray-600 dark:text-gray-400' };
  }
};



export default function SalesPage() {

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

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center gap-4 px-1 shrink-0">
        <div className="w-full lg:w-1/2 text-center lg:text-left min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Sales Pipeline</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Manage Leads &amp; Deals</p>
        </div>
        <div className="w-full lg:w-1/2 flex justify-end flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-6 py-1.5 transition-colors rounded-full" title="Create Lead">
              <PlusIcon className="w-5 h-5 mr-2" />
              <span className="font-black uppercase tracking-widest text-[9px] md:text-[10px]">Create Lead</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4">
        {/* Main Pipeline Column */}
        <div className="w-full lg:w-[75%] flex flex-col overflow-hidden">
          {activeLeadAction ? (
            <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-gray-200 dark:border-navy-800 p-2">
              <LeadDetailView 
                lead={activeLeadAction.lead} 
                initialTab={activeLeadAction.action} 
                onClose={() => setActiveLeadAction(null)} 
                onUpdate={() => mutate()} 
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-2 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2">
                     <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest hidden sm:block">Sort By</label>
                     <select 
                       value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : ""} 
                       onChange={(e) => {
                         if (!e.target.value) {
                           setSortConfig(null);
                         } else {
                           const [key, direction] = e.target.value.split('-');
                           setSortConfig({ key: key as keyof SalesLead, direction: direction as "asc" | "desc" });
                         }
                       }} 
                       className="bg-transparent border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-[10px] font-bold outline-none dark:text-white cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
                     >
                       <option value="">Default (Newest First)</option>
                       <option value="id-asc">Lead ID (Asc)</option>
                       <option value="id-desc">Lead ID (Desc)</option>
                       <option value="name-asc">Name (A-Z)</option>
                       <option value="name-desc">Name (Z-A)</option>
                       <option value="company_name-asc">Company (A-Z)</option>
                       <option value="company_name-desc">Company (Z-A)</option>
                       <option value="status-asc">Status (A-Z)</option>
                       <option value="status-desc">Status (Z-A)</option>
                     </select>
                   </div>
                   
                   <div className="relative group w-full max-w-[200px] sm:w-64">
                     <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                     <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-navy-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:border-blue-500 outline-none font-bold text-[11px] text-gray-700 dark:text-white transition-all" />
                   </div>
                </div>

            <div className="flex flex-wrap items-center gap-3 md:gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}</p>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 text-[9px] md:text-[10px] font-bold text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">First</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronLeftIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 text-[9px] md:text-[10px] font-bold text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">Last</button>
                </div>
              </div>
              <div className="hidden xs:block h-4 w-[1px] bg-gray-300 dark:bg-white/10" />
              <div className="flex items-center gap-2">
                <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Show</label>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-hidden overflow-y-auto flex-1 px-1 pb-4 custom-scrollbar">
            {isValidating && !leads.length ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-[#FFD500] rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Leads...</p>
              </div>
            ) : paginatedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-navy-900 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 dark:border-white/10">
                  <InboxIcon className="w-8 h-8 text-gray-400 dark:text-slate-600" />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">No leads found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedLeads.map((lead) => {
                  const stageConfig = getStageConfig(lead.status || "Lead Generated");
                  return (
                    <div key={lead.id} className={`group flex flex-col rounded-xl p-4 shadow-sm border-2 ${stageConfig.borderColor} bg-white dark:bg-navy-900 transition-all hover:shadow-md hover:-translate-y-0.5`}>
                      {/* Top Header: Name and Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 w-full">
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-black uppercase tracking-widest ${stageConfig.textColor} bg-slate-50 dark:bg-navy-800 px-2 py-1 rounded-md`}>
                            {lead.id}
                          </span>
                          <h4 className="font-black text-lg text-gray-900 dark:text-white leading-tight uppercase tracking-wide">
                            {lead.name || "Unnamed"}
                          </h4>
                          {lead.lead_priority_type && (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm ${
                              lead.lead_priority_type.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 border border-red-200' :
                              lead.lead_priority_type.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                              'bg-green-50 text-green-600 border border-green-200'
                            }`}>
                              {lead.lead_priority_type}
                            </span>
                          )}
                        </div>

                        {/* Right side: Actions and Status */}
                        <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3 shrink-0">
                          {/* Status Pill */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${stageConfig.borderColor} bg-black/5 dark:bg-white/5`}>
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center bg-current ${stageConfig.textColor}`}>
                              <div className="text-white dark:text-black scale-75">
                                {stageConfig.icon}
                              </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${stageConfig.textColor}`}>
                              {lead.status || "Lead Generated"}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 bg-white dark:bg-navy-900 rounded-full p-1 shadow-sm border border-gray-200 dark:border-white/10">
                            <button onClick={() => openTransferModal(lead)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-full transition-all" title="Transfer Process"><TruckIcon className="w-4 h-4" /></button>
                            <button onClick={() => openQualifyModal(lead)} className="p-1.5 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-full transition-all" title="Qualify Process"><ShieldCheckIcon className="w-4 h-4" /></button>
                            <button onClick={() => openGlobalModal(lead)} className="p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 rounded-full transition-all" title="Global Fields"><GlobeAltIcon className="w-4 h-4" /></button>
                            <button onClick={() => openFollowUpModal(lead)} className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-full transition-all" title="Manage Follow Ups"><ChatBubbleLeftRightIcon className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>

                        {/* Details row */}
                        <div className="flex flex-wrap xl:flex-nowrap items-start gap-x-3 gap-y-3 mt-4 pt-3 border-t border-gray-50 dark:border-white/5 min-w-0 w-full">
                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <StarIcon className="w-3 h-3 shrink-0" /> Company
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.company_name}>{lead.company_name || "—"}</span>
                          </div>
                          
                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <MapPinIcon className="w-3 h-3 shrink-0" /> Phone
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.phone_number}>{lead.phone_number || "—"}</span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <GlobeAltIcon className="w-3 h-3 shrink-0" /> State/UT
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.state_and_ut}>{lead.state_and_ut || "—"}</span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <MagnifyingGlassIcon className="w-3 h-3 shrink-0" /> Source
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.sources_of_customer}>{lead.sources_of_customer || "—"}</span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <ListBulletIcon className="w-3 h-3 shrink-0" /> Products
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.enquiry_products}>{lead.enquiry_products || "—"}</span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <CurrencyDollarIcon className="w-3 h-3 shrink-0" /> Investment
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate" title={lead.investment_amount}>{lead.investment_amount ? `₹${lead.investment_amount}` : "—"}</span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-[100px] xl:min-w-0">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 truncate">
                              <UserPlusIcon className="w-3 h-3 shrink-0" /> Assigned To
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              <div className="h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                <span className="text-[8px] font-black text-white">
                                  {(lead.sales_person_assigned || "U").substring(0,2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate" title={lead.sales_person_assigned}>{lead.sales_person_assigned || "Unassigned"}</span>
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
