/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  SquareCheck, 
  Check,
  Play, 
  ArrowRight, 
  AlertCircle, 
  Plus, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Film, 
  Tv, 
  Gamepad, 
  Music, 
  Radio, 
  Compass, 
  Search, 
  FolderPlus, 
  Calendar,
  X,
  HelpCircle,
  Clock,
  Square,
  Activity,
  Users
} from 'lucide-react';
import { MediaItem, MediaType, MEDIA_TYPE_LABELS } from '../types';

interface WishlistSectionProps {
  mediaItems: MediaItem[];
  onUpdateItem: (item: MediaItem) => void;
  onAddItem: (title: string, type: MediaType, month: string) => void;
  onMoveUnfinished: (fromMonth: string) => void;
  darkMode: boolean;
  onSelectItem?: (id: string) => void;
}

export default function WishlistSection({
  mediaItems,
  onUpdateItem,
  onAddItem,
  onMoveUnfinished,
  darkMode,
  onSelectItem,
}: WishlistSectionProps) {
  // Helper to get current month: e.g. "2026-07"
  const getCurrentMonthStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  // Helper to get next month relative to a month string
  const getNextMonthStr = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    return `${nextY}-${nextM}`;
  };

  // Setup the month keys
  const currentMonthStr = getCurrentMonthStr();
  const nextMonthStr = getNextMonthStr(currentMonthStr);

  // Get past months dynamically based on existing planned items that are older than current month
  const getPastMonths = () => {
    const allMonths = Array.from(new Set(mediaItems
      .map(item => item.wishlistMonth)
      .filter((m): m is string => !!m)
    ));
    const past = allMonths
      .filter(m => m < currentMonthStr)
      .sort((a, b) => b.localeCompare(a)); // Descending order (newest past month first)

    // Ensure we have at least one previous month (e.g. current month - 1) even if no items exist, for presentation
    if (past.length === 0) {
      const [y, m] = currentMonthStr.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
      past.push(`${prevY}-${prevM}`);
    }
    return past;
  };

  const pastMonths = getPastMonths();

  // Collapsible state for each month. Default current to true (open), others to false (collapsed)
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthStr]: true,
  });

  const toggleMonthExpansion = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  // Active Category & Month being target of popup quick add
  const [addingToTarget, setAddingToTarget] = useState<{ type: MediaType; month: string } | null>(null);
  const [newQuickItemTitle, setNewQuickItemTitle] = useState('');
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  // Month-specific active import drawer target
  const [activeImportMonth, setActiveImportMonth] = useState<string | null>(null);
  const [importSearch, setImportSearch] = useState('');

  // Local state for typed fields in inline add forms
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<MediaType>('book');

  // Custom states for editing companion records without modal
  const [editingCompanionItem, setEditingCompanionItem] = useState<MediaItem | null>(null);
  const [compPerson, setCompPerson] = useState('');
  const [compLocation, setCompLocation] = useState('');
  const [compExperience, setCompExperience] = useState('');

  React.useEffect(() => {
    if (editingCompanionItem) {
      setCompPerson(editingCompanionItem.watchedWith || '');
      setCompLocation(editingCompanionItem.watchedWithLocation || '');
      setCompExperience(editingCompanionItem.watchedWithExperience || '');
    }
  }, [editingCompanionItem]);

  const categories: MediaType[] = ['book', 'movie', 'tv', 'anime', 'music', 'game', 'other'];

  const categoryIcons: Record<MediaType, React.ReactNode> = {
    book: <BookOpen size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    movie: <Film size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    tv: <Tv size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    anime: <Sparkles size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    music: <Music size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    game: <Gamepad size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
    other: <Radio size={13} className="text-[#4A3B32] dark:text-[#DDDAC4]" />,
  };

  const saveCompanion = (item: MediaItem) => {
    onUpdateItem({
      ...item,
      watchedWith: compPerson || undefined,
      watchedWithLocation: compLocation || undefined,
      watchedWithExperience: compExperience || undefined,
      updatedAt: new Date().toISOString()
    });
    setEditingCompanionItem(null);
  };

  const handlePopupQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickItemTitle.trim() || !addingToTarget) return;
    onAddItem(newQuickItemTitle.trim(), addingToTarget.type, addingToTarget.month);
    setNewQuickItemTitle('');
    setAddingToTarget(null); // Close popup modal
  };

  const handlePopupImportItem = (item: MediaItem) => {
    if (!addingToTarget) return;
    onUpdateItem({
      ...item,
      wishlistMonth: addingToTarget.month,
      status: item.status || 'wishlist',
      updatedAt: new Date().toISOString()
    });
    setAddingToTarget(null); // Close popup
  };

  // Helper to convert date format to nice Chinese month (七月清单, 八月清单, etc.)
  const formatChineseMonth = (mStr: string) => {
    const [_, m] = mStr.split('-');
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    const index = parseInt(m, 10) - 1;
    return index >= 0 && index < 12 ? `${months[index]}清单` : '月度清单';
  };

  const isEndOfMonth = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() === lastDay;
  };

  const handleQuickAdd = (e: React.FormEvent, targetMonth: string) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddItem(quickTitle.trim(), quickType, targetMonth);
    setQuickTitle('');
  };

  const handleImportItem = (item: MediaItem, targetMonth: string) => {
    onUpdateItem({
      ...item,
      wishlistMonth: targetMonth,
      status: 'wishlist',
      updatedAt: new Date().toISOString()
    });
  };

  // Filter candidates for popup import (items of the correct type not already in the target month)
  const popupCandidates = addingToTarget 
    ? mediaItems.filter(item => item.type === addingToTarget.type && item.wishlistMonth !== addingToTarget.month)
    : [];

  const popupUnfinished = popupCandidates.filter(item => item.status !== 'completed');
  const popupCompleted = popupCandidates.filter(item => item.status === 'completed');

  // RENDER A SINGLE MONTHLY BOARD
  const renderMonthBoard = (monthStr: string, labelType: 'current' | 'next' | 'past') => {
    const isExpanded = !!expandedMonths[monthStr];
    
    // Filter items in this month's plans
    const plannedItems = mediaItems.filter(item => item.wishlistMonth === monthStr);
    const unfinishedItems = plannedItems.filter(item => item.status === 'wishlist' || item.status === 'progress');
    const completedItems = plannedItems.filter(item => item.status === 'completed');

    // Filter items importable to this month
    const importableItems = mediaItems.filter(item => {
      if (item.wishlistMonth === monthStr) return false;
      if (importSearch.trim() !== '') {
        return (
          item.title.toLowerCase().includes(importSearch.toLowerCase()) ||
          item.creator.toLowerCase().includes(importSearch.toLowerCase())
        );
      }
      return true;
    });

    const isCurrentMonth = monthStr === currentMonthStr;
    const showSupervision = isEndOfMonth() && isCurrentMonth && unfinishedItems.length > 0;
    const nextMonthLabel = formatChineseMonth(getNextMonthStr(monthStr));

    return (
      <div 
        key={monthStr}
        className={`border transition-all duration-300 rounded-none mb-6 ${
          darkMode 
            ? 'bg-[#191b1e] border-[#2d3137]' 
            : 'bg-white border-[#E6E0D5] shadow-sm'
        }`}
      >
            {/* Header Bar */}
        <div 
          onClick={() => toggleMonthExpansion(monthStr)}
          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-bold tracking-tight uppercase text-zinc-800 dark:text-zinc-100 flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-xl font-bold text-[#4A3B32] dark:text-[#DDDAC4] leading-none">
                  {formatChineseMonth(monthStr)}
                </span>
                
                {labelType === 'current' && (
                  <span className="font-serif font-bold text-xs px-2.5 py-0.5 text-amber-700 dark:text-amber-400">
                    本月清单
                  </span>
                )}
                {labelType === 'next' && (
                  <span className="font-serif font-bold text-xs px-2.5 py-0.5 text-zinc-650 dark:text-zinc-300">
                    下月计划
                  </span>
                )}
                {labelType === 'past' && (
                  <span className="font-serif font-bold text-xs px-2.5 py-0.5 text-zinc-400 dark:text-zinc-500">
                    往期存档
                  </span>
                )}

                {plannedItems.length > 0 && (
                  <span className="text-xs font-serif font-bold text-zinc-500 dark:text-zinc-400">
                    {completedItems.length}/{plannedItems.length}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => toggleMonthExpansion(monthStr)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-[#E6E0D5] dark:border-[#2D3137] pt-5 space-y-5 animate-fade-in">
            
            {/* Supervision Warning Banner */}
            {showSupervision && (
              <div className="p-4 rounded-none bg-[#FAF8F5] dark:bg-[#111214]/60 border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={15} className="text-[#635C56] dark:text-[#C5C0AA] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-serif font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300">计划顺延归档</span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-serif">
                      当前仍有 <strong className="text-zinc-800 dark:text-zinc-100 font-bold">{unfinishedItems.length}</strong> 个未完成目标，是否需要顺延至下月？
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onMoveUnfinished(monthStr)}
                  className="self-end sm:self-auto px-4 py-2 bg-[#4A3B32] hover:bg-[#382B24] dark:bg-[#DDDAC4] dark:hover:bg-white text-[#FBF9F3] dark:text-[#111214] font-bold rounded-none text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>顺延至 {formatChineseMonth(getNextMonthStr(monthStr))}</span>
                  <ArrowRight size={11} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* MAIN TO DO LIST BOARDS BY CATEGORIES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...categories]
                .sort((a, b) => {
                  const aCount = plannedItems.filter(i => i.type === a).length;
                  const bCount = plannedItems.filter(i => i.type === b).length;
                  if (aCount > 0 && bCount === 0) return -1;
                  if (aCount === 0 && bCount > 0) return 1;
                  return 0;
                })
                .map(type => {
                const typeUnfinished = unfinishedItems.filter(item => item.type === type);
                const typeFinished = completedItems.filter(item => item.type === type);
                const hasItems = typeUnfinished.length > 0 || typeFinished.length > 0;
                
                return (
                  <div 
                    key={type} 
                    className="relative rounded-none border border-[#E6E0D5] dark:border-[#2D3137] bg-white dark:bg-[#191b1e] flex flex-col justify-between shadow-none min-h-[250px]"
                  >
                    {/* Category Header */}
                    <div>
                      <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] dark:bg-[#15171a] border-b border-[#E6E0D5] dark:border-[#2D3137]">
                        <div className="flex items-center gap-2">
                          {categoryIcons[type]}
                          <span className="text-[13px] font-serif font-bold tracking-wider text-[#4A3B32] dark:text-zinc-200">
                            {MEDIA_TYPE_LABELS[type]}
                          </span>
                        </div>
                        <span className={`text-[10px] font-serif font-bold tracking-wider ${
                          typeFinished.length === (typeUnfinished.length + typeFinished.length) && (typeUnfinished.length + typeFinished.length) > 0
                            ? 'text-emerald-500' 
                            : 'text-zinc-400'
                        }`}>
                          (
                          <span className={typeFinished.length > 0 && typeFinished.length < (typeUnfinished.length + typeFinished.length) ? 'text-emerald-500' : ''}>
                            {typeFinished.length}
                          </span>
                          /{typeUnfinished.length + typeFinished.length})
                        </span>
                      </div>

                      {/* TO DO LIST ITEM STACKS */}
                      <div className="p-3.5 space-y-2">
                        {hasItems ? (
                          <>
                            {/* Unfinished List */}
                            {typeUnfinished.map(item => (
                              <div 
                                key={item.id}
                                onClick={() => onSelectItem && onSelectItem(item.id)}
                                className="group flex items-center justify-between gap-3 p-2.5 bg-[#FAF8F5] dark:bg-[#111214]/60 border border-[#E6E0D5] dark:border-[#2D3137] hover:border-[#4A3B32] dark:hover:border-zinc-400 transition-all text-xs cursor-pointer"
                                title="点击查看媒体详情"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                                  {item.status === 'progress' ? (
                                    <div className="relative group/tooltip shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUpdateItem({
                                            ...item,
                                            status: 'completed',
                                            completedDate: new Date().toISOString().split('T')[0],
                                            updatedAt: new Date().toISOString()
                                          });
                                        }}
                                        className="relative flex items-center justify-center w-4 h-4 shrink-0 cursor-pointer group/dot"
                                      >
                                        <motion.div 
                                          animate={{ 
                                            scale: [1, 1.5, 1],
                                            opacity: [0.2, 0.4, 0.2]
                                          }}
                                          transition={{ 
                                            repeat: Infinity, 
                                            duration: 2.5, 
                                            ease: "easeInOut" 
                                          }}
                                          className="absolute w-full h-full bg-amber-500 rounded-full group-hover/dot:bg-emerald-500" 
                                        />
                                        <motion.div 
                                          animate={{ 
                                            scale: [0.9, 1.1, 0.9],
                                          }}
                                          transition={{ 
                                            repeat: Infinity, 
                                            duration: 2.5, 
                                            ease: "easeInOut" 
                                          }}
                                          className="relative w-2 h-2 bg-amber-500 rounded-full group-hover/dot:bg-emerald-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                                        />
                                      </button>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                        进行中... 点击标记已完成
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative group/tooltip shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUpdateItem({
                                            ...item,
                                            status: 'completed',
                                            completedDate: new Date().toISOString().split('T')[0],
                                            updatedAt: new Date().toISOString()
                                          });
                                        }}
                                        className="text-zinc-400 dark:text-zinc-600 hover:text-emerald-600 transition-colors cursor-pointer"
                                      >
                                        <Square size={16} />
                                      </button>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                        点击标记已完成
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col min-w-0 flex-grow py-0.5 justify-center">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span 
                                        className={`text-[12px] font-semibold transition-all truncate leading-none ${
                                          item.status === 'progress' 
                                            ? 'text-amber-700 dark:text-amber-400 font-bold' 
                                            : 'text-[#2B1E19] dark:text-zinc-100'
                                        }`}
                                      >
                                        {item.title}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {item.status === 'wishlist' && (
                                  <div className="relative group/tooltip">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`确定要将 "${item.title}" 顺延至下个月吗？`)) {
                                          onUpdateItem({
                                            ...item,
                                            wishlistMonth: getNextMonthStr(monthStr),
                                            updatedAt: new Date().toISOString()
                                          });
                                        }
                                      }}
                                      className="p-1.5 border border-[#E6E0D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-none transition-all cursor-pointer"
                                    >
                                      <ArrowRight size={12} />
                                    </button>
                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                      挪到下月
                                    </div>
                                  </div>
                                )}
                                {item.status === 'progress' ? (
                                  <div className="relative group/tooltip">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateItem({
                                          ...item,
                                          status: 'wishlist',
                                          updatedAt: new Date().toISOString()
                                        });
                                      }}
                                      className="p-1.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-none transition-all cursor-pointer"
                                    >
                                      <Clock size={12} />
                                    </button>
                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                      撤销进行中状态
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative group/tooltip">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateItem({
                                          ...item,
                                          status: 'progress',
                                          startDate: new Date().toISOString().split('T')[0],
                                          updatedAt: new Date().toISOString()
                                        });
                                      }}
                                      className="p-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-350 rounded-none transition-all cursor-pointer"
                                    >
                                      <Play size={12} />
                                    </button>
                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                      设为进行中
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Default state companion icon - Non-clickable marker */}
                              {(item.watchedWith || item.watchedWithLocation) && (
                                <div className="shrink-0 mr-1.5 opacity-60">
                                  <Users size={11} className="text-emerald-500 drop-shadow-[0_0_2px_rgba(16,185,129,0.3)]" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Completed List */}
                        {typeFinished.map(item => (
                              <div 
                                key={item.id}
                                onClick={() => onSelectItem && onSelectItem(item.id)}
                                className="group/fin group flex items-center justify-between gap-2.5 p-2 bg-white dark:bg-[#111214]/30 border border-dashed border-[#E6E0D5] dark:border-zinc-850 text-xs cursor-pointer hover:border-[#4A3B32] dark:hover:border-zinc-400 transition-all"
                                title="点击查看媒体详情"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                                  <div className="relative group/tooltip shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateItem({
                                          ...item,
                                          status: 'wishlist',
                                          completedDate: undefined,
                                          updatedAt: new Date().toISOString()
                                        });
                                      }}
                                      className="p-0 text-emerald-600 dark:text-emerald-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                                    >
                                      <Check size={16} strokeWidth={3} className="text-emerald-500" />
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-serif font-semibold py-1 px-2 whitespace-nowrap shadow-lg z-50 pointer-events-none rounded-none border border-zinc-800 dark:border-zinc-700">
                                      撤销完成状态
                                    </div>
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-grow py-0.5 justify-center">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="line-through truncate text-zinc-400 dark:text-zinc-500 font-medium text-[11px]">
                                        {item.title}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Default state icon for finished list - Non-clickable marker */}
                                  {(item.watchedWith || item.watchedWithLocation) && (
                                    <div className="shrink-0 mr-1.5 opacity-40">
                                      <Users size={10} className="text-zinc-400 dark:text-zinc-650" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-center py-10 border border-dashed border-[#E6E0D5]/60 dark:border-zinc-800/80 bg-[#FAF8F5]/30 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 rounded-none">
                            <span className="text-xs font-serif uppercase tracking-wider block font-bold">暂无规划</span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">点击下方录入清单目标</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Popover Picker for Adding Item */}
                    {addingToTarget?.type === type && addingToTarget?.month === monthStr && (
                      <div className="absolute inset-x-0 bottom-0 top-[45px] z-20 bg-[#FCFAF7] dark:bg-[#191b1e] border-t border-[#4A3B32] dark:border-[#DDDAC4] shadow-xl animate-in slide-in-from-bottom-2 duration-200 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-[#E6E0D5] dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#111214]">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 font-serif">
                            添加至 {MEDIA_TYPE_LABELS[type]}
                          </span>
                          <button onClick={() => setAddingToTarget(null)} className="text-zinc-400 hover:text-red-500 cursor-pointer">
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto flex-grow bg-white/50 dark:bg-transparent">
                          {/* Quick Create */}
                          <form onSubmit={handlePopupQuickAdd} className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                required
                                placeholder="New title..."
                                value={newQuickItemTitle}
                                onChange={(e) => setNewQuickItemTitle(e.target.value)}
                                className="flex-grow text-xs bg-white dark:bg-zinc-950 border border-[#E6E0D5] dark:border-zinc-800 rounded-none px-2.5 py-2 text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-[#4A3B32]"
                              />
                              <button type="submit" className="px-3 py-2 bg-[#4A3B32] dark:bg-[#DDDAC4] text-white dark:text-[#111214] font-serif font-bold text-[11px] uppercase cursor-pointer">
                                + 新增 / NEW
                              </button>
                            </div>
                          </form>

                          {/* Library Selection */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-serif block">从库中选择</span>
                            
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {popupCandidates.length > 0 ? (
                                popupCandidates.slice(0, 10).map(item => (
                                  <div key={item.id} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-2 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 group/picker-item">
                                    <div className="flex items-center gap-2 flex-grow min-w-0">
                                      <span 
                                        onClick={() => onSelectItem && onSelectItem(item.id)}
                                        className="font-bold truncate dark:text-zinc-200 cursor-pointer hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] hover:underline decoration-1 underline-offset-2"
                                        title="查看该库中项目详情"
                                      >
                                        {item.title}
                                      </span>
                                      {item.status === 'completed' && (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 font-bold uppercase tracking-tighter shrink-0">已阅</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handlePopupImportItem(item)}
                                      className="px-2 py-1 bg-zinc-50 dark:bg-[#111214] border border-zinc-200 dark:border-zinc-800 text-[10px] font-serif font-bold uppercase cursor-pointer hover:bg-[#4A3B32] hover:text-white dark:hover:bg-[#DDDAC4] dark:hover:text-[#111214] shrink-0"
                                      title={item.status === 'completed' ? '重新开始重温' : '加入清单'}
                                    >
                                      {item.status === 'completed' ? '+ RE-READ' : '+ ADD'}
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-zinc-400 italic text-center py-2">库中没有找到其他项目。</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add action trigger at the bottom of the card */}
                    <div className="p-3.5 border-t border-[#E6E0D5]/60 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/10 text-center">
                      <button
                        onClick={() => {
                          setAddingToTarget({ type, month: monthStr });
                          setNewQuickItemTitle('');
                          setCompletedCollapsed(true);
                        }}
                        className="text-xs font-serif font-bold tracking-widest text-[#756256] hover:text-[#4A3B32] dark:text-zinc-400 dark:hover:text-white uppercase inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={11} />
                        <span>添加至 {MEDIA_TYPE_LABELS[type]}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. CURRENT MONTH TARGETS (PINNED) */}
      {renderMonthBoard(currentMonthStr, 'current')}

      {/* 2. NEXT MONTH TARGETS */}
      {renderMonthBoard(nextMonthStr, 'next')}

      {/* 3. DIVIDING LINE FOR FINISHED ARCHIVES */}
      <div className="pt-8 pb-4 flex items-center gap-4">
        <div className="h-px bg-[#E6E0D5] dark:bg-[#2D3137] flex-grow" />
        <span className="text-2xl font-serif italic text-[#4A3B32] dark:text-[#DDDAC4] uppercase tracking-widest px-2 font-bold">
          历史归档
        </span>
        <div className="h-px bg-[#E6E0D5] dark:bg-[#2D3137] flex-grow" />
      </div>

      {/* 4. PREVIOUS TARGETS (ARCHIVED) */}
      <div className="space-y-4">
        {pastMonths.map(month => renderMonthBoard(month, 'past'))}
      </div>

      <AnimatePresence>
        {editingCompanionItem && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-5 bg-white dark:bg-[#191b1e] border-2 border-[#4A3B32] dark:border-[#DDDAC4] space-y-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#2B1E19] dark:text-zinc-100 font-serif flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-500" />
                  <span>登记一同信息</span>
                </h4>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-serif">
                    与谁一同
                  </label>
                  <input
                    type="text"
                    placeholder="备注一同伙伴..."
                    value={compPerson}
                    onChange={(e) => setCompPerson(e.target.value)}
                    className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-serif">
                    何处一同
                  </label>
                  <input
                    type="text"
                    placeholder="地点/场合..."
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                    className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-serif">
                    一同体验 / 感受
                  </label>
                  <textarea
                    placeholder="评价本次一同体验..."
                    value={compExperience}
                    onChange={(e) => setCompExperience(e.target.value)}
                    rows={2}
                    className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setEditingCompanionItem(null)}
                  className="px-3 py-1.5 text-[10px] text-zinc-500 hover:text-[#4A3B32] font-bold uppercase transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateItem({
                      ...editingCompanionItem,
                      watchedWith: compPerson.trim() || undefined,
                      watchedWithLocation: compLocation.trim() || undefined,
                      watchedWithExperience: compExperience.trim() || undefined,
                      updatedAt: new Date().toISOString()
                    });
                    setEditingCompanionItem(null);
                  }}
                  className="px-4 py-1.5 bg-[#4A3B32] dark:bg-[#DDDAC4] text-white dark:text-[#111214] text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  保存登记
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
