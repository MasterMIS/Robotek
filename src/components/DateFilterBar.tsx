import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';

export type FilterPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

interface DateFilterBarProps {
  period: FilterPeriod;
  setPeriod: (p: FilterPeriod) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  startDate: Date | null;
  setStartDate: (d: Date | null) => void;
  endDate: Date | null;
  setEndDate: (d: Date | null) => void;
  theme?: 'blue' | 'orange' | 'purple' | 'emerald';
}

export default function DateFilterBar({
  period,
  setPeriod,
  currentDate,
  setCurrentDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  theme = 'blue'
}: DateFilterBarProps) {
  
  const periods: FilterPeriod[] = ['DAY', 'WEEK', 'MONTH', 'QUARTERLY', 'YEARLY'];

  const handlePrev = () => {
    switch (period) {
      case 'DAY': setCurrentDate(sub(currentDate, { days: 1 })); break;
      case 'WEEK': setCurrentDate(sub(currentDate, { weeks: 1 })); break;
      case 'MONTH': setCurrentDate(sub(currentDate, { months: 1 })); break;
      case 'QUARTERLY': setCurrentDate(sub(currentDate, { months: 3 })); break;
      case 'YEARLY': setCurrentDate(sub(currentDate, { years: 1 })); break;
    }
  };

  const handleNext = () => {
    switch (period) {
      case 'DAY': setCurrentDate(add(currentDate, { days: 1 })); break;
      case 'WEEK': setCurrentDate(add(currentDate, { weeks: 1 })); break;
      case 'MONTH': setCurrentDate(add(currentDate, { months: 1 })); break;
      case 'QUARTERLY': setCurrentDate(add(currentDate, { months: 3 })); break;
      case 'YEARLY': setCurrentDate(add(currentDate, { years: 1 })); break;
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'DAY': return format(currentDate, 'dd MMM yyyy').toUpperCase();
      case 'WEEK': {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`.toUpperCase();
      }
      case 'MONTH': return format(currentDate, 'MMM yyyy').toUpperCase();
      case 'QUARTERLY': return `Q${format(currentDate, 'q')} ${format(currentDate, 'yyyy')}`.toUpperCase();
      case 'YEARLY': return format(currentDate, 'yyyy').toUpperCase();
      case 'CUSTOM': return 'CUSTOM RANGE';
    }
  };

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setPeriod('CUSTOM');
      setStartDate(new Date(e.target.value));
    }
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setPeriod('CUSTOM');
      setEndDate(new Date(e.target.value));
    }
  };

  const clearCustom = () => {
    setPeriod('MONTH');
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl shadow-sm overflow-x-auto custom-scrollbar shrink-0 z-10 relative">
      {/* Period Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              if (p !== 'CUSTOM') {
                setStartDate(null);
                setEndDate(null);
              }
            }}
            className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${
              period === p
                ? (theme === 'orange' ? 'bg-orange-500 text-white shadow-md' : 
                   theme === 'purple' ? 'bg-purple-600 text-white shadow-md' :
                   theme === 'emerald' ? 'bg-emerald-600 text-white shadow-md' :
                   theme === 'blue' ? 'bg-blue-600 text-white shadow-md' :
                   'bg-[#00a86b] text-white shadow-md')
                : (theme === 'orange' ? 'bg-white text-orange-600 border border-gray-200 hover:bg-orange-50' : 
                   theme === 'purple' ? 'bg-white text-purple-600 border border-gray-200 hover:bg-purple-50' :
                   theme === 'emerald' ? 'bg-white text-emerald-600 border border-gray-200 hover:bg-emerald-50' :
                   theme === 'blue' ? 'bg-white text-blue-600 border border-gray-200 hover:bg-blue-50' :
                   'bg-white text-[#003875] border border-gray-200 hover:bg-gray-50')
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Navigation Controls (Hidden in Custom Mode) */}
      {period !== 'CUSTOM' && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-1 shrink-0 min-w-[200px] justify-between">
          <button 
            onClick={handlePrev}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              theme === 'orange' ? 'text-orange-600' : 
              theme === 'purple' ? 'text-purple-600' :
              theme === 'emerald' ? 'text-emerald-600' :
              'text-[#003875]'
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          
          <span className={`text-[11px] font-black uppercase tracking-widest px-2 whitespace-nowrap ${
            theme === 'orange' ? 'text-orange-600' : 
            theme === 'purple' ? 'text-purple-600' :
            theme === 'emerald' ? 'text-emerald-600' :
            theme === 'blue' ? 'text-blue-600' :
            'text-[#003875]'
          }`}>
            {getPeriodLabel()}
          </span>

          <button 
            onClick={handleNext}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              theme === 'orange' ? 'text-orange-600' : 
              theme === 'purple' ? 'text-purple-600' :
              theme === 'emerald' ? 'text-emerald-600' :
              'text-[#003875]'
            }`}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Date Range */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shrink-0 ${
        period === 'CUSTOM' 
          ? (theme === 'orange' ? 'border-orange-500 bg-orange-50' : 
             theme === 'purple' ? 'border-purple-600 bg-purple-50' :
             theme === 'emerald' ? 'border-emerald-600 bg-emerald-50' :
             theme === 'blue' ? 'border-blue-600 bg-blue-50' :
             'border-[#00a86b] bg-[#00a86b]/5')
          : 'border-gray-200 bg-white'
      }`}>
        <div className={`flex items-center gap-2 ${
          theme === 'orange' ? 'text-orange-600' : 
          theme === 'purple' ? 'text-purple-600' :
          theme === 'emerald' ? 'text-emerald-600' :
          'text-[#003875]'
        }`}>
          <CalendarDaysIcon className="w-4 h-4" />
          <input 
            type="date" 
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleCustomStartChange}
            className="bg-transparent text-[11px] font-black outline-none uppercase cursor-pointer"
          />
        </div>
        <span className="text-[10px] font-black text-gray-400 tracking-widest">TO</span>
        <div className={`flex items-center gap-2 ${
          theme === 'orange' ? 'text-orange-600' : 
          theme === 'purple' ? 'text-purple-600' :
          theme === 'emerald' ? 'text-emerald-600' :
          'text-[#003875]'
        }`}>
          <input 
            type="date" 
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleCustomEndChange}
            className="bg-transparent text-[11px] font-black outline-none uppercase cursor-pointer"
          />
          <CalendarDaysIcon className="w-4 h-4" />
        </div>
        {period === 'CUSTOM' && (
          <button onClick={clearCustom} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors ml-1">
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
