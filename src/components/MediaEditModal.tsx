/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Plus, Calendar, Tag, Image as ImageIcon, ChevronDown, ChevronUp, Users, MapPin, Settings } from 'lucide-react';
import { MediaItem, MediaType, Collection, MEDIA_TYPE_LABELS, TagDefinition } from '../types';
import { generateSvgCover, DEFAULT_TAG_DEFINITIONS } from '../utils/helpers';
import { apiFetch } from '../utils/api';
import FeatureGuideBanner from './FeatureGuideBanner';

interface MediaEditModalProps {
  item?: MediaItem; // If present, we are editing; if absent, creating
  collections: Collection[];
  tagDefinitions?: TagDefinition[];
  onRegisterTag?: (name: string, mediaType?: MediaType | 'global') => void;
  onOpenTagManager?: () => void;
  onSave: (item: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
}

export default function MediaEditModal({
  item,
  collections,
  tagDefinitions,
  onRegisterTag,
  onOpenTagManager,
  onSave,
  onClose,
}: MediaEditModalProps) {
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [type, setType] = useState<MediaType>('book');
  const [creator, setCreator] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MediaItem['status']>('wishlist');
  const [progressText, setProgressText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [watchedWith, setWatchedWith] = useState('');
  const [watchedWithLocation, setWatchedWithLocation] = useState('');
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

  // Lock background body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
      setOriginalTitle(item.originalTitle || '');
      setType(item.type);
      setCreator(item.creator || '');
      setCoverUrl(item.coverUrl || '');
      setDescription(item.description || '');
      setStatus(item.status);
      setProgressText(item.progressText || '');
      setStartDate(item.startDate || '');
      setCompletedDate(item.completedDate || '');
      setWatchedWith(item.watchedWith || '');
      setWatchedWithLocation(item.watchedWithLocation || '');
      setSelectedTags(item.tags || []);
      setSelectedColIds(item.collections || []);
      setWishlistMonth(item.wishlistMonth || '');
      setShowAdvanced(true); // default to expanded when editing
    } else {
      // Clear fields for new item
      setTitle('');
      setOriginalTitle('');
      setType('book');
      setCreator('');
      setCoverUrl('');
      setDescription('');
      setStatus('wishlist');
      setProgressText('');
      setStartDate('');
      setCompletedDate('');
      setWatchedWith('');
      setWatchedWithLocation('');
      setSelectedTags([]);
      setSelectedColIds([]);
      setWishlistMonth('');
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
      const adminToken = sessionStorage.getItem('admin_token') || '';

      const res = await apiFetch('/api/parse-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken.trim() ? { 'x-admin-token': adminToken.trim() } : {}),
        },
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
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || '无法解析该网址或内容，请检查链接或手动输入。');
      }

      const media = data.data;
      setTitle(media.title || '');
      setOriginalTitle(media.originalTitle || '');
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
    const finalCover = coverUrl.trim() || generateSvgCover(title.trim(), creator.trim(), type);

    onSave({
      id: item?.id,
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      type,
      creator: creator.trim(),
      coverUrl: finalCover,
      description: description.trim(),
      sourceUrl: item?.sourceUrl,
      status,
      progressText: status === 'progress' ? progressText.trim() : '',
      startDate: startDate || undefined,
      completedDate: status === 'completed' ? completedDate : undefined,
      watchedWith: watchedWith.trim() || undefined,
      watchedWithLocation: watchedWithLocation.trim() || undefined,
      reReadCount: item?.reReadCount || 0,
      reReadLogs: item?.reReadLogs || [],
      personalRating: item?.personalRating || 0,
      personalNote: item?.personalNote || '',
      noteImages: item?.noteImages || [],
      tags: selectedTags,
      collections: selectedColIds,
      wishlistMonth: status === 'wishlist' ? (wishlistMonth || undefined) : undefined,
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
          
          {/* AI Link/Search Bar (Highly prominent when creating or editing a record) */}
          <FeatureGuideBanner
            guideKey="ai_parse_guide"
            title="链接解析与元数据自动补全"
            badge="智能填单"
            description="粘贴豆瓣、IMDb、Steam、Apple Music 或网易云平台的作品链接，点击“解析填充”即可自动提取封面、作品原名、主创团队与简介。"
          />

          <div data-guide="parse-media" className="p-4 rounded-none bg-white/55 dark:bg-zinc-950/50 border border-[#dcd6cb] dark:border-[#2D3137] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Sparkles size={14} className="text-amber-500 dark:text-amber-400 animate-pulse" />
                <span>输入链接或标题解析</span>
              </div>
              <p className="text-[10.5px] text-zinc-550 dark:text-zinc-400 leading-normal font-serif">
                推荐使用豆瓣、IMDb、Steam、Apple Music、网易云音乐、维基百科链接。其他页面可尝试解析，失败后请手动补全。
              </p>
              <div className="flex flex-wrap gap-1.5 text-[9.5px] text-zinc-500 dark:text-zinc-400">
                {['豆瓣', 'IMDb', 'Steam', 'Apple Music', '网易云音乐', '维基百科'].map(site => (
                  <span key={site} className="px-2 py-0.5 border border-[#dcd6cb] dark:border-[#2D3137] bg-white/70 dark:bg-zinc-900/60">
                    {site}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="粘贴推荐站点链接，或直接输入书影音名称"
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

          {/* Tags and Collections Section (Placed right below AI parsing, above basic book info) */}
          <div className="p-4 rounded-none bg-white/45 dark:bg-zinc-950/30 border border-[#dcd6cb] dark:border-[#2D3137] space-y-4 font-serif">
            {/* Collections Selector */}
            {collections.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">合集归类</label>
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
                            ? 'bg-[#4A3B32] text-[#FBF9F3] dark:bg-[#DDDAC4] dark:text-[#111214] border-transparent font-bold'
                            : 'bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-[#dcd6cb] dark:border-[#2D3137] hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended & Custom Tags Section */}
            <div className="space-y-3 pt-2 border-t border-[#dcd6cb] dark:border-[#2D3137]">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  <Tag size={12} className="text-[#8c7a6b] dark:text-[#a8988a]" />
                  <span>标签选择与管理</span>
                </h4>
                {onOpenTagManager && (
                  <button
                    type="button"
                    onClick={onOpenTagManager}
                    className="text-[10px] font-bold text-[#4A3B32] dark:text-[#DDDAC4] hover:underline cursor-pointer flex items-center gap-1 font-serif"
                  >
                    <span>管理标签库</span>
                    <Settings size={11} />
                  </button>
                )}
              </div>

              {(() => {
                const allDefs = tagDefinitions && tagDefinitions.length > 0 ? tagDefinitions : DEFAULT_TAG_DEFINITIONS;
                const boundTagsForType = allDefs.filter(t => t.mediaType === type);
                const globalTags = allDefs.filter(t => t.mediaType === 'global' || !t.mediaType);

                return (
                  <div className="space-y-3">
                    {/* Bound tags for current media type */}
                    {boundTagsForType.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#4A3B32] dark:text-[#DDDAC4] block">
                          【{MEDIA_TYPE_LABELS[type]}】绑定专属标签：
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {boundTagsForType.map(tagDef => {
                            const isSelected = selectedTags.includes(tagDef.name);
                            return (
                              <button
                                key={tagDef.id}
                                type="button"
                                onClick={() => toggleTag(tagDef.name)}
                                className={`px-2.5 py-1 text-[10px] border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#3D3028] text-white border-[#3D3028] dark:bg-[#DDDAC4] dark:text-[#111214] font-bold shadow-xs'
                                    : 'bg-[#EFECE4] text-[#4A3B32] border-[#D8D1C2] dark:bg-[#25272A] dark:text-[#D5D0C3] dark:border-[#353A40] hover:border-[#4A3B32]'
                                }`}
                              >
                                #{tagDef.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Standalone / Global tags */}
                    {globalTags.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block">
                          通用独立标签：
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {globalTags.map(tagDef => {
                            const isSelected = selectedTags.includes(tagDef.name);
                            return (
                              <button
                                key={tagDef.id}
                                type="button"
                                onClick={() => toggleTag(tagDef.name)}
                                className={`px-2.5 py-1 text-[10px] border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#4A3B32] text-white border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] font-bold shadow-xs'
                                    : 'bg-[#F2EFE9] text-[#52463E] border-[#DDD7C8] dark:bg-[#1C1E20] dark:text-[#C5C0B3] dark:border-[#2D3137] hover:border-[#4A3B32]'
                                }`}
                              >
                                #{tagDef.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Selected tags & custom tag entry */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block">已选与自定义标签：</span>
                <div className="flex flex-wrap gap-1.5 items-center bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] p-2 min-h-[36px]">
                  {selectedTags.length > 0 ? (
                    selectedTags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#FAF8F5] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-[#E6E0D5] dark:border-zinc-700 font-medium">
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => toggleTag(t)}
                          className="text-[9px] hover:text-red-500 cursor-pointer ml-1 font-bold"
                        >
                          x
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">尚未选择或输入任何标签</span>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="手动输入新标签..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const cleanTag = customTagInput.trim();
                        if (cleanTag) {
                          if (!selectedTags.includes(cleanTag)) {
                            setSelectedTags([...selectedTags, cleanTag]);
                          }
                          if (onRegisterTag) {
                            onRegisterTag(cleanTag, type);
                          }
                          setCustomTagInput('');
                        }
                      }
                    }}
                    className="flex-grow text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-[#635C56]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanTag = customTagInput.trim();
                      if (cleanTag) {
                        if (!selectedTags.includes(cleanTag)) {
                          setSelectedTags([...selectedTags, cleanTag]);
                        }
                        if (onRegisterTag) {
                          onRegisterTag(cleanTag, type);
                        }
                        setCustomTagInput('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214] hover:opacity-90 font-medium cursor-pointer"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          </div>

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
                      <img 
                        src={coverUrl} 
                        alt="封面预览" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = generateSvgCover(title || '未知', creator || '佚名', type);
                        }}
                      />
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
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 font-semibold">原名 / 外文名</label>
                    <input
                      type="text"
                      placeholder="例如: Inception"
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
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

                  <FeatureGuideBanner
                    guideKey="joint_logging_guide"
                    title="同行印记与共同体会"
                    badge="一同记录"
                    description="记录与谁一起观看/阅读、经历地点与共同感悟，将影视书音记忆转化为珍贵的双人/群体陪伴记忆。"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1 font-semibold">
                        <Users size={11} />
                        <span>共同观看/阅读 (同行对象)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例如：家人、张三、小明..."
                        value={watchedWith}
                        onChange={(e) => setWatchedWith(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-[#635C56]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1 font-semibold">
                        <MapPin size={11} />
                        <span>同看地点与备注</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例如：北京影院、家客厅、旅途中..."
                        value={watchedWithLocation}
                        onChange={(e) => setWatchedWithLocation(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-900 dark:text-zinc-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-[#635C56]"
                      />
                    </div>
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
