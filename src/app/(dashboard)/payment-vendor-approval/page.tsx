"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { GRN } from "@/types/grn";
import { PaymentVendorRecord } from "../../../types/payment-vendor";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
  DocumentTextIcon,
  HashtagIcon,
  CubeIcon,
  TagIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import DateFilterBar, { FilterPeriod } from "@/components/DateFilterBar";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(dateString: string) {
  if (!dateString || dateString === "—") return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export default function PaymentVendorApprovalPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'USER';
  const isAdmin = userRole === 'ADMIN';
  const isUser = userRole === 'USER';

  const { data: grnData, isLoading: grnLoading } = useSWR("/api/grn", fetcher, { refreshInterval: 5000 });
  const { data: vendorData, mutate: mutateVendorData, isLoading: vendorLoading } = useSWR("/api/payment-vendor", fetcher, { refreshInterval: 5000 });
  const { data: i2rData } = useSWR("/api/i2r", fetcher, { refreshInterval: 60000 });

  const grnItems: GRN[] = grnData?.items ? [...grnData.items].reverse() : [];
  const vendorItems: PaymentVendorRecord[] = vendorData?.items || [];
  const i2rItems: any[] = Array.isArray(i2rData) ? i2rData : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalGrnNo, setModalGrnNo] = useState("");
  const [modalActionType, setModalActionType] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");

  const mergedItems = useMemo(() => {
    return grnItems.map(grn => {
      const vendorRecord = vendorItems.find(v => v.grn_no === grn.GRN_No) || {
        grn_no: grn.GRN_No,
        status: "",
        remarks: ""
      };
      const i2rItem = i2rItems.find(it => it.id === grn.indent_id);
      const rawCreatedAt = i2rItem?.actual_6;

      let calculatedPlannedDate = "—";
      let rawPlannedDate: Date | null = null;
      if (rawCreatedAt && rawCreatedAt !== "—" && grn.Payment_Terms_In_days) {
        const days = parseInt(grn.Payment_Terms_In_days, 10);
        if (!isNaN(days)) {
          const d = new Date(rawCreatedAt);
          d.setDate(d.getDate() + days);
          rawPlannedDate = d;
          calculatedPlannedDate = formatDate(d.toISOString());
        }
      }

      return {
        ...grn,
        vendorRecord,
        rawCreatedAt: rawCreatedAt && rawCreatedAt !== "—" ? rawCreatedAt : null,
        createdAt: formatDate(rawCreatedAt || "—"),
        rawPlannedDate,
        calculatedPlannedDate
      };
    });
  }, [grnItems, vendorItems, i2rItems]);

  const filteredItems = useMemo(() => {
    let effectiveStart: Date | null = startDate;
    let effectiveEnd: Date | null = endDate;

    if (filterPeriod !== 'ALL' && filterPeriod !== 'CUSTOM') {
      switch (filterPeriod) {
        case 'DAY':
          effectiveStart = startOfDay(currentDate);
          effectiveEnd = endOfDay(currentDate);
          break;
        case 'WEEK':
          effectiveStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          effectiveEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
          break;
        case 'MONTH':
          effectiveStart = startOfMonth(currentDate);
          effectiveEnd = endOfMonth(currentDate);
          break;
        case 'QUARTERLY':
          effectiveStart = startOfQuarter(currentDate);
          effectiveEnd = endOfQuarter(currentDate);
          break;
        case 'YEARLY':
          effectiveStart = startOfYear(currentDate);
          effectiveEnd = endOfYear(currentDate);
          break;
      }
    }

    return mergedItems.filter((item) => {
      // 1. Search Filter
      const matchesSearch = Object.values(item).some(val =>
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchesSearch) return false;

      // 2. Status Filter
      const status = item.vendorRecord.status;
      if (statusFilter === "Pending Payment") {
        if (status === "Payed" || status === "Approved" || status === "Rejected") return false;
      } else if (statusFilter === "Pending Approval") {
        if (status !== "Payed") return false;
      } else if (statusFilter === "Approved") {
        if (status !== "Approved") return false;
      } else if (statusFilter === "Rejected") {
        if (status !== "Rejected") return false;
      }

      // 3. Date Filter (Planned Date)
      if (filterPeriod !== 'ALL') {
        if (!item.rawPlannedDate) return false;
        if (effectiveStart && item.rawPlannedDate < effectiveStart) return false;
        if (effectiveEnd && item.rawPlannedDate > effectiveEnd) return false;
      }

      return true;
    });
  }, [mergedItems, searchTerm, statusFilter, filterPeriod, currentDate, startDate, endDate]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openActionModal = (grn_no: string, actionType: string) => {
    setModalGrnNo(grn_no);
    setModalActionType(actionType);
    setModalRemarks("");
    setIsModalOpen(true);
  };

  const confirmAction = async () => {
    if (!modalGrnNo || !modalActionType) return;

    setIsModalOpen(false);
    setActionLoading(modalGrnNo);

    try {
      // Append remark if it exists
      const existingRecord = vendorItems.find(v => v.grn_no === modalGrnNo);
      let newRemarks = existingRecord?.remarks || "";
      if (modalRemarks.trim()) {
        const prefix = modalActionType === 'Payed' ? 'User: ' : 'Admin: ';
        newRemarks = newRemarks ? `${newRemarks} | ${prefix}${modalRemarks.trim()}` : `${prefix}${modalRemarks.trim()}`;
      }

      const res = await fetch("/api/payment-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grn_no: modalGrnNo, status: modalActionType, remarks: newRemarks })
      });

      if (res.ok) {
        mutateVendorData();
      } else {
        alert("Failed to update status.");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating status.");
    } finally {
      setActionLoading(null);
    }
  };

  const exportToCSV = () => {
    if (filteredItems.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = [
      "GRN_No", "PO_Number", "Created At", "Item_Name", "Category",
      "Qty", "Country", "Payment Terms (Days)", "Planned Date",
      "Status", "User Remarks", "Admin Remarks"
    ];

    const rows = filteredItems.map(item => {
      const status = item.vendorRecord.status || "Pending";
      const remarks = item.vendorRecord.remarks || "";
      const userRemarks = remarks.split('|').find((r: string) => r.includes('User:'))?.replace('User:', '').trim() || "";
      const adminRemarks = remarks.split('|').find((r: string) => r.includes('Admin:'))?.replace('Admin:', '').trim() || "";

      return [
        item.GRN_No || "",
        item.PO_Number || "",
        item.createdAt || "",
        `"${(item.Item_Name || "").toString().replace(/"/g, '""')}"`,
        item.Category || "",
        item.Qty || "",
        item.Country || "",
        item.Payment_Terms_In_days || "",
        item.calculatedPlannedDate || "",
        status,
        `"${userRemarks.replace(/"/g, '""')}"`,
        `"${adminRemarks.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payment_Vendor_Approval_${formatDate(new Date().toISOString())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FEFBF0] dark:bg-navy-950 overflow-hidden">
      {/* ─── Header Section ─── */}
      <div className="px-4 py-3 bg-[#FEFBF0] dark:bg-navy-900 border-b border-slate-100 dark:border-navy-800 shrink-0">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#003875] dark:text-[#FFD500] tracking-tight uppercase leading-none">Payment Vendor Approval</h1>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mt-1.5">Manage Vendor Payments</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative group flex-1 md:w-64 shrink-0">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#003875] dark:group-focus-within:text-[#FFD500] transition-colors" />
              <input
                type="text"
                placeholder="Search vendor payments..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-lg focus:border-[#003875] dark:focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-navy-950 dark:hover:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0 group"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-slate-300">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <div
          style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--panel-card)' }}
          className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500 flex flex-col h-full"
        >
          {/* Filter Row */}
          <div
            style={{
              backgroundColor: 'var(--panel-card)',
              borderBottom: '1px solid var(--panel-border)',
            }}
            className="px-3 md:px-4 py-2 flex items-center shrink-0"
          >
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 shrink-0 pr-4 border-r border-gray-200 dark:border-navy-700 mr-2 overflow-x-auto no-scrollbar">
              {[
                { id: "All", label: "All" },
                { id: "Pending Payment", label: "Pending Payment" },
                { id: "Pending Approval", label: "Pending Approval" },
                { id: "Approved", label: "Approved" },
                { id: "Rejected", label: "Rejected" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                    ${statusFilter === tab.id
                      ? 'bg-[#003875] text-white dark:bg-[#FFD500] dark:text-black shadow-md'
                      : 'bg-white dark:bg-[#0B101E] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-navy-900 border border-gray-200 dark:border-navy-700'}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-x-auto no-scrollbar">
              <DateFilterBar
                period={filterPeriod}
                setPeriod={(p) => { setFilterPeriod(p); setCurrentPage(1); }}
                currentDate={currentDate}
                setCurrentDate={(d) => { setCurrentDate(d); setCurrentPage(1); }}
                startDate={startDate}
                setStartDate={(d) => { setStartDate(d); setCurrentPage(1); }}
                endDate={endDate}
                setEndDate={(d) => { setEndDate(d); setCurrentPage(1); }}
                theme="emerald"
              />
            </div>
          </div>

          {grnLoading || vendorLoading ? (
            <div className="flex flex-col items-center justify-center py-20 flex-1">
              <div className="w-8 h-8 border-3 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">SYNCHRONIZING...</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto flex-1 no-scrollbar min-h-0 relative bg-white dark:bg-[#0B101E]">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-slate-300">
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">GRN / PO Details</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Created At</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Item & Category</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Qty</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Country</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Payment Terms</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Planned Date</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700">Attach Bill</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700 text-center">User Action</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700 text-center">User Remarks</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700 text-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400">Payment Approved</th>
                    <th className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-navy-700 text-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400">Admin Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-800/50">
                  {paginatedItems.map((item) => {
                    const status = item.vendorRecord.status;
                    const remarks = item.vendorRecord.remarks || "";
                    const userRemarks = remarks.split('|').find((r: string) => r.includes('User:'))?.replace('User:', '').trim() || "";
                    const adminRemarks = remarks.split('|').find((r: string) => r.includes('Admin:'))?.replace('Admin:', '').trim() || "";

                    const isPayed = status === 'Payed' || status === 'Approved';
                    const isApproved = status === 'Approved';
                    const isRejected = status === 'Rejected';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-800/30 transition-colors group">
                        <td className="px-2 py-3 md:py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-mono font-black text-[#003875] dark:text-[#FFD500] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit break-words max-w-full">
                              <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.GRN_No}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-navy-900 px-2 py-0.5 rounded w-fit break-words max-w-full">
                              <HashtagIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.PO_Number || "—"}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs text-gray-700 dark:text-slate-300">{item.createdAt}</td>
                        <td className="px-2 py-3 md:py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-900 dark:text-white max-w-[120px] break-words" title={item.Item_Name}>
                              <CubeIcon className="w-4 h-4 text-gray-400 shrink-0" /> <span className="line-clamp-2">{item.Item_Name}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded w-fit break-words max-w-[120px]">
                              <TagIcon className="w-3.5 h-3.5 shrink-0" /> <span className="line-clamp-2">{item.Category}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs text-gray-700 dark:text-slate-300">{item.Qty}</td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs text-gray-700 dark:text-slate-300">{item.Country || "—"}</td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs text-gray-700 dark:text-slate-300">
                          {item.Payment_Terms_In_days ? `${item.Payment_Terms_In_days} Days` : "—"}
                        </td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {item.calculatedPlannedDate}
                        </td>
                        <td className="px-2 py-3 md:py-4 text-[10px] md:text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          {item.Attach_Bill ? (
                            <a href={item.Attach_Bill} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              View Bill
                            </a>
                          ) : "—"}
                        </td>

                        {/* USER ACTION */}
                        <td className="px-2 py-3 md:py-4 text-center border-l border-gray-100 dark:border-navy-800">
                          {isPayed ? (
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-[10px] font-black uppercase tracking-widest break-words">
                                <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> Payed
                              </span>
                            </div>
                          ) : isUser ? (
                            <button
                              onClick={() => openActionModal(item.GRN_No, 'Payed')}
                              disabled={actionLoading === item.GRN_No}
                              className="px-2 py-1.5 bg-[#003875] hover:bg-[#002855] dark:bg-[#FFD500] dark:hover:bg-[#E6C000] text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded shadow-sm disabled:opacity-50 transition-all"
                            >
                              {actionLoading === item.GRN_No ? 'Updating...' : 'Mark Payed'}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 uppercase break-words">Pending</span>
                          )}
                        </td>

                        {/* USER REMARKS */}
                        <td className="px-2 py-3 md:py-4">
                          <p className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-slate-300 line-clamp-2 max-w-[100px] break-words" title={userRemarks}>{userRemarks || "—"}</p>
                        </td>

                        {/* ADMIN ACTION */}
                        <td className="px-2 py-3 md:py-4 text-center border-l border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
                          {isApproved ? (
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-widest break-words">
                                <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> Approved
                              </span>
                            </div>
                          ) : isRejected ? (
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md text-[10px] font-black uppercase tracking-widest break-words">
                                <XCircleIcon className="w-3.5 h-3.5 shrink-0" /> Rejected
                              </span>
                            </div>
                          ) : (isPayed && isAdmin) ? (
                            <div className="flex flex-col xl:flex-row items-center justify-center gap-1.5">
                              <button
                                onClick={() => openActionModal(item.GRN_No, 'Approved')}
                                disabled={actionLoading === item.GRN_No}
                                className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm disabled:opacity-50 transition-all w-full xl:w-auto"
                              >
                                {actionLoading === item.GRN_No ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => openActionModal(item.GRN_No, 'Rejected')}
                                disabled={actionLoading === item.GRN_No}
                                className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm disabled:opacity-50 transition-all w-full xl:w-auto"
                              >
                                {actionLoading === item.GRN_No ? '...' : 'Reject'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 uppercase break-words text-center block">
                              {isPayed ? 'Pending Admin' : 'Waiting for User'}
                            </span>
                          )}
                        </td>

                        {/* ADMIN REMARKS */}
                        <td className="px-2 py-3 md:py-4 bg-emerald-50/30 dark:bg-emerald-900/10">
                          <p className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-slate-300 line-clamp-2 max-w-[100px] break-words" title={adminRemarks}>{adminRemarks || "—"}</p>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-[#131C2E]">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-3 md:px-4 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 border-t border-gray-100 dark:border-navy-800 bg-white dark:bg-[#0B101E] shrink-0">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:block">
              Showing {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
            </div>

            {/* Right side: Pagination */}
            <div className="flex items-center justify-end gap-3 md:gap-4 shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}
                </p>
                <div className="flex gap-0.5">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">First</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all">Last</button>
                </div>
              </div>
              <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
              <div className="flex items-center gap-2">
                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
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
        </div>
      </div>

      {/* ─── Custom Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131C2E] w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Confirm Action
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs font-bold text-gray-600 dark:text-slate-300">
                You are about to mark GRN <span className="font-mono bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[#003875] dark:text-[#FFD500]">{modalGrnNo}</span> as <span className="font-black text-gray-900 dark:text-white uppercase">{modalActionType}</span>.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Remarks (Optional)
                </label>
                <textarea
                  autoFocus
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="Enter any remarks..."
                  className="w-full bg-gray-50 dark:bg-navy-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm font-bold text-gray-800 dark:text-white focus:border-[#FFD500] focus:ring-1 focus:ring-[#FFD500] outline-none transition-all resize-none h-24"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 dark:bg-[#0B101E]/50 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-6 py-2 text-xs font-black uppercase tracking-widest text-white rounded-lg shadow-md transition-all
                  ${modalActionType === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalActionType === 'Rejected' ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#003875] hover:bg-[#002855] dark:bg-[#FFD500] dark:hover:bg-[#E6C000] dark:text-black'}
                `}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
