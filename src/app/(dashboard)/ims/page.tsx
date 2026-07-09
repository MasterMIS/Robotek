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
import IMSFinal from "./IMSFinal";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function IMSHub() {
  const [activeLocation, setActiveLocation] = useState<"master" | "1st" | "g" | "final" | null>(null);
  
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
    id: "master" | "1st" | "g" | "final", 
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
        className={`relative rounded-3xl p-6 shadow-xl ${shadow} transition-all duration-300 group flex flex-col justify-between overflow-hidden border border-white/10 ${gradient} hover:shadow-2xl hover:-translate-y-2 cursor-pointer`}
      >
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        
        <div className="relative flex items-start justify-between mb-10 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md">
              <div className="text-white w-8 h-8 transition-colors duration-300">
                {icon}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight transition-colors">{title}</h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">{subtitle}</p>
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
          <div className="relative space-y-4 z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                  <ScaleIcon className="w-4 h-4 text-white/80"/> Live Stock
                </span>
              </div>
              <div className={`text-4xl font-black tracking-tighter ${data.liveStock < 0 ? 'text-rose-300' : 'text-white'} transition-colors`}>
                {data.liveStock.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingUpIcon className="w-3.5 h-3.5"/> In
                  </span>
                </div>
                <div className="text-xl font-black text-white">
                  {data.totalIn.toLocaleString()}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowTrendingDownIcon className="w-3.5 h-3.5"/> Out
                  </span>
                </div>
                <div className="text-xl font-black text-white">
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
      </div>
    </div>
  );
}
