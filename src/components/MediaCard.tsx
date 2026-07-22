/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, Star, X, Activity, SquareCheck, Check, Book, Film, Tv, Music, Gamepad, Ghost, Sparkles, Users, Plus, Play, Square, CheckCheck } from 'lucide-react';
import { MediaItem, MediaType, MEDIA_TYPE_LABELS } from '../types';
import { generateSvgCover, deduplicateLogs } from '../utils/helpers';

interface MediaCardProps {
  key?: React.Key;
  item: MediaItem;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, itemId: string) => void;
  onQuickRate?: (itemId: string, rating: number) => void;
  onStatusChange?: (itemId: string, newStatus: MediaItem['status'] | undefined, extraFields?: Partial<MediaItem>) => void;
}

export default function MediaCard({ item, onClick, onContextMenu, onStatusChange }: MediaCardProps) {
  const typeLabel = MEDIA_TYPE_LABELS[item.type];

  const isLiked = item.personalRating >= 8; // rating >= 8 is recommended

  const aspectClass = 'aspect-[3/4]';

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'book': return <Book size={12} className="stroke-[2.5]" />;
      case 'movie': return <Film size={12} className="stroke-[2.5]" />;
      case 'tv': return <Tv size={12} className="stroke-[2.5]" />;
      case 'music': return <Music size={12} className="stroke-[2.5]" />;
      case 'game': return <Gamepad size={12} className="stroke-[2.5]" />;
      case 'anime': return <Ghost size={12} className="stroke-[2.5]" />;
      case 'other': return <Sparkles size={12} className="stroke-[2.5]" />;
      default: return null;
    }
  };

  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => onContextMenu?.(e, item.id)}
      id={`media-card-${item.id}`}
      className="group relative w-full rounded-none border border-[#E6E0D5] dark:border-[#2d3137] hover:border-[#4A3B32] dark:hover:border-[#e3e4e6] bg-white dark:bg-[#191b1e] transition-all duration-300 cursor-pointer break-inside-avoid inline-block mb-0 animate-fade-in shadow-sm hover:shadow-md z-10 hover:z-50"
    >
      {/* Cover Container */}
      <div className={`relative ${aspectClass} w-full`}>
        {/* Image wrapper with overflow hidden for zoom effect */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={item.coverUrl || generateSvgCover(item.title, item.creator || '佚名', item.type)}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            onError={(e) => {
              e.currentTarget.src = generateSvgCover(item.title, item.creator || '佚名', item.type);
            }}
          />
        </div>

        {/* Subtle, highly premium top gradient vignette to support floating badges */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none z-10" />

        {/* Tall, super-smooth seamless vignette gradient overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent p-4 pt-24 flex flex-col justify-end text-white select-none">
          {/* Title */}
          <h4 className="text-white font-bold text-[13px] line-clamp-1 leading-snug tracking-tight font-serif">
            {item.title}
          </h4>

          {/* Creator & Media Type Icon */}
          <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-400">
            <span className="line-clamp-1 max-w-[80%] opacity-80 font-medium tracking-tight text-[12px]">
              {item.creator || '佚名'}
            </span>
            <span className="shrink-0 flex items-center gap-2">
              {(item.watchedWith || item.watchedWithLocation) && (
                <div className="relative group/user-tooltip">
                  <Users size={12} className="text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)] cursor-help" />
                  <div className="absolute bottom-full right-0 mb-3 hidden group-hover/user-tooltip:flex flex-col z-[9999] bg-zinc-900/95 border border-zinc-800 text-white rounded-none p-3 text-[11px] w-64 shadow-2xl pointer-events-none transition-all animate-fade-in font-sans origin-bottom-right">
                    <div className="font-bold text-emerald-400 border-b border-zinc-800 pb-1.5 mb-1.5 font-serif flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <Users size={12} />
                      <span>一同 / TOGETHER</span>
                    </div>
                    <div className="space-y-1.5">
                      {item.watchedWith && (
                        <p className="text-zinc-300 font-serif leading-relaxed text-[10px] break-words whitespace-normal flex items-start gap-1.5">
                          <span className="text-zinc-500 shrink-0">与谁一同:</span>
                          <span className="text-zinc-300 font-bold">{item.watchedWith}</span>
                        </p>
                      )}
                      {item.watchedWithLocation && (
                        <p className="text-zinc-300 font-serif leading-relaxed text-[10px] break-words whitespace-normal flex items-start gap-1.5">
                          <span className="text-zinc-500 shrink-0">何处一同:</span>
                          <span className="text-zinc-300">{item.watchedWithLocation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <span className="text-zinc-400/60 group-hover:text-zinc-300 transition-colors">
                {getTypeIcon(item.type)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Status Badge */}
      <div 
        className="absolute top-3 left-3 z-45"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-col items-center w-7">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            title={
              item.status === 'wishlist' ? '想看 (点击可取消/修改)' :
              item.status === 'progress' ? '在看 (点击可取消/修改)' :
              item.status === 'completed' ? '已看 (点击可取消/修改)' :
              '快速标记状态'
            }
            className="w-7 h-7 flex items-center justify-center hover:scale-110 cursor-pointer bg-transparent border-none outline-none select-none transition-transform duration-200"
          >
            {item.status === 'wishlist' && (
              <Bookmark size={15} strokeWidth={2.5} className="text-sky-500 dark:text-sky-400 fill-sky-500/10 filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]" />
            )}
            {item.status === 'progress' && (
              <div className="relative flex items-center justify-center w-4 h-4 shrink-0 filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
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
                  className="absolute w-full h-full rounded-full bg-amber-500 dark:bg-amber-400" 
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
                  className="relative w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                />
              </div>
            )}
            {item.status === 'completed' && (
              <CheckCheck size={16} strokeWidth={3} className="text-emerald-500 dark:text-emerald-450 filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]" />
            )}
            {!item.status && (
              <Plus size={16} strokeWidth={2.5} className={`text-zinc-300 dark:text-zinc-450 hover:text-white dark:hover:text-white filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)] transition-transform duration-200 ${showStatusMenu ? 'rotate-45' : ''}`} />
            )}
          </button>

          <AnimatePresence>
            {showStatusMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1.5 left-0 w-7 flex flex-col items-center gap-1.5 bg-transparent p-0 border-none shadow-none z-[100]"
              >
                {/* Option 1: 加入清单 - 默认本月 */}
                <button
                  onClick={() => {
                    if (item.status === 'wishlist') {
                      onStatusChange?.(item.id, undefined);
                    } else {
                      const currentMonthStr = new Date().toISOString().substring(0, 7);
                      onStatusChange?.(item.id, 'wishlist', { wishlistMonth: item.wishlistMonth || currentMonthStr });
                    }
                    setShowStatusMenu(false);
                  }}
                  title={item.status === 'wishlist' ? "取消想看清单" : "标记为想看清单 (本月)"}
                  className={`w-7 h-7 flex items-center justify-center transition-all duration-200 cursor-pointer filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] hover:scale-125 ${
                    item.status === 'wishlist'
                      ? 'text-sky-400 scale-110'
                      : 'text-zinc-300 hover:text-sky-400'
                  }`}
                >
                  <Bookmark size={14} strokeWidth={3} fill={item.status === 'wishlist' ? 'currentColor' : 'none'} />
                </button>

                {/* Option 2: 进行中 */}
                <button
                  onClick={() => {
                    if (item.status === 'progress') {
                      onStatusChange?.(item.id, undefined);
                    } else {
                      onStatusChange?.(item.id, 'progress', { startDate: item.startDate || new Date().toISOString().split('T')[0] });
                    }
                    setShowStatusMenu(false);
                  }}
                  title={item.status === 'progress' ? "取消在看状态" : "标记为在看状态"}
                  className={`group/btn w-7 h-7 flex items-center justify-center transition-all duration-200 cursor-pointer filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] hover:scale-125 ${
                    item.status === 'progress'
                      ? 'text-amber-400 scale-110'
                      : 'text-zinc-300 hover:text-amber-400'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                    item.status === 'progress'
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      : 'bg-zinc-300 group-hover/btn:bg-amber-400'
                  }`} />
                </button>

                {/* Option 3: 已完成 */}
                <button
                  onClick={() => {
                    if (item.status === 'completed') {
                      onStatusChange?.(item.id, undefined);
                    } else {
                      onStatusChange?.(item.id, 'completed', { completedDate: item.completedDate || new Date().toISOString().split('T')[0] });
                    }
                    setShowStatusMenu(false);
                  }}
                  title={item.status === 'completed' ? "取消已看状态" : "标记为已看状态"}
                  className={`w-7 h-7 flex items-center justify-center transition-all duration-200 cursor-pointer filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] hover:scale-125 ${
                    item.status === 'completed'
                      ? 'text-emerald-400 scale-110'
                      : 'text-zinc-300 hover:text-emerald-400'
                  }`}
                >
                  <CheckCheck size={14} strokeWidth={3} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Independent Re-read completion indicators */}
      {(() => {
        const logs = deduplicateLogs(item.reReadLogs || []);
        if (logs.length === 0) return null;
        return (
          <div 
            className="absolute top-3 left-12 z-30 flex gap-1.5 items-center h-7 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {logs.map((log, index) => (
              <div 
                key={log.id || index} 
                className="w-2.5 h-2.5 rounded-none bg-emerald-400 border border-zinc-950/60 shadow-md relative group/dot cursor-help transition-transform hover:scale-125"
              >
                {/* Tooltip on hover */}
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/dot:flex flex-col z-[9999] bg-zinc-900/95 border border-zinc-800 text-white rounded-none p-3 text-[11px] w-64 sm:w-72 shadow-2xl pointer-events-none transition-all animate-fade-in">
                  <div className="font-bold text-emerald-400 border-b border-zinc-800 pb-1.5 mb-1.5 font-serif flex items-center justify-between uppercase tracking-wider text-[10px]">
                    <span>重温 {logs.length - index}</span>
                    <span className="font-serif text-[10px] text-zinc-400 font-normal">{log.date}</span>
                  </div>
                  {log.note ? (
                    <p className="text-zinc-300 font-serif leading-relaxed text-[10px] break-words whitespace-normal">
                      "{log.note}"
                    </p>
                  ) : (
                    <span className="text-zinc-500 italic font-serif text-[10px]">无温读备注</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Static rating badge on top right */}
      {item.personalRating && item.personalRating > 0 ? (
        <div 
          title={isLiked ? "极力推荐" : "评价一般"}
          className="absolute top-3 right-3 z-25 flex items-center justify-center hover:scale-120 transition-transform filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        >
          <span className="text-base select-none">{isLiked ? '❤️' : '💢'}</span>
        </div>
      ) : null}
    </div>
  );
}
