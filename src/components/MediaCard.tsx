/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Bookmark, Star, X, Activity, SquareCheck, Check, Book, Film, Tv, Music, Gamepad, Ghost, Sparkles, Users } from 'lucide-react';
import { MediaItem, MediaType, MEDIA_TYPE_LABELS } from '../types';

interface MediaCardProps {
  key?: React.Key;
  item: MediaItem;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, itemId: string) => void;
  onQuickRate?: (itemId: string, rating: number) => void;
}

export default function MediaCard({ item, onClick, onContextMenu }: MediaCardProps) {
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

  // Symbolic status indicator inside card
  const getStatusBadge = () => {
    switch (item.status) {
      case 'completed':
        return (
          <div 
            title="已完成"
            className="absolute top-3 left-3 z-20 flex items-center justify-center filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          >
            <Check size={20} strokeWidth={4} className="text-emerald-500 dark:text-emerald-400" />
          </div>
        );
      case 'progress':
        return (
          <div 
            title="进行中"
            className="absolute top-3.5 left-3.5 z-20 flex items-center justify-center"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.6, 1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: "easeInOut" 
              }}
              className="absolute w-4 h-4 bg-amber-500 rounded-full" 
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
              className="relative w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
            />
          </div>
        );
      case 'paused':
        return (
          <div 
            title="已搁置"
            className="absolute top-3.5 left-3.5 z-20 flex items-center justify-center text-zinc-300 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]"
          >
            <span className="w-2 h-2 bg-zinc-300 rounded-full" />
          </div>
        );
      case 'wishlist':
      default:
        return (
          <div 
            title="待阅"
            className="absolute top-3 left-3 z-20 flex items-center justify-center text-zinc-300 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]"
          >
            <Bookmark size={14} strokeWidth={2.5} fill="currentColor" className="fill-zinc-300/20" />
          </div>
        );
    }
  };

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
            src={item.coverUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            onError={(e) => {
              e.currentTarget.src = `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop`;
            }}
          />
        </div>

        {/* Subtle, highly premium top gradient vignette to support floating badges */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none z-10" />

        {/* Tall, super-smooth seamless vignette gradient overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent p-4 pt-24 flex flex-col justify-end text-white select-none">
          {/* Title */}
          <h4 className="text-white font-bold text-sm sm:text-base line-clamp-1 leading-snug tracking-tight font-sans">
            {item.title}
          </h4>

          {/* Creator & Media Type Icon */}
          <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-400">
            <span className="line-clamp-1 max-w-[80%] opacity-80 font-medium font-mono tracking-wider uppercase">
              {item.creator || '佚名'}
            </span>
            <span className="shrink-0 flex items-center gap-2">
              {(item.watchedWith || item.reReadLogs?.some(log => log.watchedWith)) && (
                <div className="relative group/user-tooltip">
                  <Users size={12} className="text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)] cursor-help" />
                  <div className="absolute bottom-full right-0 mb-3 hidden group-hover/user-tooltip:block bg-zinc-950/98 border border-zinc-700 text-white rounded-none p-3 text-xs w-64 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[9999] pointer-events-none transition-all animate-fade-in origin-bottom-right">
                    <div className="font-bold text-emerald-400 border-b border-zinc-800 pb-1.5 mb-2.5 flex items-center justify-between uppercase tracking-wider text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Users size={10} />
                        <span>归档回顾 / ARCHIVE REVIEW</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-sm font-mono text-[9px]">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="space-y-2.5 text-[11px] font-sans">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 uppercase text-[9px] font-bold">同看伴侣 / COMPANION</span>
                        <span className="text-zinc-200 border-l-2 border-emerald-500/30 pl-2 ml-0.5">{item.watchedWith || '个人独享'}</span>
                      </div>
                      {item.watchedWithLocation && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-500 uppercase text-[9px] font-bold">记录地点 / LOCATION</span>
                          <span className="text-zinc-200 border-l-2 border-zinc-700 pl-2 ml-0.5">{item.watchedWithLocation}</span>
                        </div>
                      )}
                      {item.watchedWithExperience && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-500 uppercase text-[9px] font-bold">同看体验 / EXPERIENCE</span>
                          <span className="text-zinc-200 border-l-2 border-zinc-700 pl-2 ml-0.5 italic leading-relaxed">{item.watchedWithExperience}</span>
                        </div>
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

      {/* Floating Badges (Outside overflow-hidden so tooltips are never cut off) */}
      
      {/* Status Badge */}
      {getStatusBadge()}

      {/* Re-read completion indicators */}
      {item.status === 'completed' && item.reReadLogs && item.reReadLogs.length > 0 && (
        <div 
          className="absolute top-3 left-9 z-30 flex gap-1 items-center h-5 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {item.reReadLogs.map((log, index) => (
            <div 
              key={log.id || index} 
              className="w-2.5 h-2.5 rounded-none bg-emerald-400 border border-zinc-950/60 shadow-md relative group/dot cursor-help transition-transform hover:scale-125"
            >
              {/* Tooltip on hover */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover/dot:flex flex-col z-[9999] bg-zinc-950/95 border border-zinc-800 text-white rounded-none p-3 text-xs w-64 sm:w-72 shadow-2xl pointer-events-none transition-all animate-fade-in">
                <div className="font-bold text-emerald-400 border-b border-zinc-800 pb-1.5 mb-1.5 font-sans flex items-center justify-between uppercase tracking-wider">
                  <span>重温 {index + 1}</span>
                  <span className="font-mono text-[11px] text-zinc-400 font-normal">{log.date}</span>
                </div>
                {log.note ? (
                  <p className="text-zinc-300 font-sans leading-relaxed text-xs break-words whitespace-normal">
                    "{log.note}"
                  </p>
                ) : (
                  <span className="text-zinc-500 italic font-sans text-xs">无温读备注</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
