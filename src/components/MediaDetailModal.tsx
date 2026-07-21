/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, History, Plus, Trash2, Edit2, Camera, HelpCircle, CheckCircle2, Loader2, Heart, ThumbsDown, Sparkles, Activity, Book, Film, Tv, Music, Gamepad, Ghost, Users, ChevronDown } from 'lucide-react';
import { MediaItem, ReReadLog, MEDIA_TYPE_LABELS } from '../types';
import { compressImage } from '../utils/helpers';

interface MediaDetailModalProps {
  item: MediaItem;
  onUpdateItem: (updatedItem: MediaItem) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MediaDetailModal({
  item,
  onUpdateItem,
  onClose,
  onEdit,
  onDelete,
}: MediaDetailModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'note' | 'reread'>('note');

  // Edit notes state
  const [rating, setRating] = useState(item.personalRating);
  const [noteText, setNoteText] = useState(item.personalNote);
  const [noteImages, setNoteImages] = useState<string[]>(item.noteImages || []);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // New Re-read Log state
  const [showRereadForm, setShowRereadForm] = useState(false);
  const [rereadDate, setRereadDate] = useState(new Date().toISOString().split('T')[0]);
  const [rereadNote, setRereadNote] = useState('');
  const [showReReadsDropdown, setShowReReadsDropdown] = useState(false);

  // Interactive binary rating helper (10 = Like, 1 = Dislike, 0 = Unrated)
  const handleBinaryRatingClick = (type: 'like' | 'dislike') => {
    let newScore = 0;
    if (type === 'like') {
      newScore = rating === 10 ? 0 : 10;
    } else {
      newScore = rating === 1 ? 0 : 1;
    }
    setRating(newScore);
    const updated = { ...item, personalRating: newScore, updatedAt: new Date().toISOString() };
    onUpdateItem(updated);
  };

  // Drag and drop or Paste image files
  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const compressed = await compressImage(file, 500, 0.7);
      const updatedImages = [...noteImages, compressed];
      setNoteImages(updatedImages);
      
      // Auto save updated images to DB
      const updated = { ...item, noteImages: updatedImages, updatedAt: new Date().toISOString() };
      onUpdateItem(updated);
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setImageUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleImageUpload(file);
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = noteImages.filter((_, i) => i !== index);
    setNoteImages(updatedImages);
    const updated = { ...item, noteImages: updatedImages, updatedAt: new Date().toISOString() };
    onUpdateItem(updated);
  };

  const handleSaveNote = () => {
    setIsSavingNote(true);
    setTimeout(() => {
      const updated = {
        ...item,
        personalNote: noteText,
        personalRating: rating,
        updatedAt: new Date().toISOString(),
      };
      onUpdateItem(updated);
      setIsSavingNote(false);
    }, 400);
  };

  // Re-read log registry
  const handleAddReread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rereadDate) return;

    const newLog: ReReadLog = {
      id: `re-${Date.now()}`,
      date: rereadDate,
      note: rereadNote.trim(),
    };

    const updatedLogs = [newLog, ...item.reReadLogs];
    const updated = {
      ...item,
      reReadCount: item.reReadCount + 1,
      reReadLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };

    onUpdateItem(updated);
    setRereadNote('');
    setShowRereadForm(false);
  };

  const handleDeleteReread = (id: string) => {
    if (window.confirm('Delete this re-watch/re-read log?')) {
      const updatedLogs = item.reReadLogs.filter(log => log.id !== id);
      const updated = {
        ...item,
        reReadCount: Math.max(0, item.reReadCount - 1),
        reReadLogs: updatedLogs,
        updatedAt: new Date().toISOString(),
      };
      onUpdateItem(updated);
    }
  };

  const [showAddReRead, setShowAddReRead] = useState(false);
  const [reReadDate, setReReadDate] = useState(new Date().toISOString().split('T')[0]);
  const [reReadNote, setReReadNote] = useState('');
  const [reReadWatchedWith, setReReadWatchedWith] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const toggleLog = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddReRead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: reReadDate,
      note: reReadNote.trim() || undefined,
      watchedWith: reReadWatchedWith.trim() || undefined
    } as ReReadLog;
    
    const updatedItem = {
      ...item,
      reReadLogs: [newLog, ...(item.reReadLogs || [])]
    };
    
    onUpdateItem(updatedItem);
    setShowAddReRead(false);
    setReReadNote('');
    setReReadWatchedWith('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 dark:bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#191b1e] border border-[#dcd6cb] dark:border-[#2d3137] rounded-none w-full max-w-5xl shadow-2xl overflow-hidden max-h-[96vh] min-h-[85vh] flex flex-col animate-fade-in text-zinc-800 dark:text-zinc-300">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#dcd6cb] dark:border-[#2d3137] flex items-center justify-between bg-[#fbf9f3] dark:bg-[#111214] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[13px] uppercase font-sans font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
            <span>档案详情 / </span>
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              {item.type === 'book' && <Book size={12} />}
              {item.type === 'movie' && <Film size={12} />}
              {item.type === 'tv' && <Tv size={12} />}
              {item.type === 'music' && <Music size={12} />}
              {item.type === 'game' && <Gamepad size={12} />}
              {item.type === 'anime' && <Ghost size={12} />}
              <span className="font-bold text-sm">{MEDIA_TYPE_LABELS[item.type]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEdit}
              className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer border border-[#dcd6cb] dark:border-[#2d3137]"
            >
              <Edit2 size={13} />
              <span>编辑</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`确定要删除: "${item.title}" 吗?`)) {
                  onDelete();
                }
              }}
              className="px-5 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer border border-red-500/10"
            >
              <Trash2 size={13} />
              <span>删除</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-none transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-12 gap-10 flex-grow">
          
          {/* Left Block: Beautiful Portrait Cover Card & Metadata */}
          <div className="md:col-span-4 space-y-6">
            <div className="relative aspect-[2/3] w-full bg-zinc-950 rounded-none overflow-hidden border border-[#dcd6cb] dark:border-[#2d3137] shadow-xl group">
              <img src={item.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-sans tracking-tight">{item.title}</h3>
                {item.status === 'progress' && (
                  <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-none">
                    <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                    进行中
                  </span>
                )}
                {item.status === 'completed' && (
                  <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-none">
                    <CheckCircle2 size={10} className="fill-emerald-500/10" />
                    已完成
                  </span>
                )}
              </div>
              
              {item.creator && (
                <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-sans font-medium uppercase tracking-wider">
                  {item.creator}
                </div>
              )}
              
              {item.watchedWith && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A3B32] dark:text-[#DDDAC4] bg-[#4A3B32]/5 dark:bg-[#DDDAC4]/10 p-2 border border-[#4A3B32]/10 dark:border-[#DDDAC4]/10">
                  <Users size={14} />
                  <span>共同观看/阅读：{item.watchedWith}</span>
                </div>
              )}
              
              {item.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans opacity-90">
                  {item.description}
                </p>
              )}

              {/* Tag Badges */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-none bg-zinc-50 dark:bg-zinc-900 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-500 dark:text-zinc-400 font-mono tracking-tighter"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Redesigned Archival Timeline Section */}
              <div className="pt-6 border-t border-[#dcd6cb] dark:border-[#2d3137] space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">时间轨迹 / ARCHIVAL LOG</div>
                  {item.status === 'completed' && !showAddReRead && (
                    <button 
                      onClick={() => setShowAddReRead(true)}
                      className="text-[9px] font-bold text-[#4A3B32] dark:text-[#DDDAC4] hover:underline uppercase tracking-widest cursor-pointer"
                    >
                      + 新增重温记录
                    </button>
                  )}
                </div>
                
                  {showAddReRead && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 border border-[#dcd6cb] dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">记录一次新的回顾</span>
                      <button onClick={() => setShowAddReRead(false)} className="text-zinc-400 hover:text-zinc-600"><X size={14} /></button>
                    </div>
                    <form onSubmit={handleAddReRead} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">日期</label>
                          <input 
                            type="date" 
                            value={reReadDate}
                            onChange={(e) => setReReadDate(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">共同观看/阅读 (可选)</label>
                          <input 
                            type="text"
                            placeholder="例如：家人、张三"
                            value={reReadWatchedWith}
                            onChange={(e) => setReReadWatchedWith(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">感悟或备注</label>
                        <textarea 
                          placeholder="感悟或备注 (可选)..."
                          value={reReadNote}
                          onChange={(e) => setReReadNote(e.target.value)}
                          className="w-full text-xs p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 min-h-[60px] focus:outline-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-2 bg-[#4A3B32] dark:bg-[#DDDAC4] text-white dark:text-[#111214] text-[10px] font-bold uppercase tracking-widest"
                      >
                        确认记录
                      </button>
                    </form>
                  </motion.div>
                )}
                
                <div className="relative pl-6 space-y-6">
                  {/* Vertical line connecting nodes */}
                  <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

                  {/* Milestone: Entry */}
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-zinc-100 dark:bg-[#191b1e] border-2 border-zinc-300 dark:border-zinc-700 rounded-full z-10" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">记录录入 / ARCHIVED AT</div>
                      <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                        {(() => {
                          // Prioritize createdAt, fallback to item ID if it contains a timestamp, or updatedAt
                          const dateStr = item.createdAt || item.updatedAt;
                          if (!dateStr) return '未知时间';
                          const d = new Date(dateStr);
                          return d.toString() !== 'Invalid Date' ? d.toLocaleDateString() : dateStr.split('T')[0];
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Milestone: Start */}
                  {item.startDate && (
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-zinc-100 dark:bg-[#191b1e] border-2 border-amber-400/40 dark:border-amber-500/40 rounded-full z-10" />
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">首次标注：开始阅读/观影</div>
                        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">{item.startDate}</div>
                      </div>
                    </div>
                  )}

                  {/* Milestone: Completed */}
                  {item.status === 'completed' && (
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-emerald-500/20 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                          <span>标注结案：已阅毕</span>
                          <Sparkles size={10} />
                        </div>
                        <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                          {item.completedDate || '未知日期'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* History / Re-reads as sub-milestones (Shown regardless of status if they exist) */}
                  {item.reReadLogs && item.reReadLogs.length > 0 && (
                    <div className="relative space-y-4">
                      <div className="space-y-3 pt-2">
                        {item.reReadLogs.map((log, idx) => {
                            const isExpanded = expandedLogs[log.id];
                            return (
                              <div key={log.id || idx} className="relative pl-4">
                                {/* Sub-node connector line */}
                                <div className="absolute left-[-15px] top-[-10px] bottom-1.5 w-[1px] bg-emerald-100 dark:bg-emerald-900/30" />
                                <div className="absolute left-[-15px] top-1.5 w-3 h-[1px] bg-emerald-100 dark:bg-emerald-900/30" />
                                <div className="absolute left-[-1.5px] top-1.5 w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
                                
                                <div className="space-y-1">
                                  <div 
                                    onClick={() => toggleLog(log.id)}
                                    className="flex items-center justify-between cursor-pointer group/node"
                                  >
                                    <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter flex items-center gap-2 group-hover/node:text-emerald-500 transition-colors">
                                      重温回顾 #{item.reReadLogs.length - idx} • {log.date}
                                      {log.watchedWith && (
                                        <span className="flex items-center gap-1 opacity-70">
                                          <Users size={8} />
                                          {log.watchedWith}
                                        </span>
                                      )}
                                    </div>
                                    <ChevronDown 
                                      size={10} 
                                      className={`text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                    />
                                  </div>
                                  
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        {log.note ? (
                                          <div className="text-[10px] mt-1 leading-relaxed text-zinc-500 dark:text-zinc-400 italic bg-emerald-500/5 dark:bg-emerald-500/10 border-l border-emerald-500/20 p-2 font-sans">
                                            "{log.note}"
                                          </div>
                                        ) : (
                                          <div className="text-[9px] mt-1 text-zinc-400 italic font-sans pl-2">
                                            未记录心得
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* Right Block: Interactive Note review & Re-watch Logs */}
          <div className="md:col-span-8 flex flex-col h-full space-y-5">
            
            {/* Companion Records Section */}
            <div className="flex flex-col p-5 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-serif font-bold tracking-tight text-[#4A3B32] dark:text-[#DDDAC4] uppercase">
                      同看记录
                    </span>
                    <Users size={18} className="text-emerald-500" />
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1">记录共同观赏的伙伴与珍贵瞬间</span>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                   <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>同看人</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="备注同看伙伴..."
                    value={item.watchedWith || ''}
                    onChange={(e) => onUpdateItem({ ...item, watchedWith: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                    className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-emerald-500 focus:outline-none py-1 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>同看地点</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="地点/场合..."
                    value={item.watchedWithLocation || ''}
                    onChange={(e) => onUpdateItem({ ...item, watchedWithLocation: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                    className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-emerald-500 focus:outline-none py-1 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>同看体验</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="评价本次同看..."
                    value={item.watchedWithExperience || ''}
                    onChange={(e) => onUpdateItem({ ...item, watchedWithExperience: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                    className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-emerald-500 focus:outline-none py-1 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Rating Bar */}
            <div className="flex flex-col p-4 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-serif font-bold tracking-tight text-zinc-800 dark:text-zinc-200 uppercase">
                      个人评分
                    </span>
                    {rating > 0 && <span className="text-xl">{rating >= 8 ? '❤️' : '💢'}</span>}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5">评分将同步显示在卡片右上角</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleBinaryRatingClick('like')}
                    className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      rating === 10
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                        : 'bg-white dark:bg-zinc-950/40 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-red-500 hover:border-red-500/20'
                    }`}
                  >
                    <span className="text-sm">❤️</span>
                    <span>好看</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBinaryRatingClick('dislike')}
                    className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      rating === 1
                        ? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                        : 'bg-white dark:bg-zinc-950/40 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-600 hover:border-zinc-500/20'
                    }`}
                  >
                    <span className="text-sm">💢</span>
                    <span>不好看</span>
                  </button>
                  {rating > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRating(0);
                        const updated = { ...item, personalRating: 0, updatedAt: new Date().toISOString() };
                        onUpdateItem(updated);
                      }}
                      className="px-2 py-1.5 text-[10px] text-zinc-400 hover:text-red-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 rounded-md transition-all cursor-pointer font-medium"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-[#dcd6cb] dark:border-[#2d3137]">
              <button
                onClick={() => setActiveTab('note')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer rounded-none uppercase tracking-wider ${
                  activeTab === 'note'
                    ? 'border-[#4A3B32] dark:border-[#e3e4e6] text-[#4A3B32] dark:text-[#e3e4e6]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                笔记及评价
              </button>
              <button
                onClick={() => setActiveTab('reread')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-none uppercase tracking-wider ${
                  activeTab === 'reread'
                    ? 'border-[#4A3B32] dark:border-[#e3e4e6] text-[#4A3B32] dark:text-[#e3e4e6]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <History size={12} />
                <span>重温记录 ({item.reReadCount})</span>
              </button>
            </div>

            {/* TAB CONTENT: Review & Image Paste */}
            {activeTab === 'note' && (
              <div className="space-y-4 flex-grow flex flex-col">
                <div className="flex-grow">
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">个人笔记（支持粘贴图片）</label>
                  <textarea
                    placeholder="在这里记录您的感悟、引用或想法..."
                    value={noteText}
                    onPaste={handlePaste}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={8}
                    className="w-full text-xs bg-white dark:bg-zinc-950/40 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-900 dark:text-zinc-200 rounded-none p-3.5 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* Upload Image Section */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">附件图片</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="text-[10px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors cursor-pointer font-bold uppercase tracking-wider"
                    >
                      {imageUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Camera size={12} />
                      )}
                      <span>上传图片</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Note Images Thumbnails Grid */}
                  {noteImages.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-none border border-[#dcd6cb] dark:border-[#2d3137]">
                      {noteImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-none overflow-hidden border border-[#dcd6cb] dark:border-[#2d3137] group bg-zinc-950">
                          <img src={img} className="w-full h-full object-cover" alt="attachment" />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-none text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-[#dcd6cb] dark:border-[#2d3137] rounded-none text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      暂无附件。支持从剪贴板粘贴或手动上传。
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="px-4.5 py-2 text-xs font-bold uppercase tracking-widest bg-[#4A3B32] hover:bg-[#382B24] dark:bg-[#DDDAC4] dark:hover:bg-white text-[#FBF9F3] dark:text-[#111214] transition-all rounded-none cursor-pointer flex items-center gap-2"
                  >
                    {isSavingNote ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    <span>保存笔记</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Multiple Re-read/Re-watch Logs */}
            {activeTab === 'reread' && (
              <div className="space-y-4 flex-grow flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">历史记录</span>
                  <button
                    onClick={() => setShowRereadForm(!showRereadForm)}
                    className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Plus size={14} /> 记录重温
                  </button>
                </div>

                {/* Form to log re-read */}
                {showRereadForm && (
                  <form onSubmit={handleAddReread} className="p-4 bg-white/60 dark:bg-zinc-900/40 border border-[#dcd6cb] dark:border-[#2d3137] rounded-none space-y-3.5 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">重温日期</label>
                        <input
                          type="date"
                          required
                          value={rereadDate}
                          onChange={(e) => setRereadDate(e.target.value)}
                          className="w-full text-xs bg-[#fbf9f3] dark:bg-zinc-900 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">感悟笔记</label>
                      <textarea
                        placeholder="重温感悟..."
                        value={rereadNote}
                        onChange={(e) => setRereadNote(e.target.value)}
                        rows={3}
                        className="w-full text-xs bg-[#fbf9f3] dark:bg-zinc-900 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRereadForm(false)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs bg-[#4A3B32] hover:bg-[#382B24] dark:bg-[#DDDAC4] dark:hover:bg-white text-[#FBF9F3] dark:text-[#111214] rounded-none transition-all cursor-pointer font-bold uppercase tracking-widest"
                      >
                        添加记录
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Re-read logs */}
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 font-mono text-zinc-800 dark:text-zinc-200">
                  {item.reReadLogs && item.reReadLogs.length > 0 ? (
                    item.reReadLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 bg-[#fbf9f3] dark:bg-zinc-900/40 border border-[#dcd6cb] dark:border-[#2d3137] rounded-none space-y-2 group relative text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                            <Calendar size={10} />
                            <span>日期: {log.date}</span>
                          </span>
                          <button
                            onClick={() => handleDeleteReread(log.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity cursor-pointer rounded-none"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {log.note ? (
                          <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed italic pl-1 font-sans">
                            “ {log.note} ”
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic pl-1 font-sans">暂无笔记内容。</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-[#dcd6cb] dark:border-[#2d3137] rounded-none font-sans uppercase tracking-widest">
                      暂无重温历史记录。
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
