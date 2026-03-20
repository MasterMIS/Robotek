"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Checklist } from "@/types/checklist";
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
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  BoltIcon,
  TagIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import PremiumDatePicker from "@/components/PremiumDatePicker";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

import { User } from "@/types/user";

export default function ChecklistsPage() {
  const { data: session } = useSession();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Checklist | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Checklist; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [activeStatusFilter, setActiveStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<'All' | 'Delayed' | 'Today' | 'Tomorrow' | 'Next3'>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'ToMe' | 'ByMe'>('All');

  const [formData, setFormData] = useState<Partial<Checklist>>({
    id: "",
    task: "",
    assigned_by: "",
    assigned_to: "",
    priority: "Medium",
    department: "",
    verification_required: "No",
    verifier_name: "",
    attachment_required: "No",
    frequency: "Daily",
    due_date: "",
    status: "Pending",
    group_id: "",
  });

  const predefinedDepartments = [
    "Idea Department", "Sales", "Marketing", "Engineering", "Operations", 
    "HR", "Finance", "Customer Support", "Management"
  ];
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentOpen, setDepartmentOpen] = useState(false);

  // Searchable Dropdown States
  const [assignedBySearch, setAssignedBySearch] = useState("");
  const [assignedToSearch, setAssignedToSearch] = useState("");
  const [assignedByOpen, setAssignedByOpen] = useState(false);
  const [assignedToOpen, setAssignedToOpen] = useState(false);

  // Action Status States
  const [actionStatus, setActionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklists();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsersList(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/checklists");
      const data = await res.json();
      setChecklists(data);
    } catch (error) {
      console.error("Failed to fetch checklists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    const nextId = checklists.length > 0 
      ? Math.max(...checklists.map(c => parseInt(c.id) || 0)) + 1 
      : 1;
      
    setEditingItem(null);
    setFormData({
      id: nextId.toString(),
      task: "",
      assigned_by: "",
      assigned_to: "",
      priority: "Medium",
      department: "",
      verification_required: "No",
      verifier_name: "",
      attachment_required: "No",
      frequency: "Daily",
      due_date: "",
      status: "Pending",
      group_id: "",
    });
    setAssignedBySearch("");
    setAssignedToSearch("");
    setDepartmentSearch("");
    setAssignedByOpen(false);
    setAssignedToOpen(false);
    setDepartmentOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setActionStatus('loading');
    setActionMessage(editingItem ? "Updating checklist item..." : "Creating new checklist item...");
    setIsStatusModalOpen(true);

    const method = editingItem ? "PUT" : "POST";
    const url = editingItem ? `/api/checklists/${editingItem.id}` : "/api/checklists";

    const now = new Date().toISOString();
    const payload = {
      ...formData,
      created_at: editingItem ? formData.created_at : now,
      updated_at: now,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsStatusModalOpen(false);
        setIsModalOpen(false);
        resetForm();
        fetchChecklists();
      } else {
        throw new Error("Failed to save checklist");
      }
    } catch (error) {
      setIsStatusModalOpen(false);
      alert("Something went wrong while saving. Please try again.");
    }
  };

  const handleEdit = (item: Checklist) => {
    setEditingItem(item);
    setFormData({
      ...item,
      due_date: formatDatePickerValue(item.due_date || "")
    });
    setIsModalOpen(true);
  };

  const formatDatePickerValue = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.split(',').map(ds => {
      const s = ds.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const parts = s.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return s;
    }).join(',');
  };

  const getEarliestDate = (dateStr: string) => {
    if (!dateStr) return null;
    const dates = dateStr.split(',').map(d => d.trim()).filter(Boolean);
    if (dates.length === 0) return null;
    
    const parsedDates = dates.map(ds => {
      let d = new Date(ds);
      if (isNaN(d.getTime()) && ds.includes('/')) {
        const parts = ds.split(' ')[0].split('/');
        if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return d;
    }).filter(d => !isNaN(d.getTime()));
    
    if (parsedDates.length === 0) return null;
    return new Date(Math.min(...parsedDates.map(d => d.getTime())));
  };

  const getNextOccurringDay = (dayName: string, baseDateStr?: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIndex = days.indexOf(dayName);
    if (dayIndex === -1) return "";

    // Parse baseDateStr carefully as local date
    let baseDate: Date;
    if (baseDateStr) {
      const [y, m, d] = baseDateStr.split('-').map(Number);
      baseDate = new Date(y, m - 1, d);
    } else {
      baseDate = new Date();
    }
    baseDate.setHours(0,0,0,0);
    const currentDayIndex = baseDate.getDay();

    let diff = dayIndex - currentDayIndex;
    if (diff < 0) {
      diff += 7; // Next occurrence
    }

    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + diff);
    
    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const dates = dateStr.split(',').map(d => d.trim()).filter(Boolean);
    
    // Parse all dates as local dates to avoid offsets
    const formattedDates = dates.map(d => {
      if (d.includes('-') && d.split('-').length === 3) {
        const [y, m, day] = d.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
          return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }
      const date = new Date(d);
      return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    });

    return formattedDates.join(', ');
  };

  const handleExport = () => {
    const headers = ["ID", "Task", "Assigned By", "Assigned To", "Priority", "Department", "Verification", "Verifier", "Attachment", "Frequency", "Due Date", "Status", "Group ID"];
    const rows = sortedChecklists.map(c => [
      c.id, c.task, c.assigned_by, c.assigned_to, c.priority, c.department,
      c.verification_required, c.verifier_name, c.attachment_required,
      c.frequency, c.due_date, c.status, c.group_id
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `checklists_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;

    setActionStatus('loading');
    setActionMessage("Removing checklist item...");
    setIsStatusModalOpen(true);

    try {
      const res = await fetch(`/api/checklists/${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        setIsStatusModalOpen(false);
        fetchChecklists();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      setIsStatusModalOpen(false);
      alert("Failed to delete checklist item. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const getDisplayStatus = (item: Checklist) => {
    const s = item.status;
    if (s && s !== 'Pending') {
      if (s === 'Completed') return 'Completed';
      if (s === 'Approved') return 'Approved';
      if (s === 'Hold') return 'Hold';
      if (s === 'Re-Open') return 'Re-Open';
      if (s === 'Need Revision') return 'Need Revision';
      return s;
    }

    if (!item.due_date) return s || 'Pending';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const due = getEarliestDate(item.due_date);
    if (!due) return item.status || 'Pending';
    due.setHours(0, 0, 0, 0);

    if (due < now) return 'Overdue';
    if (due > now) return 'Planned';
    return 'Pending';
  };

  // Filtering
  const filteredChecklists = checklists.filter((c) => {
    const matchesSearch = Object.values(c).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = activeStatusFilter === "All" || getDisplayStatus(c) === activeStatusFilter;
    
    const currentUser = (session?.user as any)?.username || "";
    let matchesAssignment = true;
    if (assignmentFilter === 'ToMe') matchesAssignment = c.assigned_to === currentUser;
    else if (assignmentFilter === 'ByMe') matchesAssignment = c.assigned_by === currentUser;

    let matchesDate = true;
    if (dateFilter !== 'All') {
      const displayStatus = getDisplayStatus(c);
      if (!c.due_date || displayStatus === 'Completed' || displayStatus === 'Approved') {
        matchesDate = false;
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = getEarliestDate(c.due_date);
        if (due) {
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (dateFilter === 'Delayed') matchesDate = diffDays < 0;
          if (dateFilter === 'Today') matchesDate = diffDays === 0;
          if (dateFilter === 'Tomorrow') matchesDate = diffDays === 1;
          if (dateFilter === 'Next3') matchesDate = diffDays > 0 && diffDays <= 3;
        } else {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesAssignment && matchesDate;
  });

  const getDateFilterCount = (filter: string) => {
    return checklists.filter(c => {
      const displayStatus = getDisplayStatus(c);
      if (!c.due_date || displayStatus === 'Completed' || displayStatus === 'Approved') return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = getEarliestDate(c.due_date);
      if (!due) return false;
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (filter === 'Delayed') return diffDays < 0;
      if (filter === 'Today') return diffDays === 0;
      if (filter === 'Tomorrow') return diffDays === 1;
      if (filter === 'Next3') return diffDays > 0 && diffDays <= 3;
      return false;
    }).length;
  };

  const handleSort = (key: keyof Checklist) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedChecklists = [...filteredChecklists].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue = a[key] || "";
    let bValue = b[key] || "";
    if (key === 'id') {
      const aNum = parseInt(String(aValue));
      const bNum = parseInt(String(bValue));
      if (!isNaN(aNum) && !isNaN(bNum)) return direction === 'asc' ? aNum - bNum : bNum - aNum;
    }
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Checklist }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" /> : 
      <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />;
  };

  const totalPages = Math.ceil(sortedChecklists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChecklists = sortedChecklists.slice(startIndex, startIndex + itemsPerPage);

  const getPriorityBadge = (priority: string) => {
    const p = priority?.toLowerCase();
    let color = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
    if (p === 'high') color = "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    else if (p === 'low') color = "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    else if (p === 'medium') color = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${color}`}>
        {priority || "Normal"}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let color = "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    if (s === 'completed') color = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
    else if (s === 'approved') color = "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    else if (s === 'hold') color = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
    else if (s === 're-open') color = "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800";
    else if (s === 'overdue') color = "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    else if (s === 'planned') color = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
    else if (s === 'need revision') color = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${color}`}>
        {status || "Pending"}
      </span>
    );
  };

  // Get unique users for dropdowns
  const allUsers = Array.from(new Set(checklists.flatMap(c => [c.assigned_by, c.assigned_to]).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Checklists</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider">Task Verification System</p>
        </div>
        
        <div className="flex items-center rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-5 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[10px] rounded-full"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 transition-colors rounded-full"
            title="New Checklist"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        style={{ borderColor: 'var(--panel-border)' }}
        className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500"
      >
        {/* Status Filtration Tiles */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 dark:bg-navy-900/30 border-b border-gray-100 dark:border-navy-700/50">
          {[
            { label: 'All', icon: <TagIcon className="w-3 h-3" />, color: 'bg-white text-gray-700 border-gray-300 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600' },
            { label: 'Pending', icon: <ClockIcon className="w-3 h-3" />, color: 'bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600' },
            { label: 'Planned', icon: <CalendarDaysIcon className="w-3 h-3" />, color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
            { label: 'Need Revision', icon: <ArrowPathIcon className="w-3 h-3" />, color: 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700' },
            { label: 'Completed', icon: <CheckCircleIcon className="w-3 h-3" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' },
            { label: 'Approved', icon: <ShieldCheckIcon className="w-3 h-3" />, color: 'bg-green-50 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
            { label: 'Hold', icon: <PauseIcon className="w-3 h-3" />, color: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
            { label: 'Re-Open', icon: <BoltIcon className="w-3 h-3" />, color: 'bg-violet-50 text-violet-600 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700' },
            { label: 'Overdue', icon: <ExclamationTriangleIcon className="w-3 h-3" />, color: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
          ].map(tile => {
            const count = tile.label === 'All' ? checklists.length : checklists.filter(c => getDisplayStatus(c) === tile.label).length;
            const isActive = activeStatusFilter === tile.label;
            return (
              <button
                key={tile.label}
                onClick={() => {
                  if (tile.label === 'All') {
                    setDateFilter('All');
                    setAssignmentFilter('All');
                    setSearchTerm('');
                  }
                  setActiveStatusFilter(tile.label);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-md scale-105' 
                    : `${tile.color} hover:scale-[1.02] hover:shadow-sm`
                }`}
              >
                {tile.icon}
                {tile.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                  isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls Bar */}
        <div 
          style={{ backgroundColor: 'var(--panel-card)', borderBottom: '1px solid var(--panel-border)' }}
          className="p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
        >
          <div className="flex flex-wrap items-center gap-3 flex-1 w-full max-w-full overflow-hidden">
            <div className="relative group flex-1 min-w-[150px] max-w-[220px]">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
              <input
                type="text"
                placeholder="Search checklists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
              />
            </div>

            {/* Assignment Filters */}
            <div className="flex items-center bg-gray-100 dark:bg-navy-900 rounded-full p-1 border border-gray-200 dark:border-navy-700 flex-shrink-0">
              <button 
                onClick={() => { setAssignmentFilter(assignmentFilter === 'ToMe' ? 'All' : 'ToMe'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all h-[26px] flex items-center gap-1.5 ${assignmentFilter === 'ToMe' ? 'bg-[#003875] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                To Me
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${assignmentFilter === 'ToMe' ? 'bg-white/20' : 'bg-gray-200 dark:bg-navy-800'}`}>
                  {checklists.filter(c => c.assigned_to === ((session?.user as any)?.username || "")).length}
                </span>
              </button>
              <button 
                onClick={() => { setAssignmentFilter(assignmentFilter === 'ByMe' ? 'All' : 'ByMe'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all h-[26px] flex items-center gap-1.5 ${assignmentFilter === 'ByMe' ? 'bg-[#003875] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                By Me
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${assignmentFilter === 'ByMe' ? 'bg-white/20' : 'bg-gray-200 dark:bg-navy-800'}`}>
                  {checklists.filter(c => c.assigned_by === ((session?.user as any)?.username || "")).length}
                </span>
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
              {[
                { id: 'Delayed', label: 'Delayed', color: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
                { id: 'Today', label: 'Today', color: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
                { id: 'Tomorrow', label: 'Tomorrow', color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
                { id: 'Next3', label: 'Next 3 Days', color: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' }
              ].map(f => {
                const count = getDateFilterCount(f.id);
                const isActive = dateFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setDateFilter(isActive ? 'All' : f.id as any); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all h-[28px] flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-sm scale-105' 
                        : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                    }`}
                  >
                    {f.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 hidden md:flex">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}
              </p>
              <div className="flex gap-0.5 ml-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">First</button>
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">Last</button>
              </div>
            </div>
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div 
          style={{ backgroundColor: 'var(--panel-card)' }}
          className="overflow-x-auto transition-colors duration-500 min-h-[400px]"
        >
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200 whitespace-nowrap">
                <th onClick={() => handleSort('id')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">ID <SortIcon column="id" /></div>
                </th>
                <th onClick={() => handleSort('task')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors min-w-[200px]">
                  <div className="flex items-center">Task <SortIcon column="task" /></div>
                </th>
                <th onClick={() => handleSort('assigned_to')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Personnel <SortIcon column="assigned_to" /></div>
                </th>
                <th onClick={() => handleSort('department')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Dept <SortIcon column="department" /></div>
                </th>
                <th onClick={() => handleSort('priority')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Priority <SortIcon column="priority" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Status <SortIcon column="status" /></div>
                </th>
                <th onClick={() => handleSort('frequency')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Freq <SortIcon column="frequency" /></div>
                </th>
                <th onClick={() => handleSort('due_date')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Due Date <SortIcon column="due_date" /></div>
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Syncing...</p>
                  </td>
                </tr>
              ) : paginatedChecklists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No checklists found</p>
                  </td>
                </tr>
              ) : (
                paginatedChecklists.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/10 border-b-2 border-gray-200 dark:border-white/10 last:border-0 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-gray-400 font-bold">#{item.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black text-xs text-gray-900 dark:text-white leading-tight">{item.task}</p>
                      {item.verification_required?.toLowerCase() === 'yes' && (
                        <p className="text-[9px] text-amber-500 font-bold mt-0.5">🔍 Verification: {item.verifier_name || "—"}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">{item.assigned_to || "—"}</span>
                        <span className="text-[10px] text-gray-400 font-bold">By: {item.assigned_by || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-md">
                        {item.department || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getPriorityBadge(item.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(getDisplayStatus(item))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 text-[10px] font-black uppercase tracking-widest rounded-md">
                        {item.frequency?.includes(':') ? (
                          <span className="flex items-center gap-1">
                            {item.frequency.split(':')[0]}
                            <span className="w-1 h-1 rounded-full bg-indigo-300" />
                            {item.frequency.split(':')[1]}
                          </span>
                        ) : (item.frequency || "Daily")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 truncate max-w-[150px]" title={formatDateDisplay(item.due_date)}>
                        {formatDateDisplay(item.due_date) || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 bg-[#003875]/10 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-1.5 bg-[#CE2029]/10 text-[#CE2029] hover:bg-[#CE2029] hover:text-white rounded-lg transition-all"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  {editingItem ? "Edit Checklist" : "New Checklist"}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest">Task Configuration</p>
                  {editingItem && (
                    <span className="px-2 py-0.5 bg-orange-50 dark:bg-zinc-800 text-[8px] font-black text-gray-500 rounded border border-orange-100 dark:border-zinc-700">
                      ID: {editingItem.id}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[80vh] overflow-y-auto bg-white dark:bg-navy-800/50">
              {/* Task */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Task Description</label>
                <textarea
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm min-h-[80px]"
                  required
                  rows={2}
                  placeholder="Enter task description..."
                />
              </div>

              {/* Row 1: Assigned By + Assigned To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assigned By Searchable Dropdown */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assigned By</label>
                  <div 
                    className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                    onClick={() => {
                      setAssignedByOpen(!assignedByOpen);
                      setAssignedToOpen(false);
                      setDepartmentOpen(false);
                    }}
                  >
                    <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center hover:border-[#FFD500] transition-colors">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.assigned_by || "Select User..."}</span>
                      </div>
                      <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  {assignedByOpen && (
                    <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          value={assignedBySearch}
                          onChange={(e) => setAssignedBySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {usersList.filter(u => ['ADMIN', 'EA'].includes(u.role_name?.toUpperCase() || '') && u.username.toLowerCase().includes(assignedBySearch.toLowerCase())).map(u => (
                          <div key={`by-${u.id}`}
                            className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                            onClick={() => { 
                              setFormData({ ...formData, assigned_by: u.username }); 
                              setAssignedByOpen(false); 
                              setAssignedBySearch(""); 
                            }}
                          >{u.username}</div>
                        ))}
                        {usersList.filter(u => ['ADMIN', 'EA'].includes(u.role_name?.toUpperCase() || '') && u.username.toLowerCase().includes(assignedBySearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-[10px] text-gray-400 text-center">No users found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned To Searchable Dropdown */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assigned To</label>
                  <div 
                    className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                    onClick={() => {
                      setAssignedToOpen(!assignedToOpen);
                      setAssignedByOpen(false);
                      setDepartmentOpen(false);
                    }}
                  >
                    <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center hover:border-[#FFD500] transition-colors">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.assigned_to || "Select User..."}</span>
                      </div>
                      <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  {assignedToOpen && (
                    <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          value={assignedToSearch}
                          onChange={(e) => setAssignedToSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {usersList.filter(u => u.username.toLowerCase().includes(assignedToSearch.toLowerCase())).map(u => (
                          <div key={`to-${u.id}`}
                            className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                            onClick={() => { 
                              setFormData({ ...formData, assigned_to: u.username }); 
                              setAssignedToOpen(false); 
                              setAssignedToSearch(""); 
                            }}
                          >{u.username}</div>
                        ))}
                        {usersList.filter(u => u.username.toLowerCase().includes(assignedToSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-[10px] text-gray-400 text-center">No users found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Department + Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Searchable Dropdown */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Department</label>
                  <div 
                    className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                    onClick={() => { 
                      setDepartmentOpen(!departmentOpen); 
                      setAssignedByOpen(false); 
                      setAssignedToOpen(false); 
                    }}
                  >
                    <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center hover:border-[#FFD500] transition-colors">
                      <div className="flex items-center gap-2">
                        <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.department || "Select Department..."}</span>
                      </div>
                      <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  {departmentOpen && (
                    <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                        <input 
                          type="text" 
                          placeholder="Search departments..." 
                          value={departmentSearch}
                          onChange={(e) => setDepartmentSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {predefinedDepartments.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).map(d => (
                          <div key={`dept-${d}`}
                            className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                            onClick={() => { 
                              setFormData({ ...formData, department: d }); 
                              setDepartmentOpen(false); 
                              setDepartmentSearch(""); 
                            }}
                          >{d}</div>
                        ))}
                        {predefinedDepartments.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer flex items-center gap-2"
                            onClick={() => { 
                              setFormData({ ...formData, department: departmentSearch }); 
                              setDepartmentOpen(false); 
                              setDepartmentSearch(""); 
                            }}
                          ><PlusIcon className="w-3 h-3" /> Add "{departmentSearch}"</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Priority</label>
                  <div className="flex bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                    {(['Low', 'Medium', 'High'] as const).map((pri) => (
                      <button key={pri} type="button"
                        onClick={() => setFormData({ ...formData, priority: pri })}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          formData.priority === pri 
                            ? pri === 'Low' ? 'bg-green-500 text-white shadow-md'
                            : pri === 'Medium' ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-red-500 text-white shadow-md'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >{pri}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Frequency + Due Date */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Frequency</label>
                  <div className="flex flex-nowrap overflow-x-auto pb-1.5 gap-1.5 custom-scrollbar no-scrollbar">
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly'].map((freq) => {
                      const isSelected = formData.frequency?.startsWith(freq);
                      return (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => {
                            if (freq === 'Weekly') {
                              if (!formData.frequency?.startsWith('Weekly')) {
                                const nextDayStr = getNextOccurringDay('Mon', formData.due_date);
                                setFormData({ ...formData, frequency: 'Weekly: Mon', due_date: nextDayStr });
                              }
                            } else {
                              setFormData({ ...formData, frequency: freq, due_date: "" });
                            }
                          }}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border whitespace-nowrap shadow-sm flex-shrink-0 ${
                            isSelected 
                              ? 'bg-[#FFD500] text-black border-[#FFD500] shadow-[#FFD500]/20' 
                              : 'bg-white dark:bg-zinc-900 text-gray-500 border-orange-50 dark:border-zinc-800 hover:border-[#FFD500] hover:text-[#003875] dark:hover:text-[#FFD500]'
                          }`}
                        >
                          {freq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.frequency?.startsWith('Weekly') && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-300 border-t border-orange-50 dark:border-zinc-800/50 pt-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Days (Next occurrence set automatically)</p>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { label: 'M', value: 'Mon', full: 'Monday' },
                        { label: 'T', value: 'Tue', full: 'Tuesday' },
                        { label: 'W', value: 'Wed', full: 'Wednesday' },
                        { label: 'T', value: 'Thu', full: 'Thursday' },
                        { label: 'F', value: 'Fri', full: 'Friday' },
                        { label: 'S', value: 'Sat', full: 'Saturday' }
                      ].map((day) => {
                        const currentFreq = formData.frequency || "";
                        const prefix = "Weekly: ";
                        const activeDays = currentFreq.startsWith(prefix) 
                          ? currentFreq.slice(prefix.length).split(',').map(d => d.trim()) 
                          : [];
                        const isDaySelected = activeDays.includes(day.value);

                        return (
                          <button
                            key={day.value}
                            type="button"
                            title={day.full}
                            onClick={() => {
                              let newDays;
                              if (isDaySelected) {
                                newDays = activeDays.filter(d => d !== day.value);
                              } else {
                                newDays = [...activeDays, day.value];
                              }
                              
                              const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              newDays.sort((a,b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
                              
                              const newValue = newDays.length > 0 ? prefix + newDays.join(',') : 'Daily';
                              
                              // Auto-calculate next occurrence for ALL selected days from today
                              const nextDates = newDays.map(d => getNextOccurringDay(d));
                              const nextDateStr = nextDates.join(',');
                              
                              setFormData({ ...formData, frequency: newValue, due_date: nextDateStr });
                            }}
                            className={`w-9 h-9 rounded-full flex flex-col items-center justify-center transition-all border shadow-sm ${
                              isDaySelected
                                ? 'bg-[#CE2029] text-white border-[#CE2029] shadow-[#CE2029]/20 scale-110'
                                : 'bg-gray-50 dark:bg-zinc-800 text-gray-400 border-orange-50 dark:border-zinc-700 hover:border-[#CE2029] hover:text-[#CE2029]'
                            }`}
                          >
                            <span className="text-[10px] font-black">{day.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="border-t border-orange-50 dark:border-zinc-800/50 pt-3">
                  <PremiumDatePicker 
                    label="Due Date"
                    value={formData.due_date || ""}
                    onChange={(val) => setFormData({ ...formData, due_date: val })}
                    multiSelect={formData.frequency?.startsWith('Weekly') || ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'].includes(formData.frequency || "")}
                    allowPast={false}
                    allowSundays={false}
                  />
                </div>
              </div>

              {/* Row 4: Verification + Attachment + Verifier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-orange-50 dark:border-zinc-800/50 pt-4 items-end">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Verification Required?</label>
                  <div className="flex bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                    {(['No', 'Yes'] as const).map((val) => (
                      <button key={val} type="button"
                        onClick={() => setFormData({ ...formData, verification_required: val })}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          formData.verification_required === val
                            ? val === 'Yes' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-400 text-white shadow-md'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >{val === 'Yes' ? '✓ Yes' : '✗ No'}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Attachment Required?</label>
                  <div className="flex bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                    {(['No', 'Yes'] as const).map((val) => (
                      <button key={val} type="button"
                        onClick={() => setFormData({ ...formData, attachment_required: val })}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          formData.attachment_required === val
                            ? val === 'Yes' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-400 text-white shadow-md'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >{val === 'Yes' ? '✓ Yes' : '✗ No'}</button>
                    ))}
                  </div>
                </div>

                {formData.verification_required === 'Yes' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Verifier Name</label>
                    <input
                      type="text"
                      value={formData.verifier_name}
                      onChange={(e) => setFormData({ ...formData, verifier_name: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                      placeholder="Enter verifier's name"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-orange-100/50 dark:border-zinc-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#CE2029] hover:bg-[#8E161D] text-white px-4 py-2 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  {editingItem ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Status Modal */}
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={actionStatus}
        message={actionMessage}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Checklist Item"
        message="Are you sure you want to delete this checklist item? This action cannot be undone."
        onConfirm={() => {
          performDelete();
        }}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
