"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { O2D, O2DItem } from "@/types/o2d";
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  ShoppingBagIcon,
  PhotoIcon,
  UserIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  ChatBubbleBottomCenterTextIcon,
  CurrencyRupeeIcon,
  HashtagIcon,
  ArchiveBoxIcon,
  EyeIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import { getDriveImageUrl } from "@/lib/drive-utils";

// --- Searchable Dropdown ---
interface SearchableDropdownProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

function SearchableDropdown({ label, icon: Icon, value, onChange, options, placeholder, required }: SearchableDropdownProps) {
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

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 group">
        <Icon className="w-3 h-3 transition-colors group-hover:text-[#FFD500]" />
        {label}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[34px] bg-[#FFFBF0] dark:bg-zinc-900 px-3 rounded-lg border border-orange-100 dark:border-zinc-800 focus-within:border-[#FFD500] cursor-pointer flex items-center justify-between shadow-sm transition-all"
      >
        <span className={`text-[11px] font-bold truncate pr-2 ${value ? 'text-gray-800 dark:text-zinc-100' : 'text-gray-400'}`}>
          {value || placeholder || `Select...`}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[10000] w-full mt-1 bg-white dark:bg-navy-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-gray-50 dark:bg-navy-950 border-none outline-none text-[11px] font-bold text-gray-700 dark:text-white rounded-md"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto no-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-4 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
                    value === opt 
                      ? 'bg-[#FFD500] text-black' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-white/5'
                  }`}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-[10px] text-gray-400 font-bold text-center italic">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function O2DPage() {
  const { data: session } = useSession();
  const currentUser = (session?.user as any)?.username || "";

  const [o2ds, setO2Ds] = useState<O2D[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderNo, setEditingOrderNo] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  // Data
  const [parties, setParties] = useState<string[]>([]);
  const [dropdownItems, setDropdownItems] = useState<{ name: string; amount: string }[]>([]);

  // Form State
  const [commonData, setCommonData] = useState({ order_no: "", party_name: "", remark: "" });
  const [items, setItems] = useState<O2DItem[]>([{ item_name: "", item_qty: "", est_amount: "" }]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modals
  const [actionStatus, setActionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteOrderNo, setPendingDeleteOrderNo] = useState<string | null>(null);

  const [detailViewMode, setDetailViewMode] = useState<'full' | 'table'>('full');

  useEffect(() => {
    fetchO2Ds();
    fetchDetails();
  }, []);

  const fetchO2Ds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/o2d");
      const data = await res.json();
      setO2Ds(data);
      if (data.length > 0 && !selectedOrderNo) {
        const uniqueNos = Array.from(new Set(data.map((o: O2D) => o.order_no))).sort((a: any, b: any) => b.localeCompare(a));
        setSelectedOrderNo(uniqueNos[0] as string);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const fetchDetails = async () => {
    try {
      const res = await fetch("/api/o2d?type=details");
      const data = await res.json();
      setParties(data.parties || []);
      setDropdownItems(data.items || []);
    } catch (error) { console.error(error); }
  };

  const generateOrderNo = (existing: O2D[]) => {
    const orderNos = Array.from(new Set(existing.map(o => o.order_no)));
    if (orderNos.length === 0) return "OR-01";
    const maxNum = orderNos.reduce((max, no) => {
      const num = parseInt(no.replace("OR-", ""));
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return `OR-${(maxNum + 1).toString().padStart(2, '0')}`;
  };

  const groupedOrders = useMemo(() => {
    return o2ds.reduce((acc, o2d) => {
      if (!acc[o2d.order_no]) acc[o2d.order_no] = [];
      acc[o2d.order_no].push(o2d);
      return acc;
    }, {} as Record<string, O2D[]>);
  }, [o2ds]);

  const sortedOrderNumbers = useMemo(() => {
    return Object.keys(groupedOrders)
      .filter(no => no.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   groupedOrders[no][0].party_name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.localeCompare(a));
  }, [groupedOrders, searchTerm]);

  const addItemRow = () => setItems([...items, { item_name: "", item_qty: "", est_amount: "" }]);
  const removeItemRow = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index: number, field: keyof O2DItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    const itemName = field === 'item_name' ? value : newItems[index].item_name;
    const qty = parseFloat(field === 'item_qty' ? value : newItems[index].item_qty);
    const match = dropdownItems.find(di => di.name === itemName);
    if (match) {
        const unitPrice = parseFloat(match.amount);
        if (!isNaN(unitPrice) && !isNaN(qty)) newItems[index].est_amount = (unitPrice * qty).toFixed(2);
        else if (!isNaN(unitPrice)) newItems[index].est_amount = unitPrice.toFixed(2);
    }
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setCommonData({ order_no: generateOrderNo(o2ds), party_name: "", remark: "" });
    setItems([{ item_name: "", item_qty: "", est_amount: "" }]);
    setScreenshotFile(null); setImagePreview(null);
    setEditingOrderNo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus('loading');
    setActionMessage(editingOrderNo ? "Updating Order..." : "Executing Order...");
    setIsStatusModalOpen(true);
    const now = new Date().toISOString();
    try {
      if (editingOrderNo) {
        const updatedItems = items.map(item => ({
            ...groupedOrders[editingOrderNo][0],
            item_name: item.item_name,
            item_qty: item.item_qty,
            est_amount: item.est_amount,
            party_name: commonData.party_name,
            remark: commonData.remark,
            updated_at: now
        }));
        
        const res = await fetch(`/api/o2d/order/${editingOrderNo}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItems),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const formData = new FormData();
        let currentMaxId = o2ds.length > 0 ? Math.max(...o2ds.map(o => parseInt(o.id) || 0)) : 0;
        const o2dDataArray = items.map(item => {
          currentMaxId++;
          return {
            id: currentMaxId.toString(), order_no: commonData.order_no, party_name: commonData.party_name,
            item_name: item.item_name, item_qty: item.item_qty, est_amount: item.est_amount,
            remark: commonData.remark, filled_by: currentUser, created_at: now, updated_at: now,
          };
        });
        formData.append("o2dData", JSON.stringify(o2dDataArray));
        if (screenshotFile) formData.append("order_screenshot", screenshotFile);
        const res = await fetch("/api/o2d", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Creation failed");
      }
      setIsStatusModalOpen(false); setIsModalOpen(false); resetForm(); fetchO2Ds();
    } catch (error: any) {
      setActionStatus('error'); setActionMessage(error.message); setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleEdit = (orderNo: string) => {
    const orderItems = groupedOrders[orderNo];
    setEditingOrderNo(orderNo);
    setCommonData({
      order_no: orderNo,
      party_name: orderItems[0].party_name,
      remark: orderItems[0].remark
    });
    setItems(orderItems.map(o => ({
      item_name: o.item_name,
      item_qty: o.item_qty,
      est_amount: o.est_amount
    })));
    setImagePreview(orderItems[0].order_screenshot ? getDriveImageUrl(orderItems[0].order_screenshot) : null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (orderNo: string) => { setPendingDeleteOrderNo(orderNo); setIsConfirmOpen(true); };
  
  const performDelete = async () => {
    if (!pendingDeleteOrderNo) return;
    setActionStatus('loading'); setActionMessage("Terminating Order..."); setIsStatusModalOpen(true);
    try {
      const res = await fetch(`/api/o2d/order/${pendingDeleteOrderNo}`, { method: "DELETE" });
      if (res.ok) { setIsStatusModalOpen(false); fetchO2Ds(); setSelectedOrderNo(null); }
      else throw new Error("Delete failed");
    } catch (error) { setActionStatus('error'); setActionMessage("Failed"); setTimeout(() => setIsStatusModalOpen(false), 2000); }
    finally { setPendingDeleteOrderNo(null); }
  };

  const handleExport = () => {
    if (o2ds.length === 0) return;
    const headers = ['ID', 'Order No', 'Party Name', 'Item Name', 'Item Qty', 'Est Amount', 'Remark', 'Filled By', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...o2ds.map(item => [
        item.id,
        item.order_no,
        `"${item.party_name}"`,
        `"${item.item_name}"`,
        item.item_qty,
        item.est_amount,
        `"${item.remark || ''}"`,
        item.filled_by,
        item.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `o2d_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedOrder = selectedOrderNo ? groupedOrders[selectedOrderNo] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-3">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight italic">O2D SYSTEM</h1>
          <p className="text-[#003875] dark:text-[#FFD500] font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-80 -mt-1">Syncing Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border-2 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-lg p-0.5">
             <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-4 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all"><PlusIcon className="w-4 h-4 stroke-[3]" /> New Order</button>
             <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
             <button onClick={handleExport} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all"><ArrowDownTrayIcon className="w-4 h-4 stroke-[3]" /> Export</button>
             <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
             <button onClick={fetchO2Ds} className="p-1 text-[#003875] dark:text-[#FFD500] rounded-full hover:bg-gray-100 dark:hover:bg-navy-700 transition-all"><ArrowPathIcon className={`w-4.5 h-4.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </div>

      {/* Main Master-Detail View */}
      <div className="flex-1 flex overflow-hidden rounded-2xl border border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-xl">
        {/* Master Pane: Order List */}
        <div className={`w-full lg:w-80 flex flex-col border-r border-[#003875]/5 dark:border-[#FFD500]/5 ${selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-gray-50 dark:border-navy-800/50 bg-gray-50/30 dark:bg-transparent">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 h-[40px] bg-white dark:bg-navy-950 border border-gray-100 dark:border-navy-800 focus:border-[#FFD500] outline-none font-bold text-[12px] rounded-xl transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] focus:shadow-md" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-2.5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 space-y-2">
                <div className="w-6 h-6 border-2 border-[#FFD500]/20 border-t-[#FFD500] rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Fetching...</p>
              </div>
            ) : sortedOrderNumbers.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <ShoppingBagIcon className="w-10 h-10 text-gray-100 mx-auto mb-2" />
                <p className="text-[11px] font-black uppercase tracking-widest italic text-gray-400">No records</p>
              </div>
            ) : (
              sortedOrderNumbers.map((no) => {
                const orderItems = groupedOrders[no];
                const first = orderItems[0];
                const totalQty = orderItems.reduce((sum, item) => sum + (parseFloat(item.item_qty) || 0), 0);
                const totalAmt = orderItems.reduce((sum, item) => sum + (parseFloat(item.est_amount) || 0), 0);
                const isSelected = selectedOrderNo === no;
                
                return (
                  <div 
                    key={no} 
                    onClick={() => setSelectedOrderNo(no)}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                      isSelected 
                        ? 'border-[#003875] dark:border-[#FFD500] bg-[#003875]/5 dark:bg-[#FFD500]/5 shadow-xl scale-[1.02] z-10' 
                        : 'border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-950 shadow-md hover:shadow-lg hover:border-[#FFD500]/30 hover:scale-[1.01]'
                    }`}
                  >
                    <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all ${
                        isSelected ? 'bg-[#FFD500]' : 'bg-[#003875]/10 group-hover:bg-[#003875]/20'
                    }`} />

                    <div className="flex justify-between items-start mb-2 pl-1.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-black text-gray-900 dark:text-white truncate tracking-tight">{no}</span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{first.party_name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); handleEdit(no); }} className="p-1.5 px-2 bg-[#003875]/5 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all"><PencilSquareIcon className="w-3.5 h-3.5" /></button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(no); }} className="p-1.5 px-2 bg-[#CE2029]/5 text-[#CE2029] hover:bg-[#CE2029] hover:text-white rounded-lg transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pl-1.5">
                      <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-navy-950 px-2 py-0.5 rounded-md uppercase tracking-wider">{totalQty} ITEMS</span>
                      <span className="text-[12px] font-black text-[#003875] dark:text-[#FFD500]">₹{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Thick Red Divider Line */}
        <div className="w-[3px] bg-[#CE2029] h-full hidden lg:block opacity-80" />

        {/* Detail Pane: Order Details - Compact Layout */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-navy-950/20 ${!selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
          {selectedOrder ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* BRAND RED HEADER */}
              <div className="px-5 py-3.5 flex items-center justify-between bg-[#CE2029] text-white">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedOrderNo(null)} className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shadow-inner"><ArrowLeftIcon className="w-4 h-4 text-white" /></button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-[16px] font-black italic tracking-tight uppercase text-white">{selectedOrderNo}</h2>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-md text-[9px] font-black uppercase tracking-[0.2em] border border-white/30 backdrop-blur-sm">LIVE PROTOCOL</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-black/10 rounded-full border border-white/20 backdrop-blur-sm">
                   <button 
                     onClick={() => setDetailViewMode('full')} 
                     className={`p-1.5 rounded-full transition-all ${detailViewMode === 'full' ? 'bg-white text-[#CE2029] shadow-md scale-105' : 'text-white/60 hover:text-white'}`}
                   >
                     <Squares2X2Icon className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => setDetailViewMode('table')} 
                     className={`p-1.5 rounded-full transition-all ${detailViewMode === 'table' ? 'bg-white text-[#CE2029] shadow-md scale-105' : 'text-white/60 hover:text-white'}`}
                   >
                     <ListBulletIcon className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {detailViewMode === 'full' ? (
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 animate-in fade-in duration-200">
                  {/* Consolidated Summary - Cream Background */}
                  <div className="bg-white dark:bg-navy-900/50 p-6 rounded-2xl border-2 border-gray-100 dark:border-navy-800 shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                     <div className="md:col-span-9">
                        <div className="mb-5">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">ESTABLISHED PARTNER</p>
                           <p className="text-lg font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-wide">{selectedOrder[0].party_name}</p>
                        </div>
                        <div className="flex flex-wrap gap-6">
                           <div className="flex items-center gap-3">
                              <ArchiveBoxIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black text-gray-400 uppercase">Loadout</span>
                                 <span className="text-[13px] font-black text-gray-700 dark:text-gray-100">{selectedOrder.length} Items</span>
                              </div>
                           </div>
                           <div className="w-px h-8 bg-[#003875]/5 mx-1 hidden sm:block" />
                           <div className="flex items-center gap-3">
                              <UserIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black text-gray-400 uppercase">Operator</span>
                                 <span className="text-[13px] font-black text-gray-700 dark:text-gray-100 uppercase truncate max-w-[120px]">{selectedOrder[0].filled_by}</span>
                              </div>
                           </div>
                           <div className="w-px h-8 bg-[#003875]/5 mx-1 hidden sm:block" />
                           <div className="flex items-center gap-3">
                              <CalendarDaysIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black text-gray-400 uppercase">Timestamp</span>
                                 <span className="text-[13px] font-black text-gray-700 dark:text-gray-100">
                                   {new Date(selectedOrder[0].created_at).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short'
                                   })}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="md:col-span-3 flex justify-end">
                        <div className="relative group w-28 h-28">
                           <div className="absolute inset-0 bg-[#FFD500] blur-lg opacity-10" />
                           <div className="relative h-full bg-white dark:bg-navy-950 border-4 border-white rounded-xl overflow-hidden shadow-xl group-hover:scale-105 transition-transform">
                              {selectedOrder[0].order_screenshot ? (
                                <img src={getDriveImageUrl(selectedOrder[0].order_screenshot)} className="w-full h-full object-cover" />
                              ) : (
                                <PhotoIcon className="w-6 h-6 text-gray-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <a href={selectedOrder[0].order_screenshot ? getDriveImageUrl(selectedOrder[0].order_screenshot) : "#"} target="_blank" className="p-2 bg-white rounded-full transition-transform hover:scale-110"><EyeIcon className="w-4.5 h-4.5 text-black" /></a>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* High Density Items Table - Cream Background */}
                  <div className="bg-white dark:bg-navy-900/40 rounded-2xl border-2 border-gray-100 dark:border-navy-800 shadow-md overflow-hidden">
                     <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white/40">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 items-center">
                          <div className="w-1 h-3.5 bg-[#003875] rounded-full" /> Tactical Inventory
                        </h3>
                        <div className="text-[12px] font-black text-[#003875] dark:text-[#FFD500]">
                          TOTAL: ₹{selectedOrder.reduce((sum, i) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}
                        </div>
                     </div>
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-[#CE2029] text-[10px] font-black text-white uppercase tracking-widest">
                              <th className="px-6 py-3 rounded-tl-lg">Item Name</th>
                              <th className="px-6 py-3 text-center">Qty</th>
                              <th className="px-6 py-3 text-right rounded-tr-lg">Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-navy-800/20">
                           {selectedOrder.map((item, idx) => (
                              <tr key={idx} className="text-[12px] font-bold text-gray-700 dark:text-gray-300 hover:bg-white/40 transition-colors">
                                 <td className="px-6 py-3.5">{item.item_name}</td>
                                 <td className="px-6 py-3.5 text-center"><span className="px-2.5 py-1 bg-white dark:bg-navy-800 rounded-md text-[11px] font-black shadow-sm border border-gray-100">{item.item_qty}</span></td>
                                 <td className="px-6 py-3.5 text-right font-black">₹{parseFloat(item.est_amount).toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Red Decorative Line */}
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-[#CE2029]/20 to-transparent" />

                  {/* Compact Remarks - Cream Background */}
                  {selectedOrder[0].remark && (
                    <div className="bg-white dark:bg-navy-950 p-5 rounded-2xl border-2 border-gray-100 dark:border-navy-800 relative shadow-md">
                       <ChatBubbleBottomCenterTextIcon className="absolute top-4 right-4 w-6 h-6 text-[#CE2029]/10" />
                       <span className="text-[9px] font-black text-[#CE2029]/40 uppercase tracking-[0.2em] block mb-1.5 font-bold">Intelligence Report</span>
                       <p className="text-[12px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic">"{selectedOrder[0].remark}"</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Pure Simple Table View - Cream Background Theme */
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 animate-in slide-in-from-bottom-2 duration-200">
                   <div className="bg-white dark:bg-navy-900 rounded-xl border-2 border-gray-100 dark:border-navy-800 shadow-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-[#CE2029] text-[11px] font-black text-white uppercase tracking-widest">
                              <th className="px-6 py-4 border-r border-white/10 rounded-tl-xl">Item Specification</th>
                              <th className="px-6 py-4 text-center border-r border-white/10">Quantity</th>
                              <th className="px-6 py-4 text-right rounded-tr-xl">Estimated Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CE2029]/5 dark:divide-navy-800/20">
                           {selectedOrder.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors text-[13px] font-medium text-gray-700 dark:text-gray-200">
                                 <td className="px-6 py-3 border-r border-[#CE2029]/5">{item.item_name}</td>
                                 <td className="px-6 py-3 text-center border-r border-[#CE2029]/5 bg-[#FFD500]/5 dark:bg-navy-950 font-black">{item.item_qty}</td>
                                 <td className="px-6 py-3 text-right font-black text-[#003875] dark:text-[#FFD500]">₹{parseFloat(item.est_amount).toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="bg-white/80 dark:bg-navy-950 font-black text-gray-900 dark:text-white text-[13px] border-t-2 border-[#CE2029]/20 shadow-inner">
                              <td className="px-6 py-4 border-r border-[#CE2029]/10">AGGREGATE SUM</td>
                              <td className="px-6 py-4 text-center border-r border-[#CE2029]/10">{selectedOrder.reduce((sum, i) => sum + (parseFloat(i.item_qty) || 0), 0)} Units</td>
                              <td className="px-6 py-4 text-right text-[#CE2029]">₹{selectedOrder.reduce((sum, i) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}</td>
                           </tr>
                        </tfoot>
                      </table>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-30">
               <div className="w-16 h-16 bg-[#CE2029]/5 rounded-full flex items-center justify-center mb-4"><Squares2X2Icon className="w-8 h-8 text-[#CE2029]" /></div>
               <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#CE2029] italic">Select record to engage</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-orange-100/30 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-transparent">
              <div>
                <h2 className="text-xl font-black text-[#003875] dark:text-white italic">{editingOrderNo ? `EDIT ORDER: ${editingOrderNo}` : "CREATE NEW ORDER"}</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">Automated Intelligence Protocol</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6 shrink-0" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5 bg-white/40 dark:bg-navy-950/20 no-scrollbar">
                <div className="space-y-6">
                  {/* Common Information */}
                  <div className="bg-white dark:bg-navy-950/50 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 -ml-1">
                      <div className="w-1 h-5 bg-[#003875] dark:bg-[#FFD500] rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-200">MASTER CLASSIFICATION</h3>
                    </div>

                    <div className="flex flex-wrap items-end gap-5">
                        <div className="relative group">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><PhotoIcon className="w-3 h-3 text-[#FFD500]" />Order Proof</label>
                             <label className="flex flex-col items-center justify-center w-28 h-28 bg-gray-50/50 dark:bg-navy-900 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl hover:border-[#FFD500] cursor-pointer transition-all active:scale-95 shadow-inner overflow-hidden relative">
                                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <><PhotoIcon className="w-7 h-7 text-gray-200 group-hover:text-[#FFD500] transition-colors" /><span className="text-[8px] font-black text-gray-300 mt-2 tracking-tighter">UPLOAD</span></>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                             </label>
                             {imagePreview && <button type="button" onClick={() => { setScreenshotFile(null); setImagePreview(null); }} className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-xl shadow-lg border-2 border-white"><XMarkIcon className="w-3 h-3" /></button>}
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><IdentificationIcon className="w-3 h-3" />Order ID</label>
                                <input type="text" value={commonData.order_no} readOnly className="w-full h-[36px] bg-gray-50 dark:bg-navy-900 border border-transparent px-3 rounded-xl font-bold text-[11px] text-gray-400 cursor-not-allowed shadow-inner" />
                            </div>
                            <SearchableDropdown label="Partner Name" icon={BuildingOfficeIcon} value={commonData.party_name} onChange={(val) => setCommonData({ ...commonData, party_name: val })} options={parties} />
                        </div>
                    </div>

                    <div className="mt-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><ChatBubbleBottomCenterTextIcon className="w-3 h-3" />Remarks</label>
                        <textarea value={commonData.remark} onChange={(e) => setCommonData({ ...commonData, remark: e.target.value })} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 p-3 rounded-2xl border border-orange-100 dark:border-white/5 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm min-h-[60px] no-scrollbar" placeholder="Order notes..." />
                    </div>
                  </div>

                  {/* Dynamic Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#CE2029] rounded-full" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-200">ITEMIZED LOGISTICS</h3>
                      </div>
                      <button type="button" onClick={addItemRow} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#003875] dark:text-[#FFD500] hover:scale-105 transition-all bg-[#003875]/5 dark:bg-[#FFD500]/10 px-4 py-2 rounded-full shadow-sm"><PlusIcon className="w-3.5 h-3.5 stroke-[3]" /> ADD LINE ITEM</button>
                    </div>

                    <div className="space-y-1.5">
                      {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1.5 px-3 bg-white dark:bg-navy-950/20 rounded-xl border border-gray-100 dark:border-white/5 animate-in slide-in-from-right-2 duration-300 shadow-sm items-end relative group">
                           <div className="md:col-span-6 min-w-0">
                                <SearchableDropdown label="Nomenclature" icon={ArchiveBoxIcon} value={item.item_name} onChange={(val) => handleItemChange(index, 'item_name', val)} options={dropdownItems.map(i => i.name)} />
                           </div>
                           <div className="md:col-span-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><HashtagIcon className="w-2.5 h-2.5" />Qty</label>
                                <input type="number" value={item.item_qty} onChange={(e) => handleItemChange(index, 'item_qty', e.target.value)} className="w-full h-[34px] bg-[#FFFBF0] dark:bg-zinc-900 px-3 rounded-lg border border-orange-100 dark:border-white/5 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm transition-all" required />
                           </div>
                           <div className="md:col-span-3">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><CurrencyRupeeIcon className="w-2.5 h-2.5" />Total</label>
                                <input type="text" value={item.est_amount} onChange={(e) => handleItemChange(index, 'est_amount', e.target.value)} className="w-full h-[34px] bg-[#FFFBF0] dark:bg-zinc-900 px-3 rounded-lg border border-orange-100 dark:border-white/5 focus:border-[#FFD500] outline-none font-bold text-[11px] text-[#003875] dark:text-[#FFD500] shadow-sm transition-all" required />
                           </div>
                           <div className="md:col-span-1 flex items-end pb-1 pr-1">
                                <button type="button" onClick={() => removeItemRow(index)} className="w-full h-[30px] flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"><TrashIcon className="w-4 h-4" /></button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              <div className="pt-5 border-t border-orange-100/30 dark:border-white/5 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-[48px] rounded-2xl font-black text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]">Abandon</button>
                <button type="submit" className="flex-[2] h-[48px] bg-[#CE2029] hover:bg-[#8E161D] text-white rounded-2xl font-black transition-all shadow-[0_8px_20px_-6px_rgba(206,32,41,0.5)] active:scale-95 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 group"><PlusIcon className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" /> {editingOrderNo ? "PROTOCOL UPDATE" : "EXECUTE ORDER"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={performDelete} title="DELETE MASTERCARD" message="Are you sure you want to terminate this entire operational record? This protocol cannot be reversed." />
      <ActionStatusModal isOpen={isStatusModalOpen} status={actionStatus} message={actionMessage} />
    </div>
  );
}
