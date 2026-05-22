import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FollowUp } from '@/types/sales';

interface SalesCalendarProps {
  followUps: FollowUp[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export default function SalesCalendar({ followUps, selectedDate, onSelectDate }: SalesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const highlightedDates = useMemo(() => {
    const dates = new Set<string>();
    followUps.forEach(fu => {
      if (fu.next_follow_up_date) {
        const d = new Date(fu.next_follow_up_date);
        if (!isNaN(d.getTime())) {
          dates.add(d.toISOString().split('T')[0]);
        }
      }
    });
    return dates;
  }, [followUps]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i, 12).toISOString().split('T')[0];
    const isHighlighted = highlightedDates.has(dateStr);
    const isSelected = selectedDate ? selectedDate.toISOString().split('T')[0] === dateStr : false;

    days.push(
      <button
        key={i}
        onClick={() => {
          if (isSelected) {
            onSelectDate(null); // toggle off
          } else {
            onSelectDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
          }
        }}
        className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
          isSelected
            ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md'
            : isHighlighted
            ? 'bg-orange-100 text-orange-600 dark:bg-yellow-500/20 dark:text-yellow-400 border border-orange-200 dark:border-yellow-500/50 hover:bg-orange-200'
            : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
        }`}
      >
        {i}
      </button>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-[#FFFBF0] dark:bg-navy-900 rounded-2xl p-4 shadow-sm border border-orange-100/50 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded transition-colors text-gray-500">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded transition-colors text-gray-500">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-6 flex items-center justify-center text-[8px] font-black text-gray-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 justify-items-center">
        {days}
      </div>

      <div className="mt-4 pt-4 border-t border-orange-100 dark:border-white/5 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-100 border border-orange-200 dark:bg-yellow-500/20 dark:border-yellow-500/50" />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Follow Up Scheduled</span>
        </div>
        {selectedDate && (
          <button onClick={() => onSelectDate(null)} className="text-[9px] font-bold text-[#003875] dark:text-[#FFD500] hover:underline uppercase tracking-widest ml-auto">
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
}
