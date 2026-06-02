"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSSE } from "@/hooks/useSSE";
import { applyIncrementalUpdate } from "@/lib/utils/swr-sync";
import useSWR from "swr";
import { HrmsModuleType, AnyHrmsRecord, HrmsStepConfig } from "@/types/hrms";
import { getFieldsForModule, getStepCount, getModuleName } from "@/lib/hrms-fields";
import {
  PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ClockIcon, CheckCircleIcon,
  ArrowPathIcon, DocumentTextIcon, UserIcon, CalendarIcon, BriefcaseIcon, NoSymbolIcon
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

import { useParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HRMSModulePage({ params }: { params: Promise<{ module: string }> }) {
  const resolvedParams = React.use(params);
  const module = resolvedParams.module as HrmsModuleType;
  const moduleName = getModuleName(module);
  const stepCount = getStepCount(module);
  const formFields = getFieldsForModule(module);

  const { data: session } = useSession();
  const userRole: string = (session?.user as any)?.role || "User";
  const isAdmin = userRole.toUpperCase() === "ADMIN" || userRole.toUpperCase() === "EA";
  const currentUser: string = (session?.user?.name || session?.user?.email || "") as string;

  const [items, setItems] = useState<AnyHrmsRecord[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState<HrmsStepConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "cancelled">("active");
  const [selectedStepFilter, setSelectedStepFilter] = useState<number | "all" | "completed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedTiles, setExpandedTiles] = useState<Record<string, boolean>>({});

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnyHrmsRecord | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">("loading");
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: swrItems, mutate: mutateItems } = useSWR<AnyHrmsRecord[]>(`/api/hrms/${module}`, fetcher, {
    refreshInterval: 0, revalidateOnFocus: true, revalidateOnMount: true,
  });

  useSSE({
    modules: [module],
    onUpdate: (incremental) => {
      const updates = incremental.find(m => m.module === module);
      if (updates) mutateItems((current) => applyIncrementalUpdate(current, updates.upserts, updates.currentIds), false);
    }
  });

  useEffect(() => {
    fetch(`/api/hrms/${module}/config`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const merged = Array.from({ length: stepCount }).map((_, idx) => {
            const found = data[idx];
            return { step_name: found?.step_name || `Step ${idx+1}`, tat: found?.tat || "24 Hrs", responsible_person: found?.responsible_person || "" };
          });
          setGlobalConfigs(merged);
        }
      })
      .catch(() => {});
  }, [module, stepCount]);

  useEffect(() => {
    if (swrItems) { setItems(swrItems); setIsLoading(false); }
  }, [swrItems]);

  const getActiveStep = (item: AnyHrmsRecord): number => {
    if (item.cancelled) return -1;
    let hasAnyPlanned = false;
    for (let i = 1; i <= stepCount; i++) {
      if ((item as any)[`planned_${i}`]?.trim()) { hasAnyPlanned = true; break; }
    }
    if (hasAnyPlanned) {
      for (let i = 1; i <= stepCount; i++) {
        const act = (item as any)[`actual_${i}`];
        const pl = (item as any)[`planned_${i}`];
        if ((!act || act.trim() === "") && (pl && pl.trim() !== "")) return i;
      }
      if ((item as any)[`actual_${stepCount}`]?.trim()) return 0;
      let highestActual = 0;
      for (let i = 1; i <= stepCount; i++) {
        if ((item as any)[`actual_${i}`]?.trim()) highestActual = i;
      }
      return highestActual < stepCount ? highestActual + 1 : 0;
    }
    for (let i = 1; i <= stepCount; i++) {
      const act = (item as any)[`actual_${i}`];
      if (!act || act.trim() === "") return i;
    }
    return 0;
  };

  const calculatePlannedDate = (base: Date | string, tat: string): string => {
    let date = new Date(base); if (isNaN(date.getTime())) return "";
    const val = parseFloat(tat); const unit = tat.toLowerCase().includes("day") ? "day" : "hr";
    let mins = unit === "day" ? val * 10 * 60 : val * 60;
    while (mins > 0) {
      if (date.getDay() === 0) { date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); continue; }
      const cur = date.getHours() + date.getMinutes() / 60;
      if (cur >= 19.5) { date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); continue; }
      if (cur < 9.5) date.setHours(9, 30, 0, 0);
      const avail = (19.5 - (date.getHours() + date.getMinutes() / 60)) * 60;
      if (mins <= avail) { date.setMinutes(date.getMinutes() + mins); mins = 0; }
      else { mins -= avail; date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); }
    }
    return date.toISOString();
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(it => {
        const n1 = module === 'recruitment' ? (it as any).post_for_recruitment : (it as any).candidate_name;
        return (n1 || "").toLowerCase().includes(q);
      });
    }
    if (viewMode === "active") list = list.filter(it => !(it.cancelled || "").trim());
    else list = list.filter(it => !!(it.cancelled || "").trim());

    if (selectedStepFilter !== "all") {
      if (selectedStepFilter === "completed") list = list.filter(it => getActiveStep(it) === 0);
      else list = list.filter(it => getActiveStep(it) === selectedStepFilter);
    }
    return list;
  }, [items, searchTerm, viewMode, selectedStepFilter, module]);

  const sortedItems = [...filteredItems].sort((a, b) => {
    const d1 = new Date(a.created_at || 0).getTime();
    const d2 = new Date(b.created_at || 0).getTime();
    return d2 - d1;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus("loading"); setActionMessage("Saving..."); setIsStatusModalOpen(true);

    let fileUrl = formData.upload_updated_cv || "";
    if (uploadFile) {
      setActionMessage("Uploading document...");
      const fd = new FormData(); fd.append("file", uploadFile);
      try {
        const res = await fetch("/api/hrms/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.fileId) fileUrl = `https://drive.google.com/uc?id=${data.fileId}`;
      } catch (err) { console.error("Upload failed", err); }
    }

    const currentNow = new Date().toISOString();
    const payload = { ...formData, upload_updated_cv: fileUrl };
    if (!editingItem) {
      payload.created_at = currentNow;
      payload.planned_1 = calculatePlannedDate(currentNow, globalConfigs[0]?.tat || "24 Hrs");
    }

    try {
      const res = await fetch(`/api/hrms/${module}`, { 
        method: editingItem ? "PUT" : "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      if (res.ok) setActionStatus("success"); else setActionStatus("error");
    } catch { setActionStatus("error"); }
    setTimeout(() => { setIsStatusModalOpen(false); setIsModalOpen(false); mutateItems(); setUploadFile(null); }, 1500);
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setIsConfirmOpen(false); setActionStatus("loading"); setActionMessage("Deleting..."); setIsStatusModalOpen(true);
    try {
      const res = await fetch(`/api/hrms/${module}?id=${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) setActionStatus("success"); else setActionStatus("error");
    } catch { setActionStatus("error"); }
    setTimeout(() => { setIsStatusModalOpen(false); mutateItems(); }, 1500);
  };

  const getDelayInfo = (pl: string, act: string | null) => {
    if (!pl) return null;
    const pD = new Date(pl);
    const aD = act ? new Date(act) : now;
    const diffMs = aD.getTime() - pD.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffMs <= 0) return { text: `${Math.abs(diffHrs)}h ${Math.abs(diffMins)}m Left`, color: "text-emerald-500" };
    return { text: `${diffHrs}h ${diffMins}m Late`, color: "text-red-500" };
  };

  return (
    <div className="flex gap-4 h-full p-2">
      {/* Sidebar Filters */}
      <div className="w-60 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-navy-800 pr-3">
        <p className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-[0.3em] mb-1.5 px-2">FILTERS</p>
        <div className="space-y-1.5 pb-10">
          <button onClick={() => setSelectedStepFilter("all")} className={`w-full flex items-center justify-start gap-3 px-5 py-2.5 rounded-full transition-all border-b-4 ${selectedStepFilter === "all" ? "bg-[#e6dcc5] dark:bg-[#cbbca0]/20 border-[#cbbca0] text-[#003875] dark:text-[#FFD500] shadow-md" : "bg-white dark:bg-navy-900 border-slate-100 dark:border-navy-800 text-slate-500"}`}>
            <span className="font-black text-[11px] uppercase tracking-widest text-left">ALL RECORDS</span>
          </button>
          <button onClick={() => setSelectedStepFilter("completed")} className={`w-full flex items-center justify-start gap-3 px-5 py-2.5 rounded-full transition-all border-b-4 ${selectedStepFilter === "completed" ? "bg-emerald-500 border-emerald-700 text-white shadow-md" : "bg-white dark:bg-navy-900 border-slate-100 dark:border-navy-800 text-slate-500"}`}>
            <span className="font-black text-[11px] uppercase tracking-widest text-left">COMPLETED</span>
          </button>
          {Array.from({length: stepCount}).map((_, i) => (
            <button key={i} onClick={() => setSelectedStepFilter(i+1)} className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl transition-all border ${selectedStepFilter === i+1 ? "bg-[#e6dcc5] dark:bg-[#cbbca0]/20 border-[#cbbca0] shadow-md" : "bg-white dark:bg-navy-900 border-slate-50 text-slate-500"}`}>
              <span className="text-[10px] font-black uppercase tracking-tight text-left">Step {i+1} — {globalConfigs[i]?.step_name || `Step ${i+1}`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="relative group flex-1 max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input type="text" placeholder={`Search ${moduleName}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl text-[12px] font-bold text-gray-700 dark:text-white outline-none focus:border-[#003875]" />
          </div>
          <button onClick={() => { setEditingItem(null); setFormData({}); setUploadFile(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-1.5 bg-[#003875] text-[#FFD500] hover:bg-[#002855] transition-all rounded-full font-black text-[10px] tracking-widest uppercase">
            <PlusIcon className="w-4 h-4 stroke-[2.5]" /> ADD NEW
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-10 animate-pulse text-slate-200"><ArrowPathIcon className="w-8 h-8 animate-spin mb-4" /><p className="text-[10px] font-black uppercase">LOADING...</p></div>
          ) : paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-slate-200"><DocumentTextIcon className="w-12 h-12 mb-4" /><p className="text-[10px] font-black uppercase">NO DATA</p></div>
          ) : (
            paginatedItems.map(item => {
              const step = getActiveStep(item); const exp = expandedTiles[item.id];
              const title = module === 'recruitment' ? (item as any).post_for_recruitment : (item as any).candidate_name;
              const subTitle = module === 'recruitment' ? `Loc: ${(item as any).for_which_location}` : `Phone: ${(item as any).whatsapp_number}`;
              return (
                <div key={item.id} className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700 shadow-sm p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div>
                        <h3 className="text-base font-black text-[#003875] dark:text-white tracking-tight uppercase leading-none">{title || "—"}</h3>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">{subTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step > 0 && (
                        <div className="flex flex-col items-end mr-2">
                          <p className="text-[9px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter">STEP {step} PENDING</p>
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${getDelayInfo((item as any)[`planned_${step}`], null)?.color}`}>{getDelayInfo((item as any)[`planned_${step}`], null)?.text}</p>
                        </div>
                      )}
                      <button onClick={() => setExpandedTiles(p => ({ ...p, [item.id]: !exp }))} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full transition-all"><ChevronDownIcon className={`w-4 h-4 stroke-[2.5] transition-transform ${exp ? "rotate-180" : ""}`} /></button>
                      <button onClick={() => { setEditingItem(item); setFormData({...item}); setUploadFile(null); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-all"><PencilSquareIcon className="w-4 h-4" /></button>
                      <button onClick={() => { setPendingDeleteId(item.id); setIsConfirmOpen(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  {exp && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formFields.filter(f => f.type !== "textarea" && f.type !== "file").map(f => (
                        <div key={f.name}>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</p>
                          <p className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{(item as any)[f.name] || "—"}</p>
                        </div>
                      ))}
                      {(item as any).upload_updated_cv && (
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document</p>
                          <a href={(item as any).upload_updated_cv} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-blue-500 hover:underline">View CV</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-navy-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50">
              <h2 className="text-xl font-black text-[#003875] dark:text-white tracking-tight uppercase">{editingItem ? "Edit" : "New"} {moduleName}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-700 rounded-full transition-all"><XMarkIcon className="w-5 h-5 stroke-[3]" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formFields.map(f => (
                  <div key={f.name} className={f.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                    <label className="block text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest mb-1.5">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea value={formData[f.name] || ""} onChange={e => setFormData({...formData, [f.name]: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-[#003875]" rows={3} />
                    ) : f.type === "select" ? (
                      <select value={formData[f.name] || ""} onChange={e => setFormData({...formData, [f.name]: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-[#003875]">
                        <option value="">Select...</option>
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === "file" ? (
                      <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#003875] file:text-[#FFD500] hover:file:bg-[#002855]" />
                    ) : (
                      <input type={f.type} value={formData[f.name] || ""} onChange={e => setFormData({...formData, [f.name]: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-[#003875]" />
                    )}
                  </div>
                ))}
              </div>

              {editingItem && (
                <div className="mt-8 border-t border-slate-100 dark:border-navy-700 pt-6">
                  <h3 className="text-sm font-black text-[#003875] dark:text-white uppercase tracking-widest mb-4">Step Management</h3>
                  <div className="space-y-4">
                    {Array.from({length: stepCount}).map((_, i) => {
                      const st = i + 1;
                      return (
                        <div key={st} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-800">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Step {st} — {globalConfigs[i]?.step_name}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold">Planned</label>
                                <input type="datetime-local" value={formData[`planned_${st}`] ? new Date(new Date(formData[`planned_${st}`]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={e => setFormData({...formData, [`planned_${st}`]: e.target.value ? new Date(e.target.value).toISOString() : ""})} className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:bg-navy-900" />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold">Actual</label>
                                <input type="datetime-local" value={formData[`actual_${st}`] ? new Date(new Date(formData[`actual_${st}`]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={e => setFormData({...formData, [`actual_${st}`]: e.target.value ? new Date(e.target.value).toISOString() : ""})} className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:bg-navy-900" />
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 flex gap-2 items-end">
                            {st > 1 || module !== 'recruitment' ? (
                              <div className="flex-1">
                                <label className="text-[9px] text-slate-400 font-bold">Status</label>
                                <select value={formData[`status_${st}`] || ""} onChange={e => setFormData({...formData, [`status_${st}`]: e.target.value})} className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:bg-navy-900">
                                  <option value="">Pending</option><option value="Done">Done</option><option value="Hold">Hold</option>
                                </select>
                              </div>
                            ) : null}
                            <div className="flex-[2]">
                              <label className="text-[9px] text-slate-400 font-bold">Remark</label>
                              <input type="text" value={formData[`remark_${st}`] || ""} onChange={e => setFormData({...formData, [`remark_${st}`]: e.target.value})} className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:bg-navy-900" placeholder="Step remark..." />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>
            <div className="p-6 border-t border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-full text-sm font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest">Cancel</button>
              <button type="submit" onClick={handleSave} className="px-8 py-3 rounded-full bg-[#003875] hover:bg-[#002855] text-[#FFD500] text-sm font-black transition-all shadow-xl uppercase tracking-widest">Save Record</button>
            </div>
          </div>
        </div>
      )}

      <ActionStatusModal isOpen={isStatusModalOpen} status={actionStatus} message={actionMessage} />
      <ConfirmModal isOpen={isConfirmOpen} title="Delete Record?" message="This action cannot be undone. Do you want to proceed?" onConfirm={handleDelete} onClose={() => setIsConfirmOpen(false)} confirmLabel="Delete" cancelLabel="Cancel" type="danger" />
    </div>
  );
}
