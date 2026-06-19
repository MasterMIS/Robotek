"use client";

import { useState, useMemo } from "react";
import { DataFeeder } from "@/types/data-feeder";
import { useCallAnalytics, AnalyticsFilters, excelSerialToDate } from "../hooks/useCallAnalytics";
import {
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  NoSymbolIcon,
  SparklesIcon,
  MapPinIcon,
  CalendarDaysIcon,
  FunnelIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend, LabelList
} from "recharts";

export default function AnalyticsDashboard({ feeders }: { feeders: DataFeeder[] }) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: 'all',
    customStart: '',
    customEnd: '',
    week: 'all',
    month: 'all',
    employee: 'all',
    callType: 'all'
  });

  const { kpi, leaderboard, charts, heatMap, insights } = useCallAnalytics(feeders, filters);

  const uniqueEmployees = useMemo(() => Array.from(new Set(feeders.map(f => f.employeeName).filter(Boolean))), [feeders]);
  
  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    feeders.forEach(f => {
      const d = excelSerialToDate(f.callDate);
      if (d) set.add(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().substring(2)}`);
    });
    return Array.from(set);
  }, [feeders]);

  const uniqueWeeks = useMemo(() => {
    const set = new Set<string>();
    feeders.forEach(f => {
      const d = excelSerialToDate(f.callDate);
      if (d) {
        const d0 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = d0.getUTCDay() || 7;
        d0.setUTCDate(d0.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d0.getUTCFullYear(),0,1));
        const w = Math.ceil((((d0.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
        set.add(`Week ${w} ${d.getFullYear().toString().substring(2)}`);
      }
    });
    return Array.from(set);
  }, [feeders]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      
      {/* 1. Filters Sidebar */}
      <div className="w-full xl:w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm sticky top-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
          <FunnelIcon className="w-5 h-5 text-blue-500" />
          Filters
        </h3>

        <div className="space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Date Range</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
                { id: 'all', label: 'All Time' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilters(f => ({ ...f, dateRange: opt.id as any }))}
                  className={`text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${filters.dateRange === opt.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filters.dateRange === 'custom' && (
              <div className="mt-3 flex flex-col gap-2">
                <input type="date" value={filters.customStart || ''} onChange={e => setFilters(f => ({...f, customStart: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="date" value={filters.customEnd || ''} onChange={e => setFilters(f => ({...f, customEnd: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          {/* Month */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Month</label>
            <select 
              value={filters.month}
              onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Week */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Week</label>
            <select 
              value={filters.week}
              onChange={(e) => setFilters(f => ({ ...f, week: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Weeks</option>
              {uniqueWeeks.map((w, i) => <option key={i} value={w}>{w}</option>)}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Employee</label>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Call Type</label>
            <select 
              value={filters.callType}
              onChange={(e) => setFilters(f => ({ ...f, callType: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Incoming">Incoming</option>
              <option value="Outgoing">Outgoing</option>
              <option value="Missed">Missed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* Smart Insights (AI Style) */}
        {insights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <SparklesIcon className="w-32 h-32" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10 text-blue-100">
              <SparklesIcon className="w-5 h-5 text-yellow-300" />
              AI Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {insights.map((msg, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-start gap-3">
                  <p className="text-sm font-bold text-white leading-relaxed">{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Executive Overview (Top Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard title="Total Calls" value={kpi.totalCalls.toLocaleString()} icon={<PhoneIcon />} color="text-blue-500" bg="bg-blue-500/10" glowColor="blue" />
          <KPICard title="Talk Time (Hrs)" value={kpi.totalDurationHours.toLocaleString()} icon={<ClockIcon />} color="text-emerald-500" bg="bg-emerald-500/10" glowColor="emerald" />
          <KPICard title="Avg Duration" value={kpi.avgDurationStr} icon={<ArrowTrendingUpIcon />} color="text-purple-500" bg="bg-purple-500/10" glowColor="purple" />
          <KPICard title="Active Staff" value={kpi.activeEmployees} icon={<UserGroupIcon />} color="text-orange-500" bg="bg-orange-500/10" glowColor="orange" />
          <KPICard title="Customers" value={kpi.uniqueCustomers.toLocaleString()} icon={<MapPinIcon />} color="text-pink-500" bg="bg-pink-500/10" glowColor="pink" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incoming</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">{kpi.incomingPct}%</h4>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outgoing</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">{kpi.outgoingPct}%</h4>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Missed</p>
            <h4 className="text-xl font-black text-rose-600 mt-1">{kpi.missedPct}%</h4>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calls Today</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">{kpi.callsToday}</h4>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Peak Hour</p>
            <h4 className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-1">{kpi.peakHour}</h4>
          </div>
        </div>

        {/* 3. Daily Trend & Call Types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="relative lg:col-span-2 p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-[-1]"></div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
              <CalendarDaysIcon className="w-5 h-5 text-blue-500" />
              Daily Trend Analysis
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyTrends.slice(-12)} margin={{ right: 30, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Area type="monotone" dataKey="incoming" name="Incoming" stroke="#3B82F6" fillOpacity={0} strokeWidth={2.5}>
                    <LabelList dataKey="incoming" position="top" fill="#3B82F6" fontSize={10} fontWeight="bold" />
                  </Area>
                  <Area type="monotone" dataKey="outgoing" name="Outgoing" stroke="#10B981" fillOpacity={0} strokeWidth={2.5}>
                    <LabelList dataKey="outgoing" position="top" fill="#10B981" fontSize={10} fontWeight="bold" />
                  </Area>
                  <Area type="monotone" dataKey="missed" name="Missed" stroke="#EF4444" fillOpacity={0} strokeWidth={2.5}>
                    <LabelList dataKey="missed" position="top" fill="#EF4444" fontSize={10} fontWeight="bold" />
                  </Area>
                  <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#F59E0B" fillOpacity={0} strokeWidth={2.5}>
                    <LabelList dataKey="rejected" position="top" fill="#F59E0B" fontSize={10} fontWeight="bold" />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16 z-[-1]"></div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-2">
              <PieChartIcon className="w-5 h-5 text-purple-500" />
              Call Type Analysis
            </h3>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.callTypes} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {charts.callTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{kpi.totalCalls}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Time Intelligence Analysis (Hourly Heatmap) */}
        <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[100px] z-[-1]"></div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
            <ClockIcon className="w-5 h-5 text-orange-500" />
            Time Intelligence Analysis (Hourly Heatmap)
          </h3>
          <div className="overflow-x-auto pb-4 relative z-10">
            <div className="min-w-[600px]">
              {/* Header Days */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-4">Hour</div>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">{day}</div>
                ))}
              </div>
              {/* Grid Body */}
              <div className="flex flex-col gap-1">
                {heatMap.map((dayArray, hourIndex) => {
                  // Company hours constraint: 9:00 AM to 6:00 PM (9 to 18 inclusive)
                  if (hourIndex < 9 || hourIndex > 18) return null;

                  const formatHr = hourIndex === 0 ? '12 AM' : hourIndex < 12 ? `${hourIndex} AM` : hourIndex === 12 ? '12 PM' : `${hourIndex-12} PM`;
                  
                  // Find max value in entire matrix for color scaling
                  const maxVal = Math.max(...heatMap.flat()) || 1;

                  return (
                    <div key={hourIndex} className="grid grid-cols-8 gap-1 items-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-4">{formatHr}</div>
                      {dayArray.map((val, dIdx) => {
                        const intensity = val / maxVal;
                        let bgClass = "bg-slate-100 dark:bg-slate-800";
                        if (intensity > 0) bgClass = "bg-blue-100 dark:bg-blue-900/30";
                        if (intensity > 0.2) bgClass = "bg-blue-300 dark:bg-blue-700/50";
                        if (intensity > 0.5) bgClass = "bg-blue-500 dark:bg-blue-600";
                        if (intensity > 0.8) bgClass = "bg-blue-700 dark:bg-blue-500";
                        
                        return (
                          <div key={dIdx} className={`h-8 rounded-md flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${bgClass}`} title={`${val} calls`}>
                            {val > 0 && <span className={`text-[9px] font-black ${intensity > 0.5 ? 'text-white' : 'text-blue-900 dark:text-blue-200'}`}>{val}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Employee Performance Leaderboard */}
        <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/5 dark:bg-yellow-500/10 rounded-full blur-3xl -mr-32 -mt-32 z-[-1]"></div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
            <StarIcon className="w-5 h-5 text-yellow-500" />
            Employee Performance Leaderboard
          </h3>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-l-xl">Rank</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Employee</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Calls</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Talk Time</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Avg Duration</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right text-rose-500">Missed</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right rounded-r-xl">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-black text-slate-400">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">{emp.name.charAt(0)}</div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{emp.calls}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{Math.round(emp.duration/3600)} hrs</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{emp.avgDurStr}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-rose-500">{emp.missed}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex gap-0.5 text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} className={`w-3 h-3 ${i < emp.stars ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} />
                          ))}
                        </div>
                        <span className="text-[9px] font-black text-slate-500 mt-0.5">{emp.score} PTS</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5.5 Customer / Target Performance Table */}
        <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 z-[-1]"></div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
            <MapPinIcon className="w-5 h-5 text-emerald-500" />
            Target Customer Analysis
          </h3>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-l-xl">Rank</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Customer / Target</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Total Calls</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Talk Time</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center text-blue-500">Incoming</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center text-emerald-500">Outgoing</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center text-rose-500 rounded-r-xl">Missed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {charts.topCustomers.map((tgt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-black text-slate-400">#{idx + 1}</td>
                    <td className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white">{tgt.name}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{tgt.calls}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{tgt.durationStr}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-500">{tgt.incoming}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-emerald-500">{tgt.outgoing}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-rose-500">{tgt.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Call Duration Intelligence & Country/Customer Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mb-16 z-[-1]"></div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
              <ClockIcon className="w-5 h-5 text-indigo-500" />
              Call Duration Intelligence
            </h3>
            <div className="h-64 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.durationBuckets} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="calls" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-4 text-center">
              Short calls (&lt;30s) may indicate wrong numbers. Long calls (15m+) indicate deep engagement.
            </p>
          </div>

          <div className="relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden z-0">
            <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mt-16 z-[-1]"></div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
              <MapPinIcon className="w-5 h-5 text-emerald-500" />
              Top Customers & Regions
            </h3>
            
            <div className="space-y-6 relative z-10">
              {/* Country Map */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Country Distribution</p>
                <div className="space-y-2">
                  {charts.countryDistribution.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12">{c.code}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.percent}%` }}></div>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white w-8 text-right">{c.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Customers */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Most Contacted</p>
                <div className="space-y-3">
                  {charts.topCustomers.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate pr-2">{c.name}</span>
                      <div className="flex gap-4 text-right">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{c.calls} calls</span>
                        <span className="text-[10px] font-bold text-slate-500 w-16">{c.durationStr}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponents
function KPICard({ title, value, icon, color, bg, glowColor }: { title: string, value: string | number, icon: any, color: string, bg: string, glowColor: string }) {
  return (
    <div className="relative p-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center transition-all hover:shadow-md overflow-hidden z-0">
      <div className={`absolute -top-10 -right-10 w-28 h-28 bg-${glowColor}-500/10 rounded-full blur-2xl z-[-1]`}></div>
      <div className={`absolute -bottom-10 -left-10 w-28 h-28 bg-${glowColor}-500/10 rounded-full blur-2xl z-[-1]`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
          <div className="w-5 h-5">{icon}</div>
        </div>
      </div>
      <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight relative z-10">{value}</h4>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 relative z-10">{title}</p>
    </div>
  );
}

function PieChartIcon({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
    </svg>
  );
}
