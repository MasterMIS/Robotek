"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  UserGroupIcon, 
  BriefcaseIcon, 
  BanknotesIcon, 
  UserPlusIcon 
} from "@heroicons/react/24/outline";

export default function HRMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Recruitment", href: "/hrms/recruitment", icon: BriefcaseIcon },
    { name: "Candidate", href: "/hrms/candidate", icon: UserGroupIcon },
    { name: "Sales", href: "/hrms/sales", icon: BanknotesIcon },
    { name: "Onboard", href: "/hrms/onboard", icon: UserPlusIcon },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <div className="flex items-center justify-between px-2 py-0.5 shrink-0 mb-1 border-b border-slate-100 dark:border-navy-800 pb-2">
        <div>
          <h1 className="text-xl font-black text-[#003875] dark:text-white tracking-tight">HRMS Dashboard</h1>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">HUMAN RESOURCE MANAGEMENT SYSTEM</p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-navy-900 rounded-full border border-slate-200 dark:border-navy-700 shadow-sm p-1">
          {tabs.map((tab) => {
            const isActive = pathname.includes(tab.href);
            const Icon = tab.icon;
            return (
              <Link 
                key={tab.name} 
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${isActive ? "bg-[#003875] text-[#FFD500] shadow-md" : "text-slate-500 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800"}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[11px] font-black uppercase tracking-widest">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </div>
  );
}
