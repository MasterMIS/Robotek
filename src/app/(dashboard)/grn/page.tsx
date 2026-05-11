"use client";

import React from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function GRNPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-2 py-0.5 shrink-0">
        <div>
          <h1 className="text-xl font-black text-[#003875] dark:text-white tracking-tight">GRN Management</h1>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">GOODS RECEIPT NOTE — INCOMING SHIPMENTS</p>
        </div>
      </div>

      {/* ─── Placeholder Content ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-[#003875]/5 dark:bg-[#FFD500]/5 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-[#003875]/10 dark:border-[#FFD500]/20 shadow-xl rotate-3">
          <ArrowDownTrayIcon className="w-12 h-12 text-[#003875] dark:text-[#FFD500]" />
        </div>
        
        <div className="space-y-4 max-w-lg">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
            GRN Module <span className="text-[#003875] dark:text-[#FFD500]">Initialized</span>
          </h2>
          
          <div className="h-1 w-20 bg-[#FFD500] mx-auto rounded-full" />
          
          <p className="text-gray-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
            Welcome to the Goods Receipt Note management system. This page has been prepared for implementation.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-6 bg-white dark:bg-navy-800 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm text-left group hover:border-[#003875] dark:hover:border-[#FFD500] transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 text-[#003875] dark:text-blue-400 font-black">1</div>
              <h3 className="font-black text-[12px] uppercase tracking-wider mb-2 dark:text-white">Awaiting logic</h3>
              <p className="text-[11px] font-bold text-gray-400 leading-tight">Specify the data fields and workflow steps needed for GRN processing.</p>
            </div>
            
            <div className="p-6 bg-white dark:bg-navy-800 rounded-3xl border border-slate-100 dark:border-navy-700 shadow-sm text-left group hover:border-[#003875] dark:hover:border-[#FFD500] transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400 font-black">2</div>
              <h3 className="font-black text-[12px] uppercase tracking-wider mb-2 dark:text-white">Integration</h3>
              <p className="text-[11px] font-bold text-gray-400 leading-tight">Ready to be linked with I2R, IMS, or other warehouse modules.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
