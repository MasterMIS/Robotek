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
  CubeIcon
} from "@heroicons/react/24/outline";
import IMSMaster from "./IMSMaster";
import IMSFloor from "./IMSFloor";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function IMSHub() {
  const [activeLocation, setActiveLocation] = useState<"master" | "1st" | "g" | null>(null);
  
  const { data: summary, isLoading } = useSWR(activeLocation === null ? "/api/ims/summary" : null, fetcher);

  if (activeLocation === "master") {
    return <IMSMaster onBack={() => setActiveLocation(null)} />;
  }

  if (activeLocation === "1st" || activeLocation === "g") {
    return <IMSFloor location={activeLocation} onBack={() => setActiveLocation(null)} />;
  }

  const renderTile = (id: "master" | "1st" | "g", title: string, subtitle: string, icon: React.ReactNode, data: any) => {
    return (
      <div 
        onClick={() => setActiveLocation(id)}
        className="relative bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-xl shadow-gray-200/40 dark:shadow-none hover:shadow-2xl hover:shadow-[#003875]/15 dark:hover:shadow-[#FFD500]/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col justify-between overflow-hidden border border-gray-100 dark:border-white/5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-[#1f2937]/50 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-transparent dark:from-[#FFD500]/10 dark:to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        
        <div className="relative flex items-start justify-between mb-10 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/5 group-hover:from-[#003875] group-hover:to-blue-800 dark:group-hover:from-[#FFD500] dark:group-hover:to-yellow-500 rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md">
              <div className="text-gray-400 group-hover:text-white dark:text-gray-300 dark:group-hover:text-[#003875] w-8 h-8 transition-colors duration-300">
                {icon}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors">{title}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="relative space-y-4 animate-pulse z-10">
            <div className="h-16 bg-gray-200 dark:bg-white/5 rounded-2xl w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 dark:bg-white/5 rounded-2xl w-full"></div>
              <div className="h-16 bg-gray-200 dark:bg-white/5 rounded-2xl w-full"></div>
            </div>
          </div>
        ) : (
          <div className="relative space-y-4 z-10">
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-transparent rounded-2xl p-4 border border-gray-100 dark:border-white/5 group-hover:border-blue-100 dark:group-hover:border-[#FFD500]/20 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <ScaleIcon className="w-4 h-4 text-gray-400 group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors"/> Live Stock
                </span>
              </div>
              <div className={`text-4xl font-black tracking-tighter ${data.liveStock < 0 ? 'text-rose-500' : 'text-[#003875] dark:text-white group-hover:text-[#003875] dark:group-hover:text-[#FFD500]'} transition-colors`}>
                {data.liveStock.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl p-4 border border-emerald-100/50 dark:border-emerald-500/10 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingUpIcon className="w-3.5 h-3.5"/> In
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {data.totalIn.toLocaleString()}
                </div>
              </div>
              <div className="bg-rose-50/30 dark:bg-rose-500/5 rounded-2xl p-4 border border-rose-100/50 dark:border-rose-500/10 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingDownIcon className="w-3.5 h-3.5"/> Out
                  </span>
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {data.totalOut.toLocaleString()}
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-[#003875] dark:text-[#FFD500]" />
            IMS Dashboard Hub
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-xl">
            Select an inventory management system location to view detailed stock metrics, manage inward/outward flow, and generate reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderTile(
            "master", 
            "Master IMS", 
            "Main Warehouse & Operations", 
            <CubeIcon />, 
            summary?.main
          )}
          {renderTile(
            "1st", 
            "IMS - 1st Floor", 
            "First Floor Storage", 
            <BuildingStorefrontIcon />, 
            summary?.first
          )}
          {renderTile(
            "g", 
            "IMS - G Floor", 
            "Ground Floor Storage", 
            <BuildingOfficeIcon />, 
            summary?.g
          )}
        </div>
      </div>
    </div>
  );
}
