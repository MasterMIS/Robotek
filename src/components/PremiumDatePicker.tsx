"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon 
} from "@heroicons/react/24/outline";

interface PremiumDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
}

export default function PremiumDatePicker({ value, onChange, label }: PremiumDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse initial date
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setViewDate(d);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = newDate.toISOString().split('T')[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const numDays = daysInMonth(currentYear, currentMonth);
  const firstDay = firstDayOfMonth(currentYear, currentMonth);

  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
          {label}
        </label>
      )}
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus-within:border-[#FFD500] cursor-pointer flex items-center justify-between group transition-all shadow-sm"
      >
        <span className="font-bold text-xs text-gray-800 dark:text-zinc-100">
          {value ? new Date(value).toLocaleDateString('en-GB') : "Select Date"}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 group-hover:text-[#CE2029] dark:group-hover:text-[#FFD500] transition-colors" />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            ref={containerRef}
            className="relative bg-white dark:bg-navy-900 border border-orange-100 dark:border-navy-700 rounded-2xl shadow-2xl p-4 w-full max-w-[320px] animate-in fade-in zoom-in duration-200"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-all"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                <button 
                  type="button"
                  onClick={() => {
                    setShowMonthPicker(!showMonthPicker);
                    setShowYearPicker(false);
                  }}
                  className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/5 px-2 py-1 rounded-md transition-all"
                >
                  {monthNames[currentMonth]}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                  className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/5 px-2 py-1 rounded-md transition-all"
                >
                  {currentYear}
                </button>
              </div>
              <button 
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-all"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Month/Year Selection Overlays */}
            {showMonthPicker && (
              <div className="absolute inset-x-4 top-16 bottom-4 bg-white dark:bg-navy-900 z-10 grid grid-cols-3 gap-2 overflow-y-auto p-1">
                {monthNames.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(currentYear, i, 1));
                      setShowMonthPicker(false);
                    }}
                    className={`text-[9px] font-black uppercase p-2 rounded-lg transition-all ${i === currentMonth ? 'bg-[#CE2029] text-white' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500'}`}
                  >
                    {name.substring(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {showYearPicker && (
              <div className="absolute inset-x-4 top-16 bottom-4 bg-white dark:bg-navy-900 z-10 grid grid-cols-3 gap-2 overflow-y-auto p-1 custom-scrollbar">
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 80 + i).map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(year, currentMonth, 1));
                      setShowYearPicker(false);
                    }}
                    className={`text-[10px] font-bold p-2 rounded-lg transition-all ${year === currentYear ? 'bg-[#FFD500] text-black' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                <div key={day} className="text-center text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map(b => (
                <div key={`blank-${b}`} className="h-8" />
              ))}
              {days.map(d => {
                const isSelected = selectedDate?.getDate() === d && 
                                 selectedDate?.getMonth() === currentMonth && 
                                 selectedDate?.getFullYear() === currentYear;
                const isToday = new Date().getDate() === d && 
                               new Date().getMonth() === currentMonth && 
                               new Date().getFullYear() === currentYear;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDateSelect(d)}
                    className={`
                      h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                      ${isSelected 
                        ? "bg-[#CE2029] text-white shadow-lg scale-105" 
                        : isToday 
                          ? "bg-[#FFD500]/20 text-[#CE2029] dark:text-[#FFD500] border border-[#FFD500]/30" 
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5"
                      }
                    `}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Quick Shortcuts */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  onChange(today);
                  setIsOpen(false);
                }}
                className="text-[9px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest hover:underline"
              >
                Today
              </button>
              <button 
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:underline text-right"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
