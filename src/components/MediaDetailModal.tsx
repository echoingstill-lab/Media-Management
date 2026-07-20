/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, History, Plus, Trash2, Edit2, Camera, HelpCircle, CheckCircle2, Loader2, Heart, ThumbsDown, Sparkles, Activity, Book, Film, Tv, Music, Gamepad, Ghost } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 dark:bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#191b1e] border border-[#dcd6cb] dark:border-[#2d3137] rounded-none w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in text-zinc-800 dark:text-zinc-300">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#dcd6cb] dark:border-[#2d3137] flex items-center justify-between bg-[#fbf9f3] dark:bg-[#111214] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-400">
            <span>档案详情 / </span>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm border border-[#dcd6cb] dark:border-[#2d3137]">
              {item.type === 'book' && <Book size={10} />}
              {item.type === 'movie' && <Film size={10} />}
              {item.type === 'tv' && <Tv size={10} />}
              {item.type === 'music' && <Music size={10} />}
              {item.type === 'game' && <Gamepad size={10} />}
              {item.type === 'anime' && <Ghost size={10} />}
              <span>{MEDIA_TYPE_LABELS[item.type]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-none transition-all flex items-center gap-1 cursor-pointer border border-[#dcd6cb] dark:border-[#2d3137]"
            >
              <Edit2 size={12} />
              <span>编辑</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`确定要删除: "${item.title}" 吗?`)) {
                  onDelete();
                }
              }}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-none transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>删除</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-none transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
          
          {/* Left Block: Beautiful Portrait Cover Card & Metadata */}
          <div className="md:col-span-4 space-y-5">
            <div className="relative aspect-[2/3] w-full bg-zinc-950 rounded-none overflow-hidden border border-[#dcd6cb] dark:border-[#2d3137] shadow-lg">
              <img src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
            </div>

            <div className="space-y-3.5 bg-[#fbf9f3] dark:bg-[#111214] p-4 rounded-none border border-[#dcd6cb] dark:border-[#2d3137]">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-sans">{item.title}</h3>
                {item.status === 'progress' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-none align-middle translate-y-[-1px]">
                    <div className="relative flex items-center justify-center w-2 h-2">
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
                        className="absolute w-full h-full bg-amber-500 rounded-full" 
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
                        className="relative w-1 h-1 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                      />
                    </div>
                    进行中
                  </span>
                )}
                {item.status === 'completed' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-none align-middle translate-y-[-1px]">
                    <CheckCircle2 size={10} className="text-emerald-500 dark:text-emerald-400" strokeWidth={3} />
                    已完成
                  </span>
                )}
                {item.status === 'wishlist' && (
                  <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-none align-middle translate-y-[-1px]">
                    待阅清单
                  </span>
                )}
                {item.status === 'paused' && (
                  <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide bg-stone-500/10 dark:bg-zinc-500/15 text-stone-600 dark:text-zinc-400 border border-stone-500/20 rounded-none align-middle translate-y-[-1px]">
                    已搁置
                  </span>
                )}
              </div>
              {item.creator && <p className="text-xs text-zinc-500 dark:text-zinc-400">主创人员: {item.creator}</p>}
              
              {item.description && (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-[#dcd6cb] dark:border-[#2d3137] pt-3 font-sans">
                  {item.description}
                </p>
              )}

              {/* Tag Badges */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-2 py-0.5 rounded-none bg-white dark:bg-zinc-900 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-600 dark:text-zinc-400 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Time stats */}
              <div className="border-t border-[#dcd6cb] dark:border-[#2d3137] pt-3 space-y-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                {item.startDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-zinc-400 dark:text-zinc-500" />
                    <span>开始于: {item.startDate}</span>
                  </div>
                )}
                
                {item.status === 'completed' && (
                  <div className="space-y-1.5 font-sans">
                    <button
                      type="button"
                      onClick={() => setShowReReadsDropdown(!showReReadsDropdown)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none border text-xs font-semibold transition-all cursor-pointer ${
                        item.reReadLogs && item.reReadLogs.length > 0
                          ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/30 font-bold'
                          : 'bg-zinc-950/10 border-zinc-900/20 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400 font-bold fill-emerald-400/10" />
                        <span>已阅毕</span>
                        {item.completedDate && <span className="opacity-60 text-xs">({item.completedDate})</span>}
                        {item.reReadLogs && item.reReadLogs.length > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded-none text-[10px] font-mono font-bold ml-1">
                            +{item.reReadLogs.length} 次重温
                          </span>
                        )}
                      </div>
                      {item.reReadLogs && item.reReadLogs.length > 0 && (
                        <span className="text-xs opacity-60">
                          {showReReadsDropdown ? '隐藏' : '历史'}
                        </span>
                      )}
                    </button>

                    {showReReadsDropdown && item.reReadLogs && item.reReadLogs.length > 0 && (
                      <div className="pl-3 border-l border-emerald-800/40 py-1 space-y-1.5 max-h-32 overflow-y-auto animate-fade-in font-sans">
                        {item.reReadLogs.map((log, idx) => (
                          <div key={log.id || idx} className="text-xs text-zinc-400 bg-zinc-950/35 p-1 rounded-none border border-zinc-850">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-mono text-xs">重温 #{idx + 1} ({log.date})</span>
                            </div>
                            {log.note && <p className="text-xs mt-0.5 text-zinc-300 leading-normal italic pl-3 font-sans">"{log.note}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-zinc-400 dark:text-zinc-500" />
                  <span>录入于: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Interactive Note review & Re-watch Logs */}
          <div className="md:col-span-8 flex flex-col h-full space-y-5">
            
            {/* Interactive Rating Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-bold tracking-tight text-zinc-800 dark:text-zinc-200 uppercase">
                    个人评价
                  </span>
                  {rating > 0 && <span className="text-xl">{rating >= 8 ? '❤️' : '💢'}</span>}
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5">个人评价标志将显示在档案卡片上</span>
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
