"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { I2R, I2RStepConfig, I2R_STEPS } from "@/types/i2r";
import useSWR from "swr";
import { useSSE } from "@/hooks/useSSE";
import { applyIncrementalUpdate } from "@/lib/utils/swr-sync";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  CubeIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const I2R_STEP_SHORT = [
  "Get Quotation",
  "Approval",
  "Finalize Vendor",
  "Received PI",
  "Check Sample",
  "Make PO",
  "Check Packing",
  "Deliver to Cargo",
  "Receive Form",
  "Follow Up",
];

const EMPTY_FORM: Partial<I2R> = {
  id: "", indend_num: "", item_name: "", quantity: "", category: "",
  filled_by: "", created_at: "", updated_at: "", cancelled: "",
  planned_1: "", actual_1: "", status_1: "",
  planned_2: "", actual_2: "", status_2: "",
  planned_3: "", actual_3: "", status_3: "",
  planned_4: "", actual_4: "", status_4: "",
  planned_5: "", actual_5: "", status_5: "",
  planned_6: "", actual_6: "", status_6: "",
  planned_7: "", actual_7: "", status_7: "",
  planned_8: "", actual_8: "", status_8: "",
  planned_9: "", actual_9: "", status_9: "",
  planned_10: "", actual_10: "", status_10: "",
  supplier_name_3: "", lead_time_acc_to_vendor_4: "", sample_pic_5: "", po_number_6: "",
};

function UserMultiCombobox({
  value,
  onChange,
  users,
  isSimple = false,
}: {
  value: string;
  onChange: (val: string) => void;
  users: string[];
  isSimple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = useMemo(
    () => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []),
    [value]
  );

  const toggle = (user: string) => {
    if (selected.includes(user)) {
      onChange(selected.filter((u) => u !== user).join(", "));
    } else {
      onChange([...selected, user].join(", "));
    }
    setQ("");
  };

  const filtered = users.filter(
    (u) => u.toLowerCase().includes(q.toLowerCase()) && !selected.includes(u)
  );
  const listToShow = q ? filtered : users.filter((u) => !selected.includes(u));

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={`min-h-[40px] px-3 py-1.5 border border-slate-200 dark:border-navy-700 rounded-xl flex flex-wrap gap-1.5 items-center cursor-text transition-all ${isSimple ? 'bg-slate-50 dark:bg-navy-900/50' : 'bg-white dark:bg-navy-900 shadow-sm'}`}
        onClick={() => setOpen(true)}
      >
        {selected.map((u) => (
          <span
            key={u}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#003875] text-[#FFD500] rounded-md text-[10px] font-black"
          >
            {u}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggle(u);
              }}
            >
              <XMarkIcon className="w-3 h-3 stroke-[3]" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-navy-600"
        />
        <ChevronDownIcon className="w-4 h-4 text-slate-300 ml-auto" />
      </div>
      {open && listToShow.length > 0 && (
        <ul className="absolute z-[10001] mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-100 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-2xl p-2">
          {listToShow.map((u) => (
            <li
              key={u}
              onMouseDown={(e) => {
                e.preventDefault();
                toggle(u);
              }}
              className="px-4 py-2 text-[12px] font-black cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-800 text-[#003875] dark:text-[#FFD500] rounded-lg transition-all"
            >
              {u}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function I2RPage() {
  const { data: session } = useSession();
  const userRole: string = (session?.user as any)?.role || "User";
  const isAdmin = userRole.toUpperCase() === "ADMIN" || userRole.toUpperCase() === "EA";
  const currentUser: string = (session?.user?.name || session?.user?.email || "") as string;
  const [items, setItems] = useState<I2R[]>([]);
  const [now, setNow] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<I2R | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof I2R;
    direction: "asc" | "desc";
  } | null>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedStepFilter, setSelectedStepFilter] = useState<number | "all" | "completed">("all");
  const [formData, setFormData] = useState<Partial<I2R>>({ ...EMPTY_FORM });
  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">("loading");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [stepConfigs, setStepConfigs] = useState<I2RStepConfig[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState<I2RStepConfig[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [bulkToggles, setBulkToggles] = useState<Record<string, boolean>>({});
  const [bulkSupplierInputs, setBulkSupplierInputs] = useState<Record<string, string>>({});
  const [bulkLeadTimeInputs, setBulkLeadTimeInputs] = useState<Record<string, string>>({});
  const [bulkSamplePicInputs, setBulkSamplePicInputs] = useState<Record<string, string>>({});
  const [bulkPOInputs, setBulkPOInputs] = useState<Record<string, string>>({});

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "cancelled">("active");
  const [layoutMode, setLayoutMode] = useState<"smart" | "standard">("smart");
  const [expandedTiles, setExpandedTiles] = useState<Record<string, boolean>>({});
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const [isRemoveFollowUpModalOpen, setIsRemoveFollowUpModalOpen] = useState(false);
  const [targetItemForRemoveFollowUp, setTargetItemForRemoveFollowUp] = useState<I2R | null>(null);
  const [removeFollowUpStep, setRemoveFollowUpStep] = useState(1);
  const [removeFollowUpType, setRemoveFollowUpType] = useState<'particular' | 'onwards'>('particular');

  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poFormData, setPoFormData] = useState({
    PO_Number: "",
    Qty: "",
    Country: "",
    Attach_Bill: "",
    Payment_Terms_In_days: "",
    Payment_Completed: "No",
    Item_Name: "",
    Category: "",
    filled_by: "",
    indent_id: ""
  });
  const [poFile, setPoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: swrItems, mutate: mutateItems } = useSWR<I2R[]>("/api/i2r", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: true,
    revalidateOnMount: true,
  });

  useSSE({ 
    modules: ['i2r'], 
    onUpdate: (incremental) => {
      const updates = incremental.find(m => m.module === 'i2r');
      if (updates) {
        mutateItems((current) => applyIncrementalUpdate(current, updates.upserts, updates.currentIds), false);
      }
    } 
  });

  const { data: imsData } = useSWR<{ item_name: string; category: string }[]>("/api/ims", fetcher);
  const imsItems = useMemo(() => {
    if (!imsData) return [];
    const unique = new Map<string, string>();
    imsData.forEach(i => { if (i.item_name) unique.set(i.item_name, i.category || ""); });
    return Array.from(unique.entries()).map(([item_name, category]) => ({ item_name, category })).sort((a,b) => a.item_name.localeCompare(b.item_name));
  }, [imsData]);

  const { data: usersData } = useSWR<{ username: string }[]>("/api/users", fetcher);
  const usersList: string[] = useMemo(() => (usersData || []).map((u) => u.username).filter(Boolean), [usersData]);

  const [itemNameOpen, setItemNameOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/i2r/config")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const merged = I2R_STEPS.map((step, idx) => {
            const found = data.find((c: I2RStepConfig) => c.step_name === step) || data[idx];
            return { step_name: step, tat: found?.tat || "24 Hrs", responsible_person: found?.responsible_person || "" };
          });
          setGlobalConfigs(merged);
          setStepConfigs(merged);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (swrItems) { setItems(swrItems); setIsLoading(false); }
  }, [swrItems]);

  const getActiveStep = (item: I2R): number => {
    if (item.cancelled) return -1;
    for (let i = 1; i <= 10; i++) {
      const val = (item as any)[`actual_${i}`];
      if (!val || val.trim() === "") return i;
    }
    return 0;
  };

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let list = items;
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(it => (it.indend_num || "").toLowerCase().includes(q) || (it.item_name || "").toLowerCase().includes(q));
    }
    if (viewMode === "active") list = list.filter(it => !(it.cancelled || "").trim());
    else list = list.filter(it => !!(it.cancelled || "").trim());

    if (selectedStepFilter !== "all") {
      if (selectedStepFilter === "completed") list = list.filter(it => getActiveStep(it) === 0);
      else list = list.filter(it => getActiveStep(it) === selectedStepFilter);
    }

    if (!isAdmin && viewMode === "active") {
      list = list.filter(item => {
        const step = getActiveStep(item);
        if (step > 0) {
          const cfg = globalConfigs[step - 1];
          return cfg?.responsible_person?.split(",").map(s => s.trim()).includes(currentUser);
        }
        return false;
      });
    }

    if (dateFilter) {
      const today = new Date(); today.setHours(0,0,0,0);
      list = list.filter(item => {
        const d = item.created_at ? new Date(item.created_at) : null;
        if (!d) return false; d.setHours(0,0,0,0);
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        return (dateFilter === 'Yesterday' && diff === -1) || (dateFilter === 'Today' && diff === 0) || (dateFilter === 'Tomorrow' && diff === 1);
      });
    }
    return list;
  }, [items, searchTerm, viewMode, layoutMode, selectedStepFilter, isAdmin, currentUser, globalConfigs, dateFilter]);

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, completed: 0 };
    for (let i = 1; i <= 10; i++) counts[i] = 0;
    items.forEach(it => {
      if (it.cancelled) return; counts.all++;
      const s = getActiveStep(it);
      if (s === 0) counts.completed++; else if (s > 0) counts[s]++;
    });
    return counts;
  }, [items]);

  useEffect(() => { setSelectedIds(new Set()); }, [currentPage]);

  const getDateFilterCount = (f: string) => {
    const today = new Date(); today.setHours(0,0,0,0);
    return items.filter(it => {
      if (it.cancelled) return false;
      const d = it.created_at ? new Date(it.created_at) : null;
      if (!d) return false; d.setHours(0,0,0,0);
      const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
      return (f === 'Yesterday' && diff === -1) || (f === 'Today' && diff === 0) || (f === 'Tomorrow' && diff === 1);
    }).length;
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aV = a[key] || ""; let bV = b[key] || "";
    if (aV < bV) return direction === "asc" ? -1 : 1;
    if (aV > bV) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculatePlannedDate = (base: Date | string, tat: string): string => {
    let date = new Date(base); if (isNaN(date.getTime())) return "";
    const val = parseFloat(tat); const unit = tat.includes("day") ? "day" : "hr";
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

  const fmtDt = (iso: string) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtTm = (iso: string) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";

  const getDelayInfo = (pl: string, act: string | null, customNow?: Date) => {
    if (!pl) return null;
    const pD = new Date(pl);
    const aD = act ? new Date(act) : (customNow || new Date());
    const diffMs = aD.getTime() - pD.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs <= 0) {
      const absHrs = Math.abs(diffHrs);
      const absMins = Math.abs(diffMins);
      return { text: `${absHrs}h ${absMins}m Left`, color: "text-emerald-500" };
    }
    return { text: `${diffHrs}h ${diffMins}m Late`, color: "text-red-500" };
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    const item = items.find(r => r.id === cancelTargetId); if (!item) return;
    setCancelTargetId(null); setActionStatus("loading"); setActionMessage("Cancelling..."); setIsStatusModalOpen(true);
    const now = new Date().toISOString();
    try {
      const res = await fetch("/api/i2r", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, cancelled: now, updated_at: now }) });
      if (res.ok) setActionStatus("success"); else setActionStatus("error");
    } catch { setActionStatus("error"); }
    setTimeout(() => { setIsStatusModalOpen(false); mutateItems(); }, 1500);
  };

  const openBulkModal = () => {
    const ts: Record<string, boolean> = {}; const ss: Record<string, string> = {}; const ls: Record<string, string> = {}; const ps: Record<string, string> = {}; const os: Record<string, string> = {};
    selectedIds.forEach(id => {
      const it = items.find(r => r.id === id); if (!it) return;
      ts[id] = true; ss[id] = it.supplier_name_3 || ""; ls[id] = it.lead_time_acc_to_vendor_4 || ""; ps[id] = it.sample_pic_5 || ""; os[id] = it.po_number_6 || "";
    });
    setBulkToggles(ts); setBulkSupplierInputs(ss); setBulkLeadTimeInputs(ls); setBulkSamplePicInputs(ps); setBulkPOInputs(os);
    setIsBulkModalOpen(true);
  };

  const handleBulkStepSave = async () => {
    const toProc = Array.from(selectedIds).filter(id => bulkToggles[id]);
    if (!toProc.length) return;
    setActionStatus("loading"); setActionMessage(`Updating ${toProc.length} records...`); setIsStatusModalOpen(true); setIsBulkModalOpen(false);
    const now = new Date().toISOString(); let errors = 0;
    for (const id of toProc) {
      const it = items.find(r => r.id === id); if (!it) continue;
      const n = getActiveStep(it); if (n <= 0) continue;
      const upd = { ...it } as any; upd[`actual_${n}`] = now; upd[`status_${n}`] = "Done"; upd.updated_at = now;
      if (n === 3) upd.supplier_name_3 = bulkSupplierInputs[id]; if (n === 4) upd.lead_time_acc_to_vendor_4 = bulkLeadTimeInputs[id];
      if (n === 5) upd.sample_pic_5 = bulkSamplePicInputs[id]; if (n === 6) upd.po_number_6 = bulkPOInputs[id];
      if (n < 10) upd[`planned_${n+1}`] = calculatePlannedDate(now, globalConfigs[n-1].tat || "24 Hrs");
      try { const r = await fetch("/api/i2r", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }); if (!r.ok) errors++; } catch { errors++; }
    }
    setActionStatus(errors ? "error" : "success"); setActionMessage(errors ? `Failed ${errors} updates` : "All updated!");
    setTimeout(() => { setIsStatusModalOpen(false); setSelectedIds(new Set()); mutateItems(); }, 2000);
  };

  const handleExport = () => {
    const csv = ["ID,Indent,Item,Qty,Category,Created", ...sortedItems.map(i => `${i.id},${i.indend_num},${i.item_name},${i.quantity},${i.category},${i.created_at}`)].join("\n");
    const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const l = document.createElement("a");
    l.href = u; l.download = "i2r_export.csv"; l.click();
  };

  const openAddModal = () => { setEditingItem(null); setFormData({ ...EMPTY_FORM, filled_by: "Robotek" }); setIsModalOpen(true); };
  const openEditModal = (item: I2R) => { setEditingItem(item); setFormData({ ...item }); setIsModalOpen(true); };
  const closeModal = () => setIsModalOpen(false);
  const handleSave = async () => {
    setActionStatus("loading"); setActionMessage("Saving..."); setIsStatusModalOpen(true);
    const now = new Date().toISOString();
    const payload = { ...formData, updated_at: now };
    if (!editingItem) { payload.created_at = now; payload.planned_1 = calculatePlannedDate(now, globalConfigs[0].tat); }
    try {
      const res = await fetch("/api/i2r", { method: editingItem ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) setActionStatus("success"); else setActionStatus("error");
    } catch { setActionStatus("error"); }
    setTimeout(() => { setIsStatusModalOpen(false); setIsModalOpen(false); mutateItems(); }, 1500);
  };

  const handleDeleteClick = (id: string) => { setPendingDeleteId(id); setIsConfirmOpen(true); };
  const performDelete = async () => {
    if (!pendingDeleteId) return;
    try { await fetch(`/api/i2r?id=${pendingDeleteId}`, { method: "DELETE" }); mutateItems(); } catch {}
  };

  const openConfigModal = () => setIsConfigModalOpen(true);
  const handleSaveConfig = async () => {
    try { await fetch("/api/i2r/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stepConfigs) }); setIsConfigModalOpen(false); } catch {}
  };

  const openRemoveFollowUpModal = (item: I2R) => {
    setTargetItemForRemoveFollowUp(item);
    setRemoveFollowUpStep(getActiveStep(item) || 10);
    setRemoveFollowUpType('particular');
    setIsRemoveFollowUpModalOpen(true);
  };

  const handleRemoveFollowUp = async () => {
    if (!targetItemForRemoveFollowUp) return;
    setActionStatus("loading"); setActionMessage("Removing Follow Up..."); setIsStatusModalOpen(true);
    const upd = { ...targetItemForRemoveFollowUp } as any;
    const now = new Date().toISOString();
    const startStep = removeFollowUpStep;

    if (removeFollowUpType === 'particular') {
      upd[`actual_${startStep}`] = "";
      upd[`status_${startStep}`] = "";
      if (startStep === 3) upd.supplier_name_3 = "";
      if (startStep === 4) upd.lead_time_acc_to_vendor_4 = "";
      if (startStep === 5) upd.sample_pic_5 = "";
      if (startStep === 6) upd.po_number_6 = "";
    } else {
      for (let s = startStep; s <= 10; s++) {
        upd[`actual_${s}`] = "";
        upd[`status_${s}`] = "";
        if (s > startStep) upd[`planned_${s}`] = "";
        if (s === 3) upd.supplier_name_3 = "";
        if (s === 4) upd.lead_time_acc_to_vendor_4 = "";
        if (s === 5) upd.sample_pic_5 = "";
        if (s === 6) upd.po_number_6 = "";
      }
    }
    upd.updated_at = now;

    try {
      const res = await fetch("/api/i2r", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) });
      if (res.ok) setActionStatus("success"); else setActionStatus("error");
    } catch { setActionStatus("error"); }
    setTimeout(() => { setIsStatusModalOpen(false); setIsRemoveFollowUpModalOpen(false); mutateItems(); }, 1500);
  };

  const openPOModal = (item: I2R) => {
    setPoFormData({
      PO_Number: "",
      Qty: "",
      Country: "",
      Attach_Bill: "",
      Payment_Terms_In_days: "",
      Payment_Completed: "No",
      Item_Name: item.item_name || "",
      Category: item.category || "",
      filled_by: currentUser,
      indent_id: item.id
    });
    setPoFile(null);
    setIsPOModalOpen(true);
  };

  const handlePOSubmit = async () => {
    setActionStatus("loading");
    setActionMessage("Submitting PO...");
    setIsStatusModalOpen(true);
    
    let billUrl = "";
    if (poFile) {
      setIsUploading(true);
      const fd = new FormData();
      fd.append("file", poFile);
      try {
        const res = await fetch("/api/i2r/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.fileId) billUrl = `https://drive.google.com/uc?id=${data.fileId}`;
      } catch (err) {
        console.error("Upload failed", err);
      }
      setIsUploading(false);
    }

    try {
      const res = await fetch("/api/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...poFormData, Attach_Bill: billUrl })
      });
      if (res.ok) {
        setActionStatus("success");
        setActionMessage("GRN Entry Created!");
        setTimeout(() => {
          setIsStatusModalOpen(false);
          setIsPOModalOpen(false);
          mutateItems();
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionStatus("error");
        setActionMessage(errData.error || "Failed to submit GRN");
      }
    } catch (err) {
      setActionStatus("error");
      setActionMessage("Submission failed");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-2 py-0.5 shrink-0">
        <div>
          <h1 className="text-xl font-black text-[#003875] dark:text-white tracking-tight">I2R Management</h1>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">INDENT TO REQUEST — ITEM REQUISITIONS</p>
        </div>

        {/* Central Pill Actions */}
        <div className="flex items-center gap-1 rounded-full border-2 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-900 shadow-xl p-0.5">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1 font-black uppercase tracking-widest text-[10px] text-[#003875] dark:text-[#FFD500] hover:bg-slate-50 dark:hover:bg-navy-800 transition-all rounded-full">
            <ArrowDownTrayIcon className="w-3.5 h-3.5" /> <span>EXPORT</span>
          </button>
          <button onClick={openConfigModal} className="flex items-center gap-2 px-4 py-1 font-black uppercase tracking-widest text-[10px] text-[#003875] dark:text-[#FFD500] hover:bg-slate-50 dark:hover:bg-navy-800 transition-all rounded-full">
            <Cog6ToothIcon className="w-3.5 h-3.5" /> <span>CONFIG</span>
          </button>
          <button onClick={openAddModal} className="px-3 py-1 text-[#003875] dark:text-[#FFD500] hover:bg-slate-50 dark:hover:bg-navy-800 transition-all rounded-full">
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div className="w-[1px] h-5 bg-slate-200 dark:bg-navy-700 mx-1" />
          <button onClick={() => setViewMode(viewMode==='cancelled'?'active':'cancelled')} className={`flex items-center gap-2 px-4 py-1 font-black uppercase tracking-widest text-[10px] transition-all rounded-full ${viewMode==='cancelled'?'bg-red-500 text-white shadow-md':'text-[#003875] dark:text-[#FFD500] hover:bg-slate-50 dark:hover:bg-navy-800'}`}>
            <NoSymbolIcon className="w-3.5 h-3.5" /> <span>CANCELLED ({items.filter(i => !!(i.cancelled || "").trim()).length})</span>
          </button>
        </div>

        {/* Layout Toggles */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-navy-900 rounded-full p-0.5 border border-slate-200 dark:border-navy-800 shadow-inner">
          <button onClick={() => setLayoutMode("standard")} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${layoutMode === "standard" ? "bg-white dark:bg-navy-800 text-[#003875] dark:text-[#FFD500] shadow-md" : "text-gray-400 dark:text-navy-600"}`}>STANDARD</button>
          <button onClick={() => setLayoutMode("smart")} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${layoutMode === "smart" ? "bg-white dark:bg-navy-800 text-[#003875] dark:text-[#FFD500] shadow-md" : "text-gray-400 dark:text-navy-600"}`}>SMART VIEW</button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden mt-1 px-1">
        {/* ─── Sidebar ─── */}
        <div className="w-60 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-navy-800 pr-3 py-0.5">
          <p className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-[0.3em] mb-1.5 px-2">FILTERS</p>
          <div className="space-y-1.5 pb-10">
            <button
              onClick={() => setSelectedStepFilter("all")}
              className={`w-full flex items-center justify-between px-5 py-2.5 rounded-full transition-all border-b-4 ${
                selectedStepFilter === "all" ? "bg-[#e6dcc5] dark:bg-[#cbbca0]/20 border-[#cbbca0] text-[#003875] dark:text-[#FFD500] shadow-md" : "bg-white dark:bg-navy-900 border-slate-100 dark:border-navy-800 text-slate-500 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800"
              }`}
            >
              <span className="font-black text-[11px] uppercase tracking-widest">ALL INDENTS</span>
            </button>
            <div className="space-y-1">
              {I2R_STEP_SHORT.map((name, i) => {
                const n = i + 1; const active = selectedStepFilter === n;
                const STEP_ICONS = [DocumentTextIcon, CheckCircleIcon, UserIcon, ArrowDownTrayIcon, PhotoIcon, PlusIcon, CubeIcon, BuildingOfficeIcon, DocumentTextIcon, ClockIcon];
                const Icon = STEP_ICONS[i];
                return (
                  <div key={n} className="px-1">
                    <button
                      onClick={() => setSelectedStepFilter(n)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border border-slate-50 dark:border-navy-800 bg-white dark:bg-navy-900 hover:border-[#003875]/20 dark:hover:border-[#FFD500]/20 ${
                        active ? "bg-[#e6dcc5] dark:bg-[#cbbca0]/20 border-[#cbbca0] shadow-md z-10" : "text-slate-500 dark:text-navy-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${active ? "text-[#003875] dark:text-[#FFD500]" : "text-[#003875] dark:text-blue-400"}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tight ${active ? "text-[#003875] dark:text-[#FFD500]" : "text-slate-600 dark:text-navy-300"}`}>Step {n} — {name}</span>
                      </div>
                      {stepCounts[n] > 0 && (
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black transition-all ${active ? "bg-[#003875] text-[#FFD500]" : "bg-blue-500 text-white shadow-sm"}`}>{stepCounts[n]}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedStepFilter("completed")}
              className={`w-full flex items-center justify-between px-5 py-2.5 rounded-full mt-3 transition-all border-b-4 ${
                selectedStepFilter === "completed" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md" : "bg-white dark:bg-navy-900 border-slate-100 dark:border-navy-800 text-slate-400 dark:text-navy-600 hover:bg-slate-50 dark:hover:bg-navy-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className={`w-4 h-4 ${selectedStepFilter === "completed" ? "text-emerald-500" : "text-emerald-600 dark:text-emerald-400"}`} />
                <span className={`font-black text-[11px] uppercase tracking-widest ${selectedStepFilter === "completed" ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-500"}`}>COMPLETED</span>
              </div>
              {stepCounts.completed > 0 && (
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black transition-all ${selectedStepFilter === "completed" ? "bg-emerald-500 text-white" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"}`}>{stepCounts.completed}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="flex-1 flex flex-col min-w-0 h-full py-0.5">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-3 shrink-0 px-1">
            <div className="relative group flex-1 max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-navy-600" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl text-[12px] font-bold text-gray-700 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500] transition-all shadow-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDateFilter(dateFilter==='Yesterday'?null:'Yesterday')} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border-2 transition-all ${dateFilter==='Yesterday'?'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-navy-950 border-[#003875] dark:border-[#FFD500] shadow-md':'bg-white dark:bg-navy-900 border-blue-50 dark:border-navy-800 text-blue-400 dark:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800'}`}>YESTERDAY <span className="ml-1 opacity-50">{getDateFilterCount('Yesterday')}</span></button>
              <button onClick={() => setDateFilter(dateFilter==='Today'?null:'Today')} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border-2 transition-all ${dateFilter==='Today'?'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50 shadow-sm':'bg-white dark:bg-navy-900 border-orange-50 dark:border-navy-800 text-orange-400 dark:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800'}`}>TODAY <span className="ml-1 opacity-50">{getDateFilterCount('Today')}</span></button>
              <button onClick={() => setDateFilter(dateFilter==='Tomorrow'?null:'Tomorrow')} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border-2 transition-all ${dateFilter==='Tomorrow'?'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 shadow-sm':'bg-white dark:bg-navy-900 border-blue-50 dark:border-navy-800 text-blue-400 dark:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800'}`}>TOMORROW <span className="ml-1 opacity-50">{getDateFilterCount('Tomorrow')}</span></button>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <p className="text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase tracking-widest whitespace-nowrap">PAGE <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> OF {totalPages||1}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage-1))} className="p-1 text-slate-300 dark:text-navy-700 hover:text-slate-800 dark:hover:text-white transition-colors"><ChevronLeftIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage+1))} className="p-1 text-slate-300 dark:text-navy-700 hover:text-slate-800 dark:hover:text-white transition-colors"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-1 ml-1">
                <p className="text-[10px] font-black text-slate-300 dark:text-navy-700 uppercase">SHOW</p>
                <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="bg-transparent border-none text-[10px] font-black text-[#003875] dark:text-[#FFD500] outline-none cursor-pointer">
                  {[10, 20, 50].map(v => <option key={v} value={v} className="dark:bg-navy-900">{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Cards Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20 py-0.5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-10 animate-pulse text-slate-200 dark:text-navy-800"><ArrowPathIcon className="w-8 h-8 animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">SYNCHRONIZING...</p></div>
            ) : paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-slate-100 dark:text-navy-900"><MagnifyingGlassIcon className="w-12 h-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">NO DATA FOUND</p></div>
            ) : layoutMode === "smart" ? (
              paginatedItems.map(item => {
                const sel = selectedIds.has(item.id); const step = getActiveStep(item); const exp = expandedTiles[item.id];
                return (
                  <div key={item.id} className="px-1">
                    <div onClick={() => { const n = new Set(selectedIds); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); setSelectedIds(n); }} className={`bg-white dark:bg-navy-800 rounded-2xl border transition-all cursor-pointer overflow-hidden ${sel ? "border-[#003875] dark:border-[#FFD500] border-2 shadow-lg" : "border-slate-100 dark:border-navy-700 shadow-sm hover:border-slate-200 dark:hover:border-navy-600"}`}>
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={sel} readOnly className="w-4 h-4 mt-1 rounded border-slate-300 dark:border-navy-700 text-[#003875] dark:text-[#FFD500] focus:ring-[#003875] dark:focus:ring-[#FFD500] dark:bg-navy-900" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-[#003875] dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">INDT - {item.id}</span>
                                <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight uppercase leading-none">{item.item_name}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-1.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase"><CubeIcon className="w-3.5 h-3.5" /> Qty: {item.quantity}</span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase"><TagIcon className="w-3.5 h-3.5" /> {item.category}</span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase"><UserIcon className="w-3.5 h-3.5" /> {item.filled_by}</span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-navy-500 uppercase"><CalendarIcon className="w-3.5 h-3.5" /> {fmtDt(item.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!item.cancelled && step > 0 && (
                              <div className="flex items-center gap-2 mr-1">
                                <div className="flex flex-col items-end">
                                  <p className="text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter leading-none animate-pulse">
                                    {fmtDt((item as any)[`planned_${step}`])} {fmtTm((item as any)[`planned_${step}`])}
                                  </p>
                                  <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${getDelayInfo((item as any)[`planned_${step}`], null, now)?.color || "text-slate-400"}`}>
                                    {getDelayInfo((item as any)[`planned_${step}`], null, now)?.text}
                                  </p>
                                </div>
                              </div>
                            )}
                            {item.cancelled ? (
                              <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm">
                                <NoSymbolIcon className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
                                CANCELLED {fmtDt(item.cancelled)} {fmtTm(item.cancelled)}
                              </div>
                            ) : (
                              <button className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-navy-800 border border-[#FFD500] text-[#003875] dark:text-[#FFD500] rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-[#FFD500]/5 transition-all">
                                <ClockIcon className="w-3.5 h-3.5 text-[#FFD500] stroke-[3]" />
                                {step === 0 ? "DONE" : `STEP ${step} PENDING`}
                              </button>
                            )}
                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-navy-800 rounded-full border border-slate-100 dark:border-navy-700 shadow-lg ring-1 ring-slate-100/50 dark:ring-navy-700/50">
                              <button onClick={e => { e.stopPropagation(); openPOModal(item); }} className="p-1.5 text-[#003875] dark:text-[#FFD500] hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-all active:scale-90" title="Make PO"><PlusIcon className="w-3.5 h-3.5 stroke-[3]" /></button>
                              <button onClick={e => { e.stopPropagation(); openEditModal(item); }} className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all active:scale-90"><PencilSquareIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={e => { e.stopPropagation(); openRemoveFollowUpModal(item); }} className="p-1.5 text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-all active:scale-90" title="Remove Follow Up"><ArrowUturnLeftIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteClick(item.id); }} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:scale-90"><TrashIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={e => { e.stopPropagation(); setCancelTargetId(item.id); }} className="p-1.5 text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-all active:scale-90"><NoSymbolIcon className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Grid */}
                        <div className="grid grid-cols-4 gap-3 py-2 border-t border-slate-50 dark:border-navy-700 mt-1.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400"><BuildingOfficeIcon className="w-3.5 h-3.5" /><p className="text-[9px] font-black uppercase tracking-widest">SUPPLIER</p></div>
                            <p className="text-[12px] font-black text-slate-800 dark:text-white ml-5 truncate">{item.supplier_name_3 || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-orange-400 dark:text-orange-300"><ClockIcon className="w-3.5 h-3.5" /><p className="text-[9px] font-black uppercase tracking-widest">LEAD TIME</p></div>
                            <p className="text-[12px] font-black text-slate-800 dark:text-white ml-5 truncate">{item.lead_time_acc_to_vendor_4 || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-blue-400 dark:text-blue-300"><PhotoIcon className="w-3.5 h-3.5" /><p className="text-[9px] font-black uppercase tracking-widest">SAMPLE</p></div>
                            <p className="text-[12px] font-black text-slate-300 dark:text-navy-600 ml-5">Pending</p>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400"><DocumentTextIcon className="w-3.5 h-3.5" /><p className="text-[9px] font-black uppercase tracking-widest">PO NO</p></div>
                            <p className="text-[12px] font-black text-slate-800 dark:text-white ml-5 truncate">{item.po_number_6 || "—"}</p>
                          </div>
                        </div>
                        
                        <button onClick={e => { e.stopPropagation(); setExpandedTiles(p => ({ ...p, [item.id]: !exp })); }} className="w-full text-center pt-2 text-[9px] font-black text-slate-300 dark:text-navy-600 hover:text-[#003875] dark:hover:text-[#FFD500] transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 border-t border-slate-50 dark:border-navy-700">
                          {exp ? 'HIDE PIPELINE' : 'SHOW ALL 10 STEPS'} <ChevronDownIcon className={`w-3 h-3 transition-transform ${exp ? 'rotate-180' : ''}`} />
                        </button>

                        {exp && (
                          <div className="mt-3 grid grid-cols-5 gap-2 animate-in slide-in-from-top-2 duration-300">
                            {Array.from({ length: 10 }, (_, i) => {
                              const n = i + 1; const act = (item as any)[`actual_${n}`]; const pl = (item as any)[`planned_${n}`]; 
                              const done = !!act;
                              const isPending = !done && n === getActiveStep(item);
                              const delayInfo = getDelayInfo(pl, act);
                              
                              let statusClasses = "bg-slate-50 dark:bg-navy-900 border-slate-200 dark:border-navy-700 text-slate-400 dark:text-navy-600";
                              if (done) statusClasses = "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm";
                              else if (isPending) statusClasses = "bg-orange-50 dark:bg-orange-900/10 border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-400 shadow-sm";

                              return (
                                <div key={n} className={`p-2.5 rounded-xl border transition-all ${statusClasses}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`text-[8px] font-black uppercase tracking-widest ${done ? "text-emerald-600 dark:text-emerald-400" : isPending ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-navy-600"}`}>ST {n}</p>
                                    {done && <CheckCircleIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                                    {isPending && <ClockIcon className="w-3 h-3 text-orange-500 animate-pulse" />}
                                  </div>
                                  <p className={`text-[10px] font-black leading-tight min-h-[1.5rem] line-clamp-2 ${done ? "text-emerald-900 dark:text-emerald-200" : isPending ? "text-orange-900 dark:text-orange-200" : "text-slate-600 dark:text-navy-400"}`}>{I2R_STEP_SHORT[i]}</p>
                                  
                                  <div className={`mt-0.5 space-y-0 pt-1 border-t ${done ? "border-emerald-100 dark:border-emerald-900/50" : isPending ? "border-orange-100 dark:border-orange-900/50" : "border-slate-100 dark:border-navy-700"}`}>
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                      <span className="opacity-50">Planned</span>
                                      <span className="dark:text-white/60">{fmtDt(pl)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                      <span className="opacity-50">Actual</span>
                                      <span className={done ? "text-emerald-700 dark:text-emerald-400" : "opacity-30"}>{act ? fmtDt(act) : "—"}</span>
                                    </div>
                                    {delayInfo && (
                                      <div className={`text-[8px] font-black uppercase text-right mt-0.5 ${delayInfo.color}`}>
                                        {delayInfo.text}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-navy-800 bg-white dark:bg-navy-800 shadow-sm custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003875] dark:bg-navy-950 text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="p-3 w-10 text-center sticky left-0 z-10 bg-[#003875] dark:bg-navy-950"><input type="checkbox" checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0} onChange={() => { if (selectedIds.size === paginatedItems.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paginatedItems.map(i => i.id))); }} className="rounded border-white/20 bg-transparent text-[#FFD500] focus:ring-[#FFD500] dark:border-navy-700" /></th>
                      <th className="p-3 whitespace-nowrap sticky left-10 z-10 bg-[#003875] dark:bg-navy-950">ACTIONS</th>
                      <th className="p-3 whitespace-nowrap sticky left-24 z-10 bg-[#003875] dark:bg-navy-950">INDENT NO.</th>
                      <th className="p-3 whitespace-nowrap">ITEM NAME</th>
                      <th className="p-3 whitespace-nowrap">QUANTITY</th>
                      <th className="p-3 whitespace-nowrap">CATEGORY</th>
                      <th className="p-3 whitespace-nowrap">FILLED BY</th>
                      <th className="p-3 whitespace-nowrap">CREATED AT</th>
                      <th className="p-3 whitespace-nowrap bg-blue-900/40 dark:bg-navy-900/50">SUPPLIER (ST-3)</th>
                      <th className="p-3 whitespace-nowrap bg-blue-900/40 dark:bg-navy-900/50">LEAD TIME (ST-4)</th>
                      <th className="p-3 whitespace-nowrap bg-blue-900/40 dark:bg-navy-900/50">SAMPLE PIC (ST-5)</th>
                      <th className="p-3 whitespace-nowrap bg-blue-900/40 dark:bg-navy-900/50">PO NUMBER (ST-6)</th>
                      {I2R_STEP_SHORT.map((s, i) => <th key={i} className="p-3 whitespace-nowrap border-l border-white/10 dark:border-navy-800/50 min-w-[220px]">STEP {i+1} — {s.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {paginatedItems.map(it => (
                      <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-900/30 transition-all text-[11px] group">
                        <td className="p-3 text-center sticky left-0 z-10 bg-white dark:bg-navy-800 group-hover:bg-slate-50 dark:group-hover:bg-navy-900/30 transition-all"><input type="checkbox" checked={selectedIds.has(it.id)} onChange={() => { const n = new Set(selectedIds); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); setSelectedIds(n); }} className="rounded border-slate-300 dark:border-navy-700 text-[#003875] dark:text-[#FFD500] focus:ring-[#003875] dark:focus:ring-[#FFD500] dark:bg-navy-900" /></td>
                        <td className="p-3 sticky left-10 z-10 bg-white dark:bg-navy-800 group-hover:bg-slate-50 dark:group-hover:bg-navy-900/30 transition-all">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openPOModal(it)} className="p-1.5 text-[#003875] dark:text-[#FFD500] hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md transition-all" title="Make PO"><PlusIcon className="w-4 h-4 stroke-[3]" /></button>
                            <button onClick={() => openEditModal(it)} className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"><PencilSquareIcon className="w-4 h-4" /></button>
                            <button onClick={() => openRemoveFollowUpModal(it)} className="p-1.5 text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-all" title="Remove Follow Up"><ArrowUturnLeftIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteClick(it.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="p-3 sticky left-24 z-10 bg-white dark:bg-navy-800 group-hover:bg-slate-50 dark:group-hover:bg-navy-900/30 transition-all">
                          <div className="flex flex-col gap-1">
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-[#003875] dark:text-blue-400 rounded-full font-black text-[10px] border border-blue-100 dark:border-blue-900/50 whitespace-nowrap">INDT- {it.id}</span>
                            {it.cancelled && <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded text-[8px] font-black uppercase border border-red-100 dark:border-red-900/30 text-center">CANCELLED {fmtDt(it.cancelled)} {fmtTm(it.cancelled)}</span>}
                          </div>
                        </td>
                        <td className="p-3 font-black text-slate-800 dark:text-white uppercase max-w-[200px] truncate">{it.item_name}</td>
                        <td className="p-3 font-bold text-slate-500 dark:text-navy-400">{it.quantity}</td>
                        <td className="p-3 font-bold text-slate-400 dark:text-navy-500">{it.category}</td>
                        <td className="p-3 font-bold text-slate-500 dark:text-navy-400">{it.filled_by}</td>
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-black text-slate-800 dark:text-white">{fmtDt(it.created_at)}</p>
                          <p className="text-[9px] text-slate-400 dark:text-navy-600 uppercase">{fmtTm(it.created_at)}</p>
                        </td>
                        <td className="p-3 font-black text-[#003875] dark:text-blue-400 uppercase">{it.supplier_name_3 || "—"}</td>
                        <td className="p-3 font-black text-orange-600 dark:text-orange-400 uppercase">{it.lead_time_acc_to_vendor_4 || "—"}</td>
                        <td className="p-3">
                          {it.sample_pic_5 ? <a href={it.sample_pic_5} target="_blank" className="text-blue-500 dark:text-blue-400 hover:underline font-black uppercase text-[9px] flex items-center gap-1"><PhotoIcon className="w-3 h-3" /> VIEW PIC</a> : <span className="text-slate-300 dark:text-navy-700 font-bold uppercase text-[9px]">NO PIC</span>}
                        </td>
                        <td className="p-3 font-black text-rose-600 dark:text-rose-400 uppercase">{it.po_number_6 || "—"}</td>
                        {I2R_STEP_SHORT.map((_, i) => {
                          const n = i+1; const act = (it as any)[`actual_${n}`]; const pl = (it as any)[`planned_${n}`];
                          const done = !!act; const isPending = !done && n === getActiveStep(it);
                          const dly = getDelayInfo(pl, act, now);
                          return (
                            <td key={i} className={`p-3 border-l border-slate-50 dark:border-navy-800 ${isPending ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                              {pl ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-4 text-[9px] uppercase whitespace-nowrap"><span className="text-slate-400 dark:text-navy-600 font-bold">PLANNED</span><span className="font-black text-slate-600 dark:text-white/70">{fmtDt(pl)}, {fmtTm(pl)}</span></div>
                                  <div className="flex justify-between gap-4 text-[9px] uppercase whitespace-nowrap"><span className="text-slate-400 dark:text-navy-600 font-bold">ACTUAL</span><span className={`font-black ${done ? 'text-emerald-500 dark:text-emerald-400' : isPending ? 'text-orange-500' : 'text-slate-300'}`}>{act ? `${fmtDt(act)}, ${fmtTm(act)}` : isPending ? 'Pending >' : '—'}</span></div>
                                  {dly && <div className="flex justify-between gap-4 text-[9px] uppercase whitespace-nowrap"><span className="text-slate-400 dark:text-navy-600 font-bold">DELAY</span><span className={`font-black ${dly.color}`}>{dly.text}</span></div>}
                                </div>
                              ) : <span className="text-slate-100 dark:text-navy-950">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Floating Bulk Bar ─── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#FEFBF0] dark:bg-navy-800 px-1.5 py-1.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center gap-4 border border-[#e6dcc5] dark:border-navy-700 z-[100] animate-in slide-in-from-bottom-12 duration-500 ring-4 ring-[#FEFBF0] dark:ring-navy-950">
          <div className="flex items-center gap-2.5 pl-3">
            <div className="w-8 h-8 bg-[#FFD500] text-[#003875] rounded-full flex items-center justify-center font-black text-sm shadow-sm">{selectedIds.size}</div>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#003875] dark:text-[#FFD500]">SELECTED</p>
          </div>
          <button onClick={openBulkModal} className="flex items-center gap-2 bg-[#FFD500] text-[#003875] px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.1em] hover:scale-[1.03] active:scale-95 transition-all shadow-md border-b-2 border-[#ccaa00]">
            <SparklesIcon className="w-3.5 h-3.5 stroke-[2.5]" /> BULK PROCESS
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="pr-5 text-slate-400 dark:text-navy-500 hover:text-[#003875] dark:hover:text-[#FFD500] text-[9px] font-black uppercase tracking-[0.1em] transition-colors">CLEAR</button>
        </div>
      )}

      {/* New/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001a33]/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white dark:bg-navy-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-[#003875] dark:text-white uppercase leading-none">{editingItem ? "Edit Indent Request" : "New Indent Request"}</h2>
                <p className="text-[12px] font-black text-blue-600 dark:text-[#FFD500] mt-2 uppercase">INDT- {editingItem?.id || (items.length + 1)}</p>
              </div>
              <button onClick={closeModal} className="text-slate-300 dark:text-navy-700 hover:text-slate-900 dark:hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="space-y-5">
              <div ref={comboRef} className="relative">
                <label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block mb-1.5">Item Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.item_name || ""} placeholder="Type or select item name" onChange={e => { setFormData({ ...formData, item_name: e.target.value }); setItemNameOpen(true); }} className="w-full px-4 py-3 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500] transition-all" />
                {itemNameOpen && (
                  <ul className="absolute z-[1001] w-full mt-1 bg-white dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto p-1.5">
                    {imsItems.filter(i => i.item_name.toLowerCase().includes((formData.item_name||"").toLowerCase())).map(i => (
                      <li key={i.item_name} onMouseDown={() => { setFormData({...formData, item_name: i.item_name, category: i.category }); setItemNameOpen(false); }} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-navy-800 text-sm font-bold text-slate-700 dark:text-white rounded-lg cursor-pointer transition-all">{i.item_name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div><label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block mb-1.5">Quantity <span className="text-red-500">*</span></label><input type="text" value={formData.quantity || ""} placeholder="Enter quantity" onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500] transition-all" /></div>
              <div><label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block mb-1.5">Category <span className="text-red-500">*</span></label><input type="text" value={formData.category || ""} placeholder="Enter category" onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500] transition-all" /></div>
              <div><label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block mb-1.5">Filled By</label><input type="text" value={formData.filled_by || ""} readOnly className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-navy-800 rounded-xl font-bold text-sm text-slate-500 dark:text-navy-600 cursor-not-allowed outline-none" /></div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={closeModal} className="flex-1 py-3.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-500 dark:text-navy-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-navy-700 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3.5 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-navy-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#002855] dark:hover:bg-[#FFE600] transition-all shadow-lg active:scale-95">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Processor Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001a33]/60 backdrop-blur-md" onClick={() => setIsBulkModalOpen(false)} />
          <div className="relative bg-[#FEFBF0] dark:bg-navy-800 w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
            <div className="px-10 pt-6 pb-3 bg-[#FEFBF0] dark:bg-navy-800 flex items-start justify-between relative shrink-0 border-b border-slate-100 dark:border-navy-700">
              <div><h2 className="text-[26px] font-black italic uppercase tracking-tighter text-[#003875] dark:text-white leading-none">Bulk Processor</h2><p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-slate-400 dark:text-navy-600">Processing {Array.from(selectedIds).length} selected indents</p></div>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-navy-700 rounded-full transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white absolute top-5 right-8"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-10 pb-24 pt-4 space-y-3 custom-scrollbar">
              {Array.from(selectedIds).map(id => {
                const it = items.find(r => r.id === id); if (!it) return null; const n = getActiveStep(it); const t = bulkToggles[id] ?? true;
                return (
                  <div key={id} className={`p-5 bg-white dark:bg-navy-900 rounded-3xl border transition-all ${t ? "border-[#003875]/20 dark:border-[#FFD500]/20 shadow-sm" : "border-slate-100 dark:border-navy-800 opacity-40 shadow-none grayscale"}`}>
                    <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-8">
                      <div className="space-y-1"><div className="flex items-center gap-2"><span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-[#003875] dark:text-blue-400 rounded text-[9px] font-black uppercase border border-blue-100 dark:border-blue-900/50">ID- {it.id}</span><span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded text-[9px] font-black uppercase border border-orange-100 dark:border-orange-900/50">ST- {n}</span></div><h3 className="text-[13px] font-black uppercase text-[#003875] dark:text-white tracking-tight leading-tight truncate max-w-[200px]">{it.item_name}</h3></div>
                      <div className="flex-1">{t && (<div className="animate-in fade-in slide-in-from-left-2 duration-300">{n === 3 && (<div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 dark:text-navy-600 tracking-widest px-1">Supplier Name</label><input type="text" value={bulkSupplierInputs[id]||""} onChange={e => setBulkSupplierInputs(p=>({...p,[id]:e.target.value}))} className="w-full px-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500]" placeholder="Enter supplier..." /></div>)}{n === 4 && (<div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 dark:text-navy-600 tracking-widest px-1">Lead Time</label><input type="text" value={bulkLeadTimeInputs[id]||""} onChange={e => setBulkLeadTimeInputs(p=>({...p,[id]:e.target.value}))} className="w-full px-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500]" placeholder="Enter days/hrs..." /></div>)}{n === 5 && (<div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 dark:text-navy-600 tracking-widest px-1">Sample Link</label><input type="text" value={bulkSamplePicInputs[id]||""} onChange={e => setBulkSamplePicInputs(p=>({...p,[id]:e.target.value}))} className="w-full px-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500]" placeholder="Paste URL..." /></div>)}{n === 6 && (<div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 dark:text-navy-600 tracking-widest px-1">PO Number</label><input type="text" value={bulkPOInputs[id]||""} onChange={e => setBulkPOInputs(p=>({...p,[id]:e.target.value}))} className="w-full px-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-[#003875] dark:focus:border-[#FFD500]" placeholder="Enter PO#..." /></div>)}{![3,4,5,6].includes(n) && (<p className="text-[10px] font-black text-slate-300 dark:text-navy-700 uppercase tracking-widest italic">Standard status update only</p>)}</div>)}</div>
                      <div className="flex items-center gap-3 pr-2"><p className={`text-[9px] font-black uppercase tracking-widest ${t ? 'text-[#003875] dark:text-[#FFD500]' : 'text-slate-300 dark:text-navy-800'}`}>{t ? 'INCLUDE' : 'SKIP'}</p><button onClick={() => setBulkToggles(p => ({...p, [id]: !t}))} className={`w-10 h-5 rounded-full relative p-0.5 transition-all shadow-inner ${t ? "bg-[#003875] dark:bg-[#FFD500]" : "bg-slate-200 dark:bg-navy-700"}`}><div className={`w-4 h-4 bg-white dark:bg-navy-900 rounded-full shadow-md transition-all transform duration-300 ${t ? "translate-x-5" : "translate-x-0"}`} /></button></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 py-3.5 px-10 bg-[#FEFBF0] dark:bg-navy-800 border-t border-slate-100 dark:border-navy-700 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-3 text-[11px] font-black uppercase text-slate-400 dark:text-navy-600 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
              <button onClick={handleBulkStepSave} className="flex items-center gap-2.5 bg-[#003875] dark:bg-[#FFD500] text-[#FFD500] dark:text-navy-950 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-[#001a33] dark:border-navy-950"><SparklesIcon className="w-4 h-4" /> Execute Bulk Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001a33]/60 backdrop-blur-md" onClick={() => setIsConfigModalOpen(false)} />
          <div className="relative bg-[#FEFBF0] dark:bg-navy-800 w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
            <div className="px-10 pt-6 pb-3 bg-[#FEFBF0] dark:bg-navy-800 flex items-start justify-between relative shrink-0">
              <div><h2 className="text-[26px] font-black italic uppercase tracking-tighter text-[#003875] dark:text-white leading-none">System Configuration</h2><p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-slate-400 dark:text-navy-600">Define TAT and Operators</p></div>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-full transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white absolute top-5 right-8"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-10 pb-24 space-y-3 custom-scrollbar">
              {stepConfigs.map((cfg, i) => (
                <div key={i} className="p-5 bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm hover:shadow-md transition-all group">
                  <div className="grid grid-cols-[1fr_200px_350px] items-center gap-8">
                    <div className="space-y-0.5"><p className="text-[9px] font-black uppercase text-slate-400 dark:text-navy-600 tracking-widest">Step {i+1}</p><h3 className="text-[13px] font-black uppercase text-[#003875] dark:text-white tracking-tight leading-tight">{cfg.step_name}</h3></div>
                    <div className="flex flex-col gap-1.5"><div className="flex items-center gap-1.5 text-slate-400 dark:text-navy-600"><ClockIcon className="w-3 h-3" /><p className="text-[9px] font-black uppercase tracking-widest">TAT</p></div><div className="flex items-center gap-2"><div className="bg-slate-100 dark:bg-navy-900 p-0.5 rounded-full flex items-center border border-slate-200 dark:border-navy-800"><button onClick={() => { const n = [...stepConfigs]; n[i].tat = n[i].tat.replace("Days", "Hrs"); setStepConfigs(n); }} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${cfg.tat.includes("Hrs") ? "bg-[#FFD500] text-[#003875] shadow-md" : "text-slate-400 dark:text-navy-600"}`}>HRS</button><button onClick={() => { const n = [...stepConfigs]; n[i].tat = n[i].tat.replace("Hrs", "Days"); setStepConfigs(n); }} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${cfg.tat.includes("Days") ? "bg-[#FFD500] text-[#003875] shadow-md" : "text-slate-400"}`}>DAYS</button></div><input type="text" value={parseFloat(cfg.tat)} onChange={e => { const n = [...stepConfigs]; const unit = cfg.tat.includes("Days") ? "Days" : "Hrs"; n[i].tat = `${e.target.value} ${unit}`; setStepConfigs(n); }} className="w-12 h-8 bg-slate-50 dark:bg-navy-800 border-none rounded-lg text-center font-black text-xs text-[#003875] dark:text-[#FFD500] outline-none" /></div></div>
                    <div className="flex flex-col gap-1.5"><div className="flex items-center gap-1.5 text-slate-400 dark:text-navy-600"><UserIcon className="w-3 h-3" /><p className="text-[9px] font-black uppercase tracking-widest">Responsible Operator</p></div><UserMultiCombobox value={cfg.responsible_person} isSimple onChange={val => { const n = [...stepConfigs]; n[i].responsible_person = val; setStepConfigs(n); }} users={usersList} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 py-3.5 px-10 bg-[#FEFBF0] dark:bg-navy-800 border-t border-slate-100 dark:border-navy-700 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-3 text-[11px] font-black uppercase text-slate-400 dark:text-navy-600 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
              <button onClick={handleSaveConfig} className="flex items-center gap-2.5 bg-[#003875] dark:bg-[#FFD500] text-[#FFD500] dark:text-navy-950 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-[#001a33] dark:border-navy-950"><Cog6ToothIcon className="w-4 h-4" /> Save Configuration</button>
            </div>
          </div>
        </div>
      )}


      {/* Remove Follow Up Modal */}
      {isRemoveFollowUpModalOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001a33]/60 backdrop-blur-md" onClick={() => setIsRemoveFollowUpModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-[#003875] dark:text-white uppercase leading-none">Remove Follow Up</h2>
                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 mt-2 uppercase">ID: {targetItemForRemoveFollowUp?.id}</p>
              </div>
              <button onClick={() => setIsRemoveFollowUpModalOpen(false)} className="text-slate-300 dark:text-navy-700 hover:text-slate-900 dark:hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block mb-3">Select Step to Reset</label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(s => (
                    <button
                      key={s}
                      onClick={() => setRemoveFollowUpStep(s)}
                      className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${
                        removeFollowUpStep === s 
                          ? "bg-purple-500 border-purple-500 text-white shadow-lg scale-110 z-10" 
                          : "bg-slate-50 dark:bg-navy-900 border-slate-100 dark:border-navy-700 text-slate-400 dark:text-navy-600 hover:border-purple-200 dark:hover:border-purple-900"
                      }`}
                    >
                      ST {s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-navy-600 italic">
                  {I2R_STEP_SHORT[removeFollowUpStep-1]}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-800 dark:text-white/80 uppercase block">Removal Logic</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRemoveFollowUpType('particular')}
                    className={`flex-1 py-4 px-4 rounded-2xl border-2 text-left transition-all ${
                      removeFollowUpType === 'particular'
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10"
                        : "border-slate-100 dark:border-navy-700 bg-white dark:bg-navy-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 ${removeFollowUpType === 'particular' ? "border-purple-500 bg-purple-500" : "border-slate-300 dark:border-navy-700"}`} />
                      <span className={`text-[11px] font-black uppercase ${removeFollowUpType === 'particular' ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-navy-400"}`}>Particular Step</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-navy-600 leading-tight">Only reset the selected step. Keeps planned time.</p>
                  </button>
                  <button
                    onClick={() => setRemoveFollowUpType('onwards')}
                    className={`flex-1 py-4 px-4 rounded-2xl border-2 text-left transition-all ${
                      removeFollowUpType === 'onwards'
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10"
                        : "border-slate-100 dark:border-navy-700 bg-white dark:bg-navy-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 ${removeFollowUpType === 'onwards' ? "border-purple-500 bg-purple-500" : "border-slate-300 dark:border-navy-700"}`} />
                      <span className={`text-[11px] font-black uppercase ${removeFollowUpType === 'onwards' ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-navy-400"}`}>Step Onwards</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-navy-600 leading-tight">Reset selected step & remove all future steps.</p>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20 flex gap-3">
                <ExclamationCircleIcon className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 leading-relaxed">
                  This action will clear "Actual" dates and extra details (Supplier, PO, etc) for selected steps. Planned time for Step {removeFollowUpStep} will be preserved.
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsRemoveFollowUpModalOpen(false)} className="flex-1 py-3.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-500 dark:text-navy-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-navy-700 transition-all">Cancel</button>
              <button onClick={handleRemoveFollowUp} className="flex-1 py-3.5 bg-purple-600 dark:bg-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 dark:hover:bg-purple-400 transition-all shadow-lg active:scale-95">Reset Step</button>
            </div>
          </div>
        </div>
      )}

      {/* Make PO Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001a33]/40 backdrop-blur-sm" onClick={() => setIsPOModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Cream Header */}
            <div className="p-8 pb-6 bg-[#FFFBF0] dark:bg-navy-950 border-b border-orange-100/50 dark:border-zinc-800 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#003875] dark:text-white uppercase leading-none">Make PO / GRN Entry</h2>
                <p className="text-[12px] font-black text-blue-600 dark:text-[#FFD500] mt-2 uppercase">INDT- {poFormData.indent_id}</p>
              </div>
              <button onClick={() => setIsPOModalOpen(false)} className="text-slate-300 dark:text-navy-700 hover:text-slate-900 dark:hover:text-white transition-colors"><XMarkIcon className="w-8 h-8" /></button>
            </div>
            
            {/* White Body */}
            <div className="p-8 pt-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-navy-900">
              <div className="col-span-2 space-y-6">
                {/* Section: Basic Info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em] mb-1">Source Information</p>
                  <div className="h-0.5 w-10 bg-[#FFD500] rounded-full"></div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</label>
                      <input type="text" value={poFormData.Item_Name} readOnly className="w-full px-4 py-2.5 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                      <input type="text" value={poFormData.Category} readOnly className="w-full px-4 py-2.5 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filled By</label>
                      <input type="text" value={poFormData.filled_by} readOnly className="w-full px-4 py-2.5 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none" />
                    </div>
                  </div>
                </div>

                {/* Section: PO Details */}
                <div className="space-y-4 pt-2">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em] mb-1">PO / GRN Details</p>
                  <div className="h-0.5 w-10 bg-[#FFD500] rounded-full"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">PO Number <span className="text-red-500">*</span></label>
                      <input type="text" value={poFormData.PO_Number} onChange={e => setPoFormData({...poFormData, PO_Number: e.target.value})} placeholder="Enter PO Number" className="w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#FFD500] focus:bg-[#FFFBF0] dark:focus:bg-zinc-900 transition-all shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Quantity <span className="text-red-500">*</span></label>
                      <input type="text" value={poFormData.Qty} onChange={e => setPoFormData({...poFormData, Qty: e.target.value})} placeholder="Enter Quantity" className="w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#FFD500] focus:bg-[#FFFBF0] dark:focus:bg-zinc-900 transition-all shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Country</label>
                      <input type="text" value={poFormData.Country} onChange={e => setPoFormData({...poFormData, Country: e.target.value})} placeholder="Enter Country" className="w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#FFD500] focus:bg-[#FFFBF0] dark:focus:bg-zinc-900 transition-all shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Payment Terms (Days)</label>
                      <input type="text" value={poFormData.Payment_Terms_In_days} onChange={e => setPoFormData({...poFormData, Payment_Terms_In_days: e.target.value})} placeholder="Enter Days" className="w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#FFD500] focus:bg-[#FFFBF0] dark:focus:bg-zinc-900 transition-all shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Payment Completed</label>
                    <select value={poFormData.Payment_Completed} onChange={e => setPoFormData({...poFormData, Payment_Completed: e.target.value})} className="w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-gray-900 dark:text-white outline-none focus:border-[#FFD500] focus:bg-[#FFFBF0] dark:focus:bg-zinc-900 transition-all shadow-sm cursor-pointer">
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Attach Bill</label>
                    <div className="relative group">
                      <input type="file" id="po-bill" hidden onChange={e => setPoFile(e.target.files?.[0] || null)} />
                      <label htmlFor="po-bill" className="flex items-center justify-between w-full px-4 py-3 bg-[#FFFBF0] dark:bg-zinc-900/50 border-2 border-dashed border-orange-100/50 dark:border-zinc-800 rounded-xl font-bold text-sm text-slate-400 cursor-pointer group-hover:border-[#FFD500] transition-all">
                        <span className="truncate max-w-[200px]">{poFile ? poFile.name : "Choose file..."}</span>
                        <PhotoIcon className="w-5 h-5 text-slate-300 group-hover:text-[#FFD500]" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cream Footer */}
            <div className="p-8 py-6 bg-[#FFFBF0] dark:bg-navy-950 border-t border-orange-100/50 dark:border-zinc-800 flex gap-4">
              <button onClick={() => setIsPOModalOpen(false)} className="flex-1 py-3.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-500 dark:text-navy-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-navy-700 transition-all">Cancel</button>
              <button onClick={handlePOSubmit} disabled={!poFormData.PO_Number || !poFormData.Qty} className="flex-1 py-3.5 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-navy-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#002855] dark:hover:bg-[#FFE600] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? "Uploading..." : "Submit PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={isConfirmOpen} onClose={() => { setIsConfirmOpen(false); setPendingDeleteId(null); }} onConfirm={() => { setIsConfirmOpen(false); performDelete(); }} title="Confirm Deletion" message="This action cannot be undone." confirmLabel="Delete Record" type="danger" />
      <ConfirmModal isOpen={!!cancelTargetId} onClose={() => setCancelTargetId(null)} onConfirm={handleCancelConfirm} title="Cancel Process" message="Mark as inactive?" confirmLabel="Mark Inactive" type="danger" />
      <ActionStatusModal isOpen={isStatusModalOpen} status={actionStatus} message={actionMessage} />
    </div>
  );
}
