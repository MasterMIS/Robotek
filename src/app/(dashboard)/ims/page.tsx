"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { 
  ClipboardDocumentListIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  ScaleIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  InformationCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import IMSMaster from "./IMSMaster";
import IMSFloor from "./IMSFloor";
import IMSFinal from "./IMSFinal";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ImsLocation = "master" | "1st" | "g" | "final";

const IMS_CALC_INFO: Record<ImsLocation, {
  title: string;
  formula: string;
  inSource: string;
  inHow: string;
  outSource: string;
  outHow: string;
  liveHow: string;
}> = {
  master: {
    title: "Master IMS",
    formula: "Live Stock = IN − OUT",
    inSource: "GRN Sheet (Goods Receipt Note)",
    inHow: "Sum of GRN Qty for items that match the Master IMS catalog (item name match). Cancelled and Rejected GRN rows are excluded.",
    outSource: "O2D Out Form sheet",
    outHow: "Sum of Out Form quantities for line items whose names match the Master IMS catalog.",
    liveHow: "For each catalog item: IN − OUT, then summed across all Master items.",
  },
  "1st": {
    title: "IMS - 1st Floor",
    formula: "Live Stock = IN − OUT",
    inSource: "IMS-1st Floor Google Sheet (in_qty column)",
    inHow: "Sum of every row’s in_qty from the 1st Floor IMS sheet.",
    outSource: "IMS-1st Floor Google Sheet (out_qty column)",
    outHow: "Sum of every row’s out_qty from the 1st Floor IMS sheet.",
    liveHow: "For each sheet row: in_qty − out_qty, then summed across all rows.",
  },
  g: {
    title: "IMS - G Floor",
    formula: "Live Stock = IN − OUT",
    inSource: "IMS-G Floor Google Sheet (in_qty column)",
    inHow: "Sum of every row’s in_qty from the G Floor IMS sheet.",
    outSource: "IMS-G Floor sheet (out_qty) + O2D Out Form",
    outHow: "Sum of sheet out_qty, plus all Out Form line-item quantities (appended on top of sheet OUT).",
    liveHow: "Floor (IN − OUT from sheet), then minus the Out Form total added to OUT.",
  },
  final: {
    title: "Final IMS",
    formula: "Total of Master + 1st Floor + G Floor",
    inSource: "Combined from Master, 1st Floor, and G Floor",
    inHow: "Master IN + 1st Floor IN + G Floor IN.",
    outSource: "Combined from Master, 1st Floor, and G Floor",
    outHow: "Master OUT + 1st Floor OUT + G Floor OUT.",
    liveHow: "Master Live Stock + 1st Floor Live Stock + G Floor Live Stock.",
  },
};

const formatMetric = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const getLiveStockFontClass = (value: number) => {
  const length = formatMetric(value).length;
  if (length > 13) return "text-lg sm:text-xl";
  if (length > 10) return "text-2xl sm:text-3xl";
  if (length > 8) return "text-3xl";
  return "text-4xl";
};

const getInOutFontClass = (value: number) => {
  const length = formatMetric(value).length;
  if (length > 12) return "text-[10px] sm:text-xs";
  if (length > 10) return "text-xs sm:text-sm";
  if (length > 8) return "text-sm sm:text-base";
  return "text-lg sm:text-xl";
};

export default function IMSHub() {
  const [activeLocation, setActiveLocation] = useState<ImsLocation | null>(null);
  const [infoLocation, setInfoLocation] = useState<ImsLocation | null>(null);
  
  const { data: summary, isLoading } = useSWR(activeLocation === null ? "/api/ims/summary" : null, fetcher);

  if (activeLocation === "master") {
    return <IMSMaster onBack={() => setActiveLocation(null)} />;
  }

  if (activeLocation === "1st" || activeLocation === "g") {
    return <IMSFloor location={activeLocation} onBack={() => setActiveLocation(null)} />;
  }

  if (activeLocation === "final") {
    return <IMSFinal onBack={() => setActiveLocation(null)} />;
  }

  const finalData = summary ? {
    liveStock: (summary.main?.liveStock || 0) + (summary.first?.liveStock || 0) + (summary.g?.liveStock || 0),
    totalIn: (summary.main?.totalIn || 0) + (summary.first?.totalIn || 0) + (summary.g?.totalIn || 0),
    totalOut: (summary.main?.totalOut || 0) + (summary.first?.totalOut || 0) + (summary.g?.totalOut || 0),
  } : undefined;

  const renderTile = (
    id: ImsLocation, 
    title: string, 
    subtitle: string, 
    icon: React.ReactNode, 
    data: any,
    gradient: string,
    shadow: string
  ) => {
    return (
      <div 
        onClick={() => setActiveLocation(id)}
        className={`relative rounded-3xl p-6 shadow-xl ${shadow} transition-all duration-300 group flex flex-col justify-between border border-white/10 ${gradient} hover:shadow-2xl hover:-translate-y-2 cursor-pointer`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>

        <button
          type="button"
          title="How IN / OUT are calculated"
          onClick={(e) => {
            e.stopPropagation();
            setInfoLocation(id);
          }}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/15 hover:bg-white/30 border border-white/25 text-white transition-colors"
        >
          <InformationCircleIcon className="w-5 h-5" />
        </button>
        
        <div className="relative mb-10 z-10 pr-8">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md shrink-0">
              <div className="text-white w-7 h-7 transition-colors duration-300">
                {icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base lg:text-lg xl:text-xl font-black text-white uppercase tracking-tight leading-snug transition-colors">
                {title}
              </h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1 leading-snug">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="relative space-y-4 animate-pulse z-10">
            <div className="h-16 bg-white/20 rounded-2xl w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-white/20 rounded-2xl w-full"></div>
              <div className="h-16 bg-white/20 rounded-2xl w-full"></div>
            </div>
          </div>
        ) : (
          <div className="relative space-y-4 z-10 min-w-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-colors shadow-sm min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                  <ScaleIcon className="w-4 h-4 text-white/80"/> Live Stock
                </span>
              </div>
              <div
                className={`${getLiveStockFontClass(data.liveStock)} font-black tracking-tight leading-none break-words [overflow-wrap:anywhere] ${data.liveStock < 0 ? "text-rose-300" : "text-white"} transition-colors`}
                title={formatMetric(data.liveStock)}
              >
                {formatMetric(data.liveStock)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 transition-colors min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0"/> In
                  </span>
                </div>
                <div
                  className={`${getInOutFontClass(data.totalIn)} font-black text-white leading-none break-words [overflow-wrap:anywhere]`}
                  title={formatMetric(data.totalIn)}
                >
                  {formatMetric(data.totalIn)}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 transition-colors min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingDownIcon className="w-3.5 h-3.5 shrink-0"/> Out
                  </span>
                </div>
                <div
                  className={`${getInOutFontClass(data.totalOut)} font-black text-white leading-none break-words [overflow-wrap:anywhere]`}
                  title={formatMetric(data.totalOut)}
                >
                  {formatMetric(data.totalOut)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1c] p-6">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-[#003875] dark:text-[#FFD500]" />
            IMS Dashboard Hub
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-xl">
            Select an inventory management system location to view detailed stock metrics, manage inward/outward flow, and generate reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderTile(
            "master", 
            "Master IMS", 
            "Main Warehouse & Operations", 
            <CubeIcon />, 
            summary?.main,
            "bg-gradient-to-br from-blue-600 to-indigo-800",
            "shadow-blue-900/20"
          )}
          {renderTile(
            "1st", 
            "IMS - 1st Floor", 
            "First Floor Storage", 
            <BuildingStorefrontIcon />, 
            summary?.first,
            "bg-gradient-to-br from-purple-600 to-fuchsia-800",
            "shadow-purple-900/20"
          )}
          {renderTile(
            "g", 
            "IMS - G Floor", 
            "Ground Floor Storage", 
            <BuildingOfficeIcon />, 
            summary?.g,
            "bg-gradient-to-br from-emerald-600 to-teal-800",
            "shadow-emerald-900/20"
          )}
          {renderTile(
            "final",
            "Final IMS",
            "Total Storage Overview",
            <ClipboardDocumentListIcon />,
            finalData,
            "bg-gradient-to-br from-orange-500 to-amber-700",
            "shadow-orange-900/20"
          )}
        </div>

        {infoLocation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setInfoLocation(null)}
          >
            <div
              className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-[#003875]">
                <div className="flex items-center gap-2 min-w-0">
                  <InformationCircleIcon className="w-5 h-5 text-[#FFD500] shrink-0" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest truncate">
                    {IMS_CALC_INFO[infoLocation].title} — Calculation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoLocation(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Formula</p>
                  <p className="text-sm font-black text-[#003875] dark:text-[#FFD500]">{IMS_CALC_INFO[infoLocation].formula}</p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" />
                      <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">IN</p>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data Source</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">{IMS_CALC_INFO[infoLocation].inSource}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">How Calculated</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{IMS_CALC_INFO[infoLocation].inHow}</p>
                  </div>

                  <div className="rounded-2xl border border-rose-100 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowTrendingDownIcon className="w-4 h-4 text-rose-600" />
                      <p className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">OUT</p>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data Source</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">{IMS_CALC_INFO[infoLocation].outSource}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">How Calculated</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{IMS_CALC_INFO[infoLocation].outHow}</p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ScaleIcon className="w-4 h-4 text-blue-600" />
                      <p className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Live Stock</p>
                    </div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{IMS_CALC_INFO[infoLocation].liveHow}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
