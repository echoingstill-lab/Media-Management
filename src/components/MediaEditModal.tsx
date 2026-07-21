/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Plus, Calendar, Tag, Image as ImageIcon, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { MediaItem, MediaType, Collection, MEDIA_TYPE_LABELS } from '../types';

interface MediaEditModalProps {
  item?: MediaItem; // If present, we are editing; if absent, creating
  collections: Collection[];
  onSave: (item: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
}

export default function MediaEditModal({
  item,
  collections,
  onSave,
  onClose,
}: MediaEditModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('book');
  const [creator, setCreator] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MediaItem['status']>('wishlist');
  const [progressText, setProgressText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [watchedWith, setWatchedWith] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedColIds, setSelectedColIds] = useState<string[]>([]);
  const [wishlistMonth, setWishlistMonth] = useState('');

  const getCurrentMonthStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  // Advanced section collapsible state (collapsed by default for creation, open for editing)
  const [showAdvanced, setShowAdvanced] = useState(!!item);

  // Category-specific pre-defined tags from localStorage
  const [categoryTags, setCategoryTags] = useState<Record<MediaType, string[]>>(() => {
    const saved = localStorage.getItem('media_archive_category_tags');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      book: ['经典文学', '科幻奇幻', '专业工具', '心理社科', '轻松休闲'],
      movie: ['剧情佳作', '悬疑烧脑', '温暖治愈', '科幻未来', '文艺纪录'],
      tv: ['追剧首选', '犯罪推理', '生活日常', '历史史诗', '情景喜剧'],
      anime: ['热血冒险', '温馨治愈', '青春日常', '科幻末日', '奇幻神作'],
      music: ['舒缓白噪', '华语流行', '摇滚先锋', '古典器乐', '电子氛围'],
      game: ['开放世界', '动作冒险', '独立神作', '策略模拟', '高难度'],
      other: ['播客访谈', '讲座展览', '手记画册', '随笔摘录']
    };
  });

  const [isEditingPresetTags, setIsEditingPresetTags] = useState(false);
  const [newPresetTagInput, setNewPresetTagInput] = useState('');

  // Persist category tags
  useEffect(() => {
    localStorage.setItem('media_archive_category_tags', JSON.stringify(categoryTags));
  }, [categoryTags]);

  const deletePresetTag = (tagToDelete: string) => {
    setCategoryTags(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(t => t !== tagToDelete)
    }));
  };

  const addPresetTag = () => {
    const cleanTag = newPresetTagInput.trim();
    if (cleanTag && !(categoryTags[type] || []).includes(cleanTag)) {
      setCategoryTags(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), cleanTag]
      }));
      setNewPresetTagInput('');
    }
  };

  // AI import state
  const [linkInput, setLinkInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Hydrate fields if editing
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setType(item.type);
      setCreator(item.creator || '');
      setCoverUrl(item.coverUrl || '');
      setDescription(item.description || '');
      setStatus(item.status);
      setProgressText(item.progressText || '');
      setStartDate(item.startDate || '');
      setCompletedDate(item.completedDate || '');
      setWatchedWith(item.watchedWith || '');
      setSelectedTags(item.tags || []);
      setSelectedColIds(item.collections || []);
      setWishlistMonth(item.wishlistMonth || '');
      setShowAdvanced(true); // default to expanded when editing
    } else {
      // Clear fields for new item
      setTitle('');
      setType('book');
      setCreator('');
      setCoverUrl('');
      setDescription('');
      setStatus('wishlist');
      setProgressText('');
      setStartDate('');
      setCompletedDate('');
      setWatchedWith('');
      setSelectedTags([]);
      setSelectedColIds([]);
      setWishlistMonth(getCurrentMonthStr());
      setShowAdvanced(false); // default to collapsed for creating to keep it simple
    }
  }, [item]);

  // Handle AI Import parser
  const handleAiParse = async () => {
    if (!linkInput.trim()) {
      setAiError('请先输入任何网络连接链接或作品名称。');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const aiSettingsRaw = localStorage.getItem('ai_settings');
      const aiSettings = aiSettingsRaw ? JSON.parse(aiSettingsRaw) : null;
      const clientId = localStorage.getItem('media_archive_client_id');

      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: linkInput.trim(),
          userApiKey: aiSettings?.useCustomKey ? aiSettings.userApiKey : undefined,
          provider: aiSettings?.useCustomKey ? aiSettings.provider : undefined,
          baseUrl: aiSettings?.useCustomKey ? aiSettings.baseUrl : undefined,
          model: aiSettings?.useCustomKey ? aiSettings.model : undefined,
          clientId: clientId
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '解析失败，请直接输入名称录入。');
      }

      const media = data.data;
      setTitle(media.title || '');
      setType(media.type || 'book');
      setCreator(media.creator || '');
      setCoverUrl(media.coverUrl || '');
      setDescription(media.description || '');
      if (media.tags && Array.isArray(media.tags)) {
        const merged = Array.from(new Set([...selectedTags, ...media.tags]));
        setSelectedTags(merged);
      }

      setLinkInput(''); // clear link input on success
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || '网络连接失败，请直接在下方手动录入信息。');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanTag = customTagInput.trim();
      if (cleanTag && !selectedTags.includes(cleanTag)) {
        setSelectedTags([...selectedTags, cleanTag]);
      }
      setCustomTagInput('');
    }
  };

  const toggleCollection = (colId: string) => {
    if (selectedColIds.includes(colId)) {
      setSelectedColIds(selectedColIds.filter(id => id !== colId));
    } else {
      setSelectedColIds([...selectedColIds, colId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Use default SVG cover card or provided fallback if empty
    const finalCover = coverUrl.trim() || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='300' height='400' fill='%231f2937'/><circle cx='150' cy='130' r='75' fill='%23374151' opacity='0.4'/><text x='50%' y='52%' text-anchor='middle' fill='%23f9fafb' font-family='sans-serif' font-weight='700' font-size='22'>${encodeURIComponent(title.substring(0, 10))}</text><text x='50%' y='64%' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-weight='500' font-size='13'>${encodeURIComponent(MEDIA_TYPE_LABELS[type] || '')}</text></svg>`;

    onSave({
      id: item?.id,
      title: title.trim(),
      type,
      creator: creator.trim(),
      coverUrl: finalCover,
      description: description.trim(),
      status,
      progressText: status === 'progress' ? progressText.trim() : '',
      startDate: startDate || undefined,
      completedDate: status === 'completed' ? completedDate : undefined,
      watchedWith: watchedWith.trim() || undefined,
      reReadCount: item?.reReadCount || 0,
      reReadLogs: item?.reReadLogs || [],
      personalRating: item?.personalRating || 0,
      personalNote: item?.personalNote || '',
      noteImages: item?.noteImages || [],
      tags: selectedTags,
      collections: selectedColIds,
      wishlistMonth: status === 'wishlist' ? (wishlistMonth || getCurrentMonthStr()) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FBF9F3] dark:bg-[#191B1E] border border-[#dcd6cb] dark:border-[#2D3137] rounded-none w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in font-serif text-zinc-800 dark:text-zinc-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#dcd6cb] dark:border-[#2D3137] flex items-center justify-between bg-zinc-50 dark:bg-[#111214]">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{item ? '编辑书影音档案' : '录入新档案'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-full transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-grow bg-white dark:bg-[#191B1E]">
          
          {/* AI Link/Search Bar (Highly prominent when creating a new record) */}
          {!item && (
            <div className="p-4 rounded-none bg-white/55 dark:bg-zinc-950/50 border border-[#dcd6cb] dark:border-[#2D3137] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Sparkles size={14} className="text-amber-500 dark:text-amber-400 animate-pulse" />
                <span>输入链接或标题极速识别</span>
              </div>
              <p className="text-[10.5px] text-zinc-550 dark:text-zinc-400 leading-normal font-serif">
                支持维基百科、IMDb、豆瓣、百度百科、新浪、Bangumi 等任何详情页链接，或直接输入作品标题：
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="粘贴网址链接，或直接输入书影音名称 (如《百年孤独》)"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAiParse();
                    }
                  }}
                  className="flex-grow text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-3 py-2.5 focus:outline-none focus:border-[#635C56] font-serif"
                />
                <button
                  type="button"
                  onClick={handleAiParse}
                  disabled={aiLoading}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none border-b-2 font-serif border-transparent text-zinc-500 hover:text-[#4A3B32] hover:border-[#4A3B32] dark:text-zinc-400 dark:hover:text-[#DDDAC4] dark:hover:border-[#DDDAC4] disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} className="text-amber-400" />
                  )}
                  <span>解析填充</span>
                </button>
              </div>
              {aiError && (
                <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">{aiError}</p>
              )}
            </div>
          )}

          {/* Form */}
          <form id="media-edit-form" onSubmit={handleSave} className="space-y-5">
            
            {/* The 3 Essential Core Fields Block (Cover, Title, Type) */}
            <div className="p-4 bg-white/45 dark:bg-zinc-950/30 rounded-none border border-[#dcd6cb] dark:border-[#2D3137] space-y-4">
              <h3 className="text-lg font-serif font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border-b border-[#dcd6cb] dark:border-[#2D3137] pb-1.5">基本信息</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                {/* Cover Preview Left */}
                <div className="sm:col-span-4 flex flex-col items-center">
                  <div className="relative aspect-[3/4] w-28 bg-white dark:bg-zinc-950 rounded-none overflow-hidden border border-[#dcd6cb] dark:border-[#2D3137] flex flex-col items-center justify-center text-center shadow-sm">
                    {coverUrl ? (
                      <img src={coverUrl} alt="封面预览" className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-2 text-zinc-400 dark:text-zinc-600">
                        <ImageIcon size={20} className="mx-auto mb-1 opacity-30" />
                        <span className="text-[9px] block">暂无图片</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full mt-2">
                    <input
                      type="url"
                      placeholder="图片链接 (可选)"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full text-[10px] text-center bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-500 dark:text-zinc-400 rounded-none px-2 py-1 focus:outline-none focus:border-[#635C56] font-serif"
                    />
                  </div>
                </div>

                {/* Right Inputs: Title & Type */}
                <div className="sm:col-span-8 flex flex-col justify-center space-y-3.5 font-serif">
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-semibold">名称 *</label>
                    <input
                      type="text"
                      required
                      placeholder="例如: 银翼杀手 2049"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-100 rounded-none px-3 py-2.5 focus:outline-none focus:border-[#635C56]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-semibold">媒体类别 *</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: 'book', label: '图书' },
                        { key: 'movie', label: '电影' },
                        { key: 'tv', label: '电视剧' },
                        { key: 'anime', label: '动漫' },
                        { key: 'music', label: '音乐' },
                        { key: 'game', label: '游戏' },
                        { key: 'other', label: '其他' },
                      ].map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setType(cat.key as MediaType)}
                          className={`py-1.5 rounded-none text-[11px] font-semibold border transition-all cursor-pointer ${
                            type === cat.key
                              ? 'bg-[#4A3B32] text-[#FBF9F3] border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] dark:border-[#DDDAC4] shadow-sm font-bold'
                              : 'bg-white/60 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-[#dcd6cb] dark:border-[#2D3137] hover:text-zinc-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible advanced details block */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3 rounded-none border border-dashed border-[#dcd6cb] dark:border-[#2D3137] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-[#635C56] bg-white/45 dark:bg-zinc-950/20 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                  <span>{showAdvanced ? '收起可选补充信息' : '展开补充更多属性 (作者、在读状态、日期、简介、标签及合集)'}</span>
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{showAdvanced ? '已展开' : '可选填'}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 p-4 rounded-none border border-[#dcd6cb] dark:border-[#2D3137] bg-white/45 dark:bg-zinc-950/10 animate-fade-in">
                  
                  {/* Creator and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">主创人员</label>
                      <input
                        type="text"
                        placeholder="留空即代表不展示"
                        value={creator}
                        onChange={(e) => setCreator(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-2 focus:outline-none focus:border-[#635C56]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">当前状态</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as MediaItem['status'])}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2 py-2 focus:outline-none focus:border-[#635C56]"
                      >
                        <option value="wishlist">计划清单</option>
                        <option value="progress">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="paused">已搁置</option>
                      </select>
                    </div>
                  </div>

                  {/* Wishlist Month Selector */}
                  {status === 'wishlist' && (
                    <div className="p-3 bg-white/65 dark:bg-zinc-900/60 rounded-none border border-[#dcd6cb] dark:border-[#2D3137] space-y-2 animate-fade-in">
                      <label className="text-[10px] text-zinc-550 dark:text-zinc-400 uppercase tracking-wider block font-semibold">计划哪个月份阅读/观看？</label>
                      <div className="flex gap-2">
                        <input
                          type="month"
                          value={wishlistMonth}
                          onChange={(e) => setWishlistMonth(e.target.value)}
                          className="bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#635C56] font-serif flex-grow sm:flex-grow-0"
                        />
                        <button
                          type="button"
                          onClick={() => setWishlistMonth('')}
                          className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 px-2 rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-[#dcd6cb] dark:border-[#2D3137]"
                        >
                          不设具体月份
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500">设定后，该记录将自动归档到对应月份的【首页想看清单】中展示，协助您提前规划和月末整理监督。</p>
                    </div>
                  )}

                  {/* Progress Text if 'progress' */}
                  {status === 'progress' && (
                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">进行进度</label>
                      <input
                        type="text"
                        placeholder="如: 第 5 集、进度 60%..."
                        value={progressText}
                        onChange={(e) => setProgressText(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-[#635C56]"
                      />
                    </div>
                  )}

                  {/* Dates & Together */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <Calendar size={10} />
                        <span>开始日期</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2 py-1.5 focus:outline-none focus:border-[#635C56] font-serif"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <Calendar size={10} />
                        <span>完成日期</span>
                      </label>
                      <input
                        type="date"
                        value={completedDate}
                        disabled={status !== 'completed'}
                        onChange={(e) => setCompletedDate(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2 py-1.5 focus:outline-none focus:border-[#635C56] font-serif disabled:opacity-30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Users size={10} />
                      <span>共同观看/阅读 (备注对象)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例如：家人、张三、小明..."
                      value={watchedWith}
                      onChange={(e) => setWatchedWith(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-[#635C56]"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">作品简介</label>
                    <textarea
                      placeholder="简短描述该作品 (留空则不在卡片和详情展示)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-2 focus:outline-none focus:border-[#635C56] resize-none leading-relaxed"
                    />
                  </div>

                  {/* Collections */}
                  {collections.length > 0 && (
                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">合集归类</label>
                      <div className="flex flex-wrap gap-1.5">
                        {collections.map(col => {
                          const isSelected = selectedColIds.includes(col.id);
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => toggleCollection(col.id)}
                              className={`px-2.5 py-1 rounded-none text-[10px] border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4A3B32] text-[#FBF9F3] dark:bg-[#DDDAC4] dark:text-[#111214] border-transparent font-medium'
                                  : 'bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-[#dcd6cb] dark:border-[#2D3137] hover:text-zinc-850 dark:hover:text-zinc-200'
                              }`}
                            >
                              {col.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended & Custom Tags Block */}
                  <div className="border-t border-zinc-800 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag size={12} />
                        <span>推荐类别标签</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingPresetTags(!isEditingPresetTags)}
                        className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      >
                        {isEditingPresetTags ? '完成预设' : '编辑可用预设'}
                      </button>
                    </div>

                    {isEditingPresetTags && (
                      <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800 space-y-2">
                        <p className="text-[9px] text-zinc-400">
                          管理当前【{MEDIA_TYPE_LABELS[type]}】分类的快速推荐标签：
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(categoryTags[type] || []).map(preset => (
                            <span key={preset} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                              <span>{preset}</span>
                              <button
                                type="button"
                                onClick={() => deletePresetTag(preset)}
                                className="text-red-400 hover:text-red-500 font-bold ml-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 max-w-xs">
                          <input
                            type="text"
                            placeholder="新增标签名称..."
                            value={newPresetTagInput}
                            onChange={(e) => setNewPresetTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addPresetTag();
                              }
                            }}
                            className="flex-grow text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-200 rounded px-2 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={addPresetTag}
                            className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700"
                          >
                            添加
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {(categoryTags[type] || []).map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-2.5 py-1 rounded-full text-[10px] border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium'
                                : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {/* Manual Tags */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-1.5">自定义标签 (回车添加)</span>
                      <div className="flex flex-wrap gap-1.5 items-center bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                        {selectedTags.filter(t => !(categoryTags[type] || []).includes(t)).map(t => (
                          <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            <span>{t}</span>
                            <button
                              type="button"
                              onClick={() => toggleTag(t)}
                              className="text-[9px] hover:text-red-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="手动输入并回车..."
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          onKeyDown={handleAddCustomTag}
                          className="flex-grow min-w-[120px] text-xs bg-transparent border-none text-zinc-200 focus:outline-none"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-[#dcd6cb] dark:border-[#2D3137] flex justify-end gap-3 bg-white dark:bg-[#111214] backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-none text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            form="media-edit-form"
            className="px-5 py-2 rounded-none text-xs font-bold bg-[#4A3B32] hover:bg-[#382B24] dark:bg-[#DDDAC4] dark:hover:bg-white text-[#FBF9F3] dark:text-[#111214] hover:shadow-lg transition-all cursor-pointer font-serif"
          >
            保存记录
          </button>
        </div>

      </div>
    </div>
  );
}
