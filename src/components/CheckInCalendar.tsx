/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, SquareCheck, Trophy, Award, Sparkles, Smile, Clock, Book, Film, Tv, Music, Gamepad, Compass, Ghost, Check } from 'lucide-react';
import { CheckInHabit, CheckInLog, MediaItem, MediaType, MEDIA_TYPE_LABELS } from '../types';
import { calculateStreak } from '../utils/helpers';
import { motion, AnimatePresence } from 'motion/react';

interface CheckInCalendarProps {
  habits: CheckInHabit[];
  checkInLogs: CheckInLog[];
  mediaItems: MediaItem[];
  onToggleCheckIn: (date: string, habitId: string) => void;
}

export default function CheckInCalendar({
  habits,
  checkInLogs,
  mediaItems,
  onToggleCheckIn,
}: CheckInCalendarProps) {
  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  })();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(habits[0]?.id || 'book');

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getLocalDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'book': return <Book size={14} />;
      case 'movie': return <Film size={14} />;
      case 'tv': return <Tv size={14} />;
      case 'anime': return <Ghost size={14} />;
      case 'music': return <Music size={14} />;
      case 'game': return <Gamepad size={14} />;
      default: return <Smile size={14} />;
    }
  };

  const getCompletedItemsForDate = (date: string, type: string | null) => {
    if (!type) return [];
    return mediaItems.filter(item => 
      item.status === 'completed' && 
      item.completedDate === date && 
      item.type === type
    );
  };

  const selectedDayItems = getCompletedItemsForDate(selectedDate, activeHabitId);
  const isSelectedChecked = checkInLogs.some(l => l.date === selectedDate && l.habitId === activeHabitId);

  const annualDays = (() => {
    const days: Array<{ dateStr: string; count: number }> = [];
    const baseDate = new Date(year, 0, 1);
    for (let i = 0; i < 365; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        dateStr: dStr,
        count: checkInLogs.filter(l => l.date === dStr).length,
      });
    }
    return days;
  })();

  const totalLogsCount = checkInLogs.length;
  const overallStreak = calculateStreak(checkInLogs);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Monthly Calendar Board - Left (Now Expanded) */}
        <div className="lg:col-span-9 bg-white dark:bg-[#191b1e] border border-[#E6E0D5] dark:border-[#2d3137] rounded-none p-6 sm:p-10 animate-fade-in shadow-sm">
          <div className="flex items-end justify-between mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] leading-none mb-2">Monthly Archive</span>
              <h2 className="text-3xl font-serif font-bold text-[#4A3B32] dark:text-[#DDDAC4] uppercase tracking-tight flex items-center gap-3 leading-none">
                {year} / {monthNames[month]}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#FAF8F5]/80 dark:bg-zinc-900/40 p-1 rounded-sm">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-[#4A3B32]/5 dark:hover:bg-[#DDDAC4]/10 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer rounded-sm">
                  <ChevronLeft size={18} />
                </button>
                <div className="h-4 w-px bg-[#E6E0D5]/60 dark:bg-zinc-800 mx-1" />
                <button onClick={handleNextMonth} className="p-2 hover:bg-[#4A3B32]/5 dark:hover:bg-[#DDDAC4]/10 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer rounded-sm">
                  <ChevronRight size={18} />
                </button>
              </div>
              
              <button 
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#4A3B32] dark:text-[#DDDAC4] bg-[#4A3B32]/5 dark:bg-[#DDDAC4]/5 hover:bg-[#4A3B32]/10 dark:hover:bg-[#DDDAC4]/10 transition-colors cursor-pointer border border-[#4A3B32]/15 dark:border-[#DDDAC4]/15 rounded-sm"
              >
                回到今日
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 py-3 font-mono border-b border-zinc-50 dark:border-zinc-900 mb-2">{day}</div>
            ))}
            
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`prev-${idx}`} className="p-2 min-h-[80px] opacity-10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = getLocalDateStr(year, month, dayNum);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`border transition-all p-3 min-h-[90px] flex flex-col justify-between relative group cursor-pointer ${
                    isSelected 
                      ? 'border-[#4A3B32] dark:border-[#DDDAC4] bg-[#4A3B32]/5 dark:bg-[#DDDAC4]/10 ring-1 ring-inset ring-[#4A3B32] dark:ring-[#DDDAC4] z-10' 
                      : isToday 
                        ? 'border-emerald-500/60 dark:border-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-500/5' 
                        : 'border-[#E6E0D5] dark:border-[#2d3137] bg-white dark:bg-zinc-900/20 hover:border-[#4A3B32]/40 dark:hover:border-[#DDDAC4]/40'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`text-xs font-mono ${isSelected ? 'font-black text-[#4A3B32] dark:text-[#DDDAC4]' : isToday ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'opacity-60 font-medium'}`}>{dayNum}</span>
                    {isToday && (
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {habits.map(habit => {
                      const hasLog = checkInLogs.some(l => l.date === dateStr && l.habitId === habit.id);
                      if (!hasLog) return null;
                      
                      const colors: Record<string, string> = {
                        'book': 'bg-blue-500 dark:bg-blue-400',
                        'movie': 'bg-amber-500 dark:bg-amber-400',
                        'tv': 'bg-rose-500 dark:bg-rose-400',
                        'game': 'bg-purple-500 dark:bg-purple-400',
                        'music': 'bg-emerald-500 dark:bg-emerald-400',
                        'anime': 'bg-indigo-500 dark:bg-indigo-400'
                      };
                      
                      return (
                        <div 
                          key={habit.id} 
                          className={`w-1.5 h-1.5 rounded-full shadow-sm ${colors[habit.id] || 'bg-zinc-500'}`} 
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Side Controls - Right */}
        <div className="lg:col-span-3 bg-white dark:bg-[#191b1e] border border-[#E6E0D5] dark:border-[#2d3137] rounded-none p-6 animate-fade-in shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-3 h-full">
            <div className="px-1 pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <span className="text-sm font-bold uppercase tracking-wider text-[#4A3B32] dark:text-[#DDDAC4] font-serif">Category Check-In</span>
            </div>
            
            <div className="flex flex-col gap-2.5 pt-1 flex-grow justify-around">
              {habits.map(habit => {
                const targetDateStr = selectedDate || todayStr;
                const isCheckedOnTarget = checkInLogs.some(l => l.date === targetDateStr && l.habitId === habit.id);
                const isFuture = new Date(targetDateStr) > new Date(todayStr);
                
                const colors: Record<string, string> = {
                  'book': 'bg-blue-500',
                  'movie': 'bg-amber-500',
                  'tv': 'bg-rose-500',
                  'game': 'bg-purple-500',
                  'music': 'bg-emerald-500',
                  'anime': 'bg-indigo-500'
                };

                const isActive = activeHabitId === habit.id;
                
                // Visual states for active and checked
                const isSelectedAndChecked = isActive && isCheckedOnTarget;
                const isSelectedAndUnchecked = isActive && !isCheckedOnTarget;
                const isUnselectedAndChecked = !isActive && isCheckedOnTarget;
                
                let buttonStyle = '';
                if (isSelectedAndChecked) {
                  buttonStyle = 'border-[#4A3B32] dark:border-[#DDDAC4] bg-[#4A3B32] text-white dark:bg-[#DDDAC4] dark:text-[#111214] shadow-md font-bold';
                } else if (isSelectedAndUnchecked) {
                  buttonStyle = 'border-[#4A3B32] dark:border-[#DDDAC4] bg-transparent text-[#4A3B32] dark:text-[#DDDAC4] font-bold shadow-sm';
                } else if (isUnselectedAndChecked) {
                  buttonStyle = 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400';
                } else {
                  buttonStyle = 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 text-zinc-600 dark:text-zinc-400 hover:border-[#4A3B32] dark:hover:border-[#DDDAC4]';
                }

                return (
                  <button
                    key={habit.id}
                    onClick={() => {
                      if (!isFuture) {
                        onToggleCheckIn(targetDateStr, habit.id);
                        if (isCheckedOnTarget) {
                          setActiveHabitId(null);
                        } else {
                          setActiveHabitId(habit.id);
                        }
                      }
                    }}
                    disabled={isFuture}
                    className={`group w-full p-3.5 flex items-center justify-between border transition-all cursor-pointer rounded-sm ${buttonStyle} ${isFuture ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-sm transition-colors ${isActive ? (isSelectedAndChecked ? 'bg-white/10' : 'bg-[#4A3B32]/10 dark:bg-[#DDDAC4]/15') : 'bg-zinc-50 dark:bg-zinc-950 group-hover:bg-[#4A3B32]/5'}`}>
                        {getTypeIcon(habit.id)}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold font-serif leading-tight">{habit.name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${colors[habit.id] || 'bg-zinc-400'}`} />
                          <span className="text-[9px] font-mono opacity-60 uppercase tracking-tight">Archives: {checkInLogs.filter(l => l.habitId === habit.id).length}</span>
                        </div>
                      </div>
                    </div>
                    {isCheckedOnTarget && (
                      <div className={`w-6 h-6 flex items-center justify-center transition-all ${isSelectedAndChecked ? 'text-white' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        <Check size={20} strokeWidth={4.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
