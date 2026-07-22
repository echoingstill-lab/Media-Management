/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, History, Plus, Trash2, Edit2, Camera, HelpCircle, CheckCircle2, Loader2, Heart, ThumbsDown, Sparkles, Activity, Book, Film, Tv, Music, Gamepad, Ghost, Users, ChevronDown, MapPin, Bookmark, Play, Check, Square } from 'lucide-react';
import { MediaItem, ReReadLog, MEDIA_TYPE_LABELS } from '../types';
import { compressImage, generateSvgCover } from '../utils/helpers';

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
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);

  // Edit notes state
  const [rating, setRating] = useState(item.personalRating);
  const [noteText, setNoteText] = useState(item.personalNote);
  const [noteImages, setNoteImages] = useState<string[]>(item.noteImages || []);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Re-read Log state
  const [reReadDate, setReReadDate] = useState(new Date().toISOString().split('T')[0]);
  const [reReadNote, setReReadNote] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const handleImageUploads = async (files: FileList | File[]) => {
    setImageUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => compressImage(file, 800, 0.7));
      const compressedImages = await Promise.all(uploadPromises);
      const updatedImages = [...noteImages, ...compressedImages];
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
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      await handleImageUploads(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleImageUploads(e.target.files);
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

  const toggleLog = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddReRead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: reReadDate,
      note: reReadNote.trim() || undefined,
    } as ReReadLog;
    
    const updatedItem = {
      ...item,
      reReadCount: (item.reReadCount || 0) + 1,
      reReadLogs: [newLog, ...(item.reReadLogs || [])]
    };
    
    onUpdateItem(updatedItem);
    setReReadNote('');
  };

  const handleDeleteReRead = (id: string) => {
    if (window.confirm('确定要删除这条重温记录吗？')) {
      const updatedLogs = (item.reReadLogs || []).filter(l => l.id !== id);
      onUpdateItem({
        ...item,
        reReadCount: Math.max(0, (item.reReadCount || 0) - 1),
        reReadLogs: updatedLogs
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 dark:bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#191b1e] border border-[#dcd6cb] dark:border-[#2d3137] rounded-none w-full max-w-6xl shadow-2xl overflow-hidden max-h-[96vh] min-h-[60vh] md:min-h-[650px] flex flex-col animate-fade-in text-zinc-800 dark:text-zinc-300">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#dcd6cb] dark:border-[#2d3137] flex items-center justify-between bg-[#fbf9f3] dark:bg-[#111214] backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[13px] font-serif font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
            <span>档案详情</span>
            <span>/</span>
            <div className="flex items-center gap-1.5">
              {item.type === 'book' && <Book size={13} />}
              {item.type === 'movie' && <Film size={13} />}
              {item.type === 'tv' && <Tv size={13} />}
              {item.type === 'music' && <Music size={13} />}
              {item.type === 'game' && <Gamepad size={13} />}
              {item.type === 'anime' && <Ghost size={13} />}
              <span>{MEDIA_TYPE_LABELS[item.type]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold uppercase tracking-widest rounded-none transition-all cursor-pointer shadow-sm"
                >
                  <span>取消</span>
                </button>
                <button
                  onClick={onDelete}
                  className="px-4 py-2 bg-red-600 text-white border border-red-600 hover:bg-red-700 dark:bg-red-900 dark:border-red-900 dark:hover:bg-red-800 text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={13} />
                  <span>确定删除</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40 text-red-700 dark:text-red-400 border border-zinc-200 dark:border-[#2d3137] hover:bg-red-500 hover:text-white hover:border-red-500 dark:hover:bg-red-900 dark:hover:text-red-100 dark:hover:border-red-900 text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 size={13} />
                <span>删除媒体</span>
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#2d3137] hover:bg-[#4A3B32] hover:text-[#FBF9F3] hover:border-[#4A3B32] dark:hover:bg-[#DDDAC4] dark:hover:text-[#111214] dark:hover:border-[#DDDAC4] text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Edit2 size={13} />
              <span>编辑信息</span>
            </button>
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40 text-[#4A3B32] dark:text-[#DDDAC4] border border-[#dcd6cb] dark:border-[#2d3137] hover:bg-[#4A3B32] hover:text-[#FBF9F3] hover:border-[#4A3B32] dark:hover:bg-[#DDDAC4] dark:hover:text-[#111214] dark:hover:border-[#DDDAC4] text-xs font-bold uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSavingNote ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>保存记录</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-none transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Body - REDESIGNED */}
        <div className="overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-12 gap-x-12 gap-y-10 flex-grow">
          
          {/* LEFT: Information Display (3/12) */}
          <div className="md:col-span-3 flex flex-col space-y-6">
            {/* Cover Image */}
            <div className="relative aspect-[2/3] w-full max-w-[180px] mx-auto bg-zinc-950 rounded-none overflow-hidden border border-[#dcd6cb] dark:border-[#2d3137] shadow-xl group">
              <img 
                src={item.coverUrl || generateSvgCover(item.title, item.creator || '佚名', item.type)} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={item.title} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = generateSvgCover(item.title, item.creator || '佚名', item.type);
                }}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>

            {/* Static Info Block */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-serif tracking-tight leading-tight">{item.title}</h3>
                {item.createdAt && (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-sans whitespace-nowrap shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {item.creator && (
                  <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-serif font-bold uppercase tracking-wider">
                    {item.creator}
                  </div>
                )}
                
                {item.description && (
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-serif opacity-90 max-w-2xl italic">
                    {item.description}
                  </p>
                )}

                {/* Tag Badges */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900 border border-[#dcd6cb] dark:border-[#2d3137] text-zinc-500 dark:text-zinc-400 tracking-tighter"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Summary */}
            <div className="pt-6 border-t border-[#dcd6cb] dark:border-zinc-800 space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">档案摘要 / ARCHIVAL</div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">当前状态</span>
                  <div className="flex flex-row items-center gap-1.5 w-full">
                    {/* Option 1: Bookmark / Wishlist */}
                    <button
                      onClick={() => {
                        const newStatus = item.status === 'wishlist' ? undefined : 'wishlist';
                        const now = new Date().toISOString();
                        const updated: MediaItem = {
                          ...item,
                          status: newStatus,
                          updatedAt: now,
                        };
                        if (newStatus === 'wishlist') {
                          if (!item.wishlistMonth) {
                            updated.wishlistMonth = now.split('T')[0].substring(0, 7);
                          }
                          delete updated.startDate;
                          delete updated.completedDate;
                        } else {
                          delete updated.status;
                          delete updated.wishlistMonth;
                          delete updated.startDate;
                          delete updated.completedDate;
                        }
                        onUpdateItem(updated);
                      }}
                      title={item.status === 'wishlist' ? "取消想看状态" : "加入想看清单 (本月)"}
                      className={`flex-1 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 transition-all border rounded-none cursor-pointer ${
                        item.status === 'wishlist'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-750'
                      }`}
                    >
                      <Bookmark size={11} fill={item.status === 'wishlist' ? 'currentColor' : 'none'} />
                      想看
                    </button>

                    {/* Option 2: Progress */}
                    <button
                      onClick={() => {
                        const newStatus = item.status === 'progress' ? undefined : 'progress';
                        const now = new Date().toISOString();
                        const updated: MediaItem = {
                          ...item,
                          status: newStatus,
                          updatedAt: now,
                        };
                        if (newStatus === 'progress') {
                          if (!item.startDate) {
                            updated.startDate = now.split('T')[0];
                          }
                          delete updated.wishlistMonth;
                          delete updated.completedDate;
                        } else {
                          delete updated.status;
                          delete updated.wishlistMonth;
                          delete updated.startDate;
                          delete updated.completedDate;
                        }
                        onUpdateItem(updated);
                      }}
                      title={item.status === 'progress' ? "取消进行中状态" : "标记为进行中"}
                      className={`flex-1 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 transition-all border rounded-none cursor-pointer ${
                        item.status === 'progress'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-750'
                      }`}
                    >
                      <Play size={11} fill={item.status === 'progress' ? 'currentColor' : 'none'} />
                      在看
                    </button>

                    {/* Option 3: Completed */}
                    <button
                      onClick={() => {
                        const newStatus = item.status === 'completed' ? undefined : 'completed';
                        const now = new Date().toISOString();
                        const updated: MediaItem = {
                          ...item,
                          status: newStatus,
                          updatedAt: now,
                        };
                        if (newStatus === 'completed') {
                          if (!item.completedDate) {
                            updated.completedDate = now.split('T')[0];
                          }
                          delete updated.wishlistMonth;
                        } else {
                          delete updated.status;
                          delete updated.wishlistMonth;
                          delete updated.startDate;
                          delete updated.completedDate;
                        }
                        onUpdateItem(updated);
                      }}
                      title={item.status === 'completed' ? "取消已完成状态" : "标记为已完成"}
                      className={`flex-1 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 transition-all border rounded-none cursor-pointer ${
                        item.status === 'completed'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-750'
                      }`}
                    >
                      <Check size={11} />
                      已看
                    </button>
                  </div>
                </div>

                {(item.startDate || item.completedDate) && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    {item.startDate && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">开启日期</span>
                        <span className="text-[12px] text-zinc-600 dark:text-zinc-300">{item.startDate}</span>
                      </div>
                    )}
                    {item.completedDate && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">结案日期</span>
                        <span className="text-[12px] text-zinc-600 dark:text-zinc-300">{item.completedDate}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recorded Date at the bottom of the Left Side List */}
            <div className="pt-6 border-t border-[#dcd6cb]/60 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-serif">
              <span className="font-bold tracking-wider uppercase">录入于 / RECORDED</span>
              <span className="font-sans">
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* RIGHT: Editable details and logs (9/12) */}
          <div className="md:col-span-9 flex flex-col space-y-6">
            {/* Top Row: Preference & Companion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF8F5] dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2d3137] flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block font-serif">评价 / RATING</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBinaryRatingClick('like')}
                    className={`flex-1 py-1.5 text-[12px] font-bold transition-all border rounded-none cursor-pointer font-serif ${
                      rating === 10
                        ? 'bg-[#4A3B32] text-[#FBF9F3] border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] dark:border-[#DDDAC4] shadow-sm'
                        : 'bg-white hover:bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    ❤️ 好看
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBinaryRatingClick('dislike')}
                    className={`flex-1 py-1.5 text-[12px] font-bold transition-all border rounded-none cursor-pointer font-serif ${
                      rating === 1
                        ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200 shadow-sm'
                        : 'bg-white hover:bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    💢 一般
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2d3137]">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block font-serif">一同 / TOGETHER</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold font-serif">与谁一同</label>
                    <input 
                      type="text"
                      placeholder="谁..."
                      value={item.watchedWith || ''}
                      onChange={(e) => onUpdateItem({ ...item, watchedWith: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                      className="w-full text-[12px] bg-transparent border-b border-zinc-200 dark:border-zinc-800 py-1 focus:outline-none focus:border-zinc-400 font-serif"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold font-serif">何处一同</label>
                    <input 
                      type="text"
                      placeholder="何地..."
                      value={item.watchedWithLocation || ''}
                      onChange={(e) => onUpdateItem({ ...item, watchedWithLocation: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                      className="w-full text-[12px] bg-transparent border-b border-zinc-200 dark:border-zinc-800 py-1 focus:outline-none focus:border-zinc-400 font-serif"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Tabs */}
            <div className="flex flex-col space-y-4 flex-grow">
              <div className="flex border-b border-[#dcd6cb] dark:border-[#2d3137]">
                <button
                  onClick={() => setActiveTab('note')}
                  className={`py-2 px-6 text-[12px] font-bold border-b-2 transition-all cursor-pointer rounded-none uppercase tracking-widest font-serif ${
                    activeTab === 'note'
                      ? 'border-[#4A3B32] dark:border-[#e3e4e6] text-[#4A3B32] dark:text-[#e3e4e6]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  个人感悟 / NOTES
                </button>
                <button
                  onClick={() => setActiveTab('reread')}
                  className={`py-2 px-6 text-[12px] font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-none uppercase tracking-widest font-serif ${
                    activeTab === 'reread'
                      ? 'border-[#4A3B32] dark:border-[#e3e4e6] text-[#4A3B32] dark:text-[#e3e4e6]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <History size={12} />
                  <span>重温记录 ({item.reReadCount})</span>
                </button>
              </div>

              <div className="flex-grow min-h-[300px]">
                {activeTab === 'note' ? (
                  <div className="space-y-5 animate-fade-in flex flex-col h-full">
                    <textarea
                      placeholder="记录此刻的心情、引用或深度思考..."
                      value={noteText}
                      onPaste={handlePaste}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full flex-grow text-[14px] bg-[#fdfdfd] dark:bg-zinc-950/20 border border-[#dcd6cb] dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-none p-5 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 resize-none leading-relaxed font-serif shadow-inner"
                    />

                    {/* Image Attachments Gallery */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">附件图片 / ATTACHMENTS</span>
                        <div className="flex items-center gap-2">
                           {imageUploading && <Loader2 size={12} className="animate-spin text-zinc-400" />}
                           <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-bold text-[#4A3B32] dark:text-[#DDDAC4] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Camera size={12} />
                            添加多张图片
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {noteImages.map((img, idx) => (
                          <div 
                            key={idx} 
                            className="relative w-20 h-20 bg-zinc-100 dark:bg-zinc-900 border border-[#dcd6cb] dark:border-zinc-800 group cursor-pointer overflow-hidden"
                            onClick={() => setFullscreenImageIndex(idx)}
                          >
                            <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`attachment-${idx}`} />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {noteImages.length === 0 && !imageUploading && (
                          <div className="w-full py-8 border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                             <Camera size={20} className="opacity-20" />
                             <span className="text-[10px] uppercase tracking-widest">暂无附件图片</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    {/* Add Re-read Form */}
                    <div className="p-5 bg-zinc-50 dark:bg-[#111214] border border-[#dcd6cb] dark:border-zinc-800 space-y-4">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">新增重温记录</div>
                      <form onSubmit={handleAddReRead} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-serif">重温日期</label>
                          <input 
                            type="date" 
                            value={reReadDate}
                            onChange={(e) => setReReadDate(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-zinc-400 font-serif"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-serif">重温心得</label>
                          <textarea 
                            placeholder="这次有什么不同的感悟吗？"
                            value={reReadNote}
                            onChange={(e) => setReReadNote(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 min-h-[80px] focus:outline-none focus:border-zinc-400 resize-none font-serif"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full py-2.5 bg-[#4A3B32] dark:bg-[#DDDAC4] text-white dark:text-[#111214] text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                        >
                          确认添加 / ADD LOG
                        </button>
                      </form>
                    </div>

                    {/* Records List */}
                    <div className="space-y-3">
                      {item.reReadLogs && item.reReadLogs.length > 0 ? (
                        item.reReadLogs.map((log, idx) => (
                          <div key={log.id || idx} className="p-4 border border-[#dcd6cb] dark:border-zinc-800 bg-white dark:bg-[#15171a] space-y-2 group">
                             <div className="flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900 pb-2 mb-2">
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 font-mono">#{item.reReadLogs.length - idx}</span>
                                   <div className="flex items-center gap-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                     <Calendar size={11} className="text-zinc-400" />
                                     <span>{log.date}</span>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteReRead(log.id)}
                                  className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                             </div>
                             {log.note && (
                               <p className="text-[12px] text-zinc-600 dark:text-zinc-400 italic leading-relaxed font-serif border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
                                 "{log.note}"
                               </p>
                             )}
                          </div>
                        ))
                      ) : (
                        <div className="p-12 border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2 opacity-50">
                           <History size={24} className="mx-auto" />
                           <div className="text-[10px] font-bold uppercase tracking-widest">暂无重温记录</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Fullscreen Carousel Overlay */}
      <AnimatePresence>
        {fullscreenImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center select-none"
            onClick={() => setFullscreenImageIndex(null)}
          >
            <div className="absolute top-6 right-6 flex items-center gap-6">
               <span className="text-white/40 text-sm tracking-widest">
                 {fullscreenImageIndex + 1} / {noteImages.length}
               </span>
               <button className="text-white hover:text-red-500 transition-colors cursor-pointer"><X size={28} /></button>
            </div>

            {/* Navigation Buttons */}
            {noteImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImageIndex(prev => (prev! === 0 ? noteImages.length - 1 : prev! - 1));
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-4 text-white hover:bg-white/10 transition-colors cursor-pointer rounded-full"
                >
                  <ChevronDown size={32} className="rotate-90" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImageIndex(prev => (prev! === noteImages.length - 1 ? 0 : prev! + 1));
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-white hover:bg-white/10 transition-colors cursor-pointer rounded-full"
                >
                  <ChevronDown size={32} className="-rotate-90" />
                </button>
              </>
            )}

            <motion.img 
              key={fullscreenImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={noteImages[fullscreenImageIndex]} 
              className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl"
              alt="fullscreen-view"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
