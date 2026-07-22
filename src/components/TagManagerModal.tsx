/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Check, Search, Filter, Book, Film, Tv, Music, Gamepad, Sparkles, Box, Globe, Layers, ChevronDown } from 'lucide-react';
import { TagDefinition, MediaType, MEDIA_TYPE_LABELS, MediaItem } from '../types';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagDefinitions: TagDefinition[];
  mediaItems: MediaItem[];
  onUpdateTagDefinitions: (newDefs: TagDefinition[]) => void;
  onRenameTagInItems: (oldName: string, newName: string) => void;
  onDeleteTagInItems: (tagName: string) => void;
}

const getCategoryIcon = (type: MediaType | 'global' | 'all', size = 12) => {
  switch (type) {
    case 'book': return <Book size={size} />;
    case 'movie': return <Film size={size} />;
    case 'tv': return <Tv size={size} />;
    case 'anime': return <Sparkles size={size} />;
    case 'music': return <Music size={size} />;
    case 'game': return <Gamepad size={size} />;
    case 'other': return <Box size={size} />;
    case 'global': return <Globe size={size} />;
    case 'all': default: return <Layers size={size} />;
  }
};

function CategorySelect({
  value,
  onChange,
  className = "",
}: {
  value: MediaType | 'global';
  onChange: (val: MediaType | 'global') => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options: { id: MediaType | 'global'; label: string }[] = [
    { id: 'global', label: '通用' },
    { id: 'book', label: '书籍' },
    { id: 'movie', label: '电影' },
    { id: 'tv', label: '剧集' },
    { id: 'anime', label: '动漫' },
    { id: 'music', label: '音乐' },
    { id: 'game', label: '游戏' },
    { id: 'other', label: '其他' },
  ];

  const currentOption = options.find(o => o.id === value) || options[0];

  return (
    <div className={`relative min-w-[120px] ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-200 px-3 py-2 flex items-center justify-between gap-2 hover:border-[#4A3B32] dark:hover:border-[#DDDAC4] cursor-pointer"
      >
        <span className="flex items-center gap-1.5 font-sans whitespace-nowrap">
          {getCategoryIcon(currentOption.id, 13)}
          <span>{currentOption.label}</span>
        </span>
        <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white dark:bg-[#1A1C1E] border border-[#dcd6cb] dark:border-[#2D3137] shadow-xl py-1 max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-[#F4F0E6] dark:hover:bg-[#25272A] cursor-pointer text-xs ${
                  opt.id === value ? 'font-bold text-[#4A3B32] dark:text-[#DDDAC4] bg-[#F4F0E6]/60 dark:bg-[#25272A]/60' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {getCategoryIcon(opt.id, 12)}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TagManagerModal({
  isOpen,
  onClose,
  tagDefinitions,
  mediaItems,
  onUpdateTagDefinitions,
  onRenameTagInItems,
  onDeleteTagInItems,
}: TagManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeTab, setSelectedTypeTab] = useState<MediaType | 'global' | 'all'>('all');
  
  // New Tag Form State
  const [newTagName, setNewTagName] = useState('');
  const [newTagScope, setNewTagScope] = useState<MediaType | 'global'>('global');

  // Editing State
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editScope, setEditScope] = useState<MediaType | 'global'>('global');

  // Mouse drag-to-scroll state for category tabs
  const tabScrollRef = React.useRef<HTMLDivElement>(null);
  const [isTabDragging, setIsTabDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  // Lock background body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTabMouseDown = (e: React.MouseEvent) => {
    if (!tabScrollRef.current) return;
    setIsTabDragging(true);
    setDragStartX(e.pageX - tabScrollRef.current.offsetLeft);
    setDragScrollLeft(tabScrollRef.current.scrollLeft);
  };

  const handleTabMouseLeaveOrUp = () => {
    setIsTabDragging(false);
  };

  const handleTabMouseMove = (e: React.MouseEvent) => {
    if (!isTabDragging || !tabScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabScrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    tabScrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  if (!isOpen) return null;

  // Calculate tag usage counts
  const tagCounts: Record<string, number> = {};
  mediaItems.forEach(item => {
    (item.tags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;

    // Check duplicate
    if (tagDefinitions.some(t => t.name.toLowerCase() === clean.toLowerCase())) {
      alert(`标签 "#${clean}" 已经存在！`);
      return;
    }

    const newDef: TagDefinition = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      mediaType: newTagScope,
    };

    onUpdateTagDefinitions([...tagDefinitions, newDef]);
    setNewTagName('');
  };

  const handleStartEdit = (tag: TagDefinition) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditScope(tag.mediaType || 'global');
  };

  const handleSaveEdit = (tag: TagDefinition) => {
    const clean = editName.trim();
    if (!clean) return;

    // Check duplicate if name changed
    if (clean.toLowerCase() !== tag.name.toLowerCase() && tagDefinitions.some(t => t.name.toLowerCase() === clean.toLowerCase())) {
      alert(`标签 "#${clean}" 已经存在！`);
      return;
    }

    // Update tag in definitions
    const updatedDefs = tagDefinitions.map(t => 
      t.id === tag.id ? { ...t, name: clean, mediaType: editScope } : t
    );
    onUpdateTagDefinitions(updatedDefs);

    // If name changed, rename in all media items
    if (clean !== tag.name) {
      onRenameTagInItems(tag.name, clean);
    }

    setEditingTagId(null);
  };

  const handleDeleteTag = (tag: TagDefinition) => {
    const usageCount = tagCounts[tag.name] || 0;
    const confirmMsg = usageCount > 0 
      ? `标签 "#${tag.name}" 正被 ${usageCount} 个归档使用。删除标签定义后，是否同时从已归档项目中移除该标签？`
      : `确认删除标签 "#${tag.name}" 吗？`;

    if (!window.confirm(confirmMsg)) return;

    // Remove from tag definitions
    const updatedDefs = tagDefinitions.filter(t => t.id !== tag.id);
    onUpdateTagDefinitions(updatedDefs);

    // If used in items, remove tag from items
    if (usageCount > 0) {
      onDeleteTagInItems(tag.name);
    }
  };

  // Filter tags based on search and tab
  const filteredTags = tagDefinitions.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedTypeTab === 'all') return true;
    if (selectedTypeTab === 'global') return !tag.mediaType || tag.mediaType === 'global';
    return tag.mediaType === selectedTypeTab;
  });

  const mediaTypesList: { id: MediaType | 'global' | 'all'; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'global', label: '通用' },
    { id: 'book', label: '书籍' },
    { id: 'movie', label: '电影' },
    { id: 'tv', label: '剧集' },
    { id: 'anime', label: '动漫' },
    { id: 'music', label: '音乐' },
    { id: 'game', label: '游戏' },
    { id: 'other', label: '其他' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-serif"
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-2xl bg-[#FBF9F3] dark:bg-[#16181a] border border-[#dcd6cb] dark:border-[#2D3137] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dcd6cb] dark:border-[#2D3137] flex items-center justify-between bg-[#F4F0E6] dark:bg-[#111214]">
          <div className="flex items-center gap-2">
            <Tag className="text-[#4A3B32] dark:text-[#DDDAC4]" size={18} />
            <h3 className="text-base font-bold text-[#4A3B32] dark:text-[#DDDAC4] tracking-wide">
              标签管理库
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans ml-1">
              (共 {tagDefinitions.length} 个标签)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add New Tag Section */}
        <div className="p-5 border-b border-[#dcd6cb] dark:border-[#2D3137] bg-white dark:bg-[#191b1e]">
          <h4 className="text-xs font-bold text-[#4A3B32] dark:text-[#DDDAC4] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Plus size={14} className="text-[#4A3B32] dark:text-[#DDDAC4]" />
            <span>新建标签</span>
          </h4>
          <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              placeholder="输入标签名称 (如: 科幻、心理学、高分热映...)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-grow text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:border-[#4A3B32]"
            />

            <CategorySelect
              value={newTagScope}
              onChange={setNewTagScope}
            />

            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="px-4 py-2 text-xs font-bold bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214] hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
            >
              <Plus size={14} />
              <span>添加标签</span>
            </button>
          </form>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-[#dcd6cb] dark:border-[#2D3137] bg-[#FAF8F5] dark:bg-[#131416] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between min-w-0">
          {/* Scope Filter Tabs - Drag and Wheel Horizontal Scroll without visible scrollbar */}
          <div 
            ref={tabScrollRef}
            onMouseDown={handleTabMouseDown}
            onMouseLeave={handleTabMouseLeaveOrUp}
            onMouseUp={handleTabMouseLeaveOrUp}
            onMouseMove={handleTabMouseMove}
            onWheel={(e) => {
              if (e.deltaY !== 0 && tabScrollRef.current) {
                tabScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto text-xs min-w-0 flex-1 touch-pan-x whitespace-nowrap select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {mediaTypesList.map(m => {
              const count = m.id === 'all'
                ? tagDefinitions.length
                : m.id === 'global'
                  ? tagDefinitions.filter(t => !t.mediaType || t.mediaType === 'global').length
                  : tagDefinitions.filter(t => t.mediaType === m.id).length;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedTypeTab(m.id)}
                  className={`shrink-0 px-2.5 py-1 text-xs transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                    selectedTypeTab === m.id
                      ? 'bg-[#3D3028] text-white border-[#3D3028] dark:bg-[#DDDAC4] dark:text-[#111214] font-bold'
                      : 'bg-[#EFECE4] text-[#4A3B32] border-[#D8D1C2] dark:bg-[#25272A] dark:text-[#D5D0C3] dark:border-[#353A40] hover:border-[#4A3B32]'
                  }`}
                >
                  {getCategoryIcon(m.id, 12)}
                  <span>{m.label} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[150px] shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1 bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Tags List */}
        <div className="p-5 overflow-y-auto flex-grow space-y-2 max-h-[50vh]">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => {
              const isEditing = editingTagId === tag.id;
              const isBound = tag.mediaType && tag.mediaType !== 'global';
              const usageCount = tagCounts[tag.name] || 0;

              if (isEditing) {
                return (
                  <div key={tag.id} className="p-3 bg-stone-500/5 dark:bg-stone-500/10 border border-[#4A3B32] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                    <div className="flex flex-1 gap-2 items-center">
                      <span className="text-xs font-bold text-zinc-400">#</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-grow text-xs bg-white dark:bg-[#111214] border border-[#dcd6cb] dark:border-[#2D3137] px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                      <CategorySelect
                        value={editScope}
                        onChange={setEditScope}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => handleSaveEdit(tag)}
                        className="px-3 py-1 text-xs bg-[#4A3B32] text-white dark:bg-[#DDDAC4] dark:text-[#111214] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Check size={12} />
                        <span>保存</span>
                      </button>
                      <button
                        onClick={() => setEditingTagId(null)}
                        className="px-2.5 py-1 text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tag.id}
                  className="p-3 bg-white dark:bg-[#191b1e] border border-[#dcd6cb] dark:border-[#2D3137] flex items-center justify-between group hover:border-[#4A3B32]/50 transition-all"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-[#4A3B32] dark:text-[#DDDAC4]">
                      #{tag.name}
                    </span>

                    {isBound ? (
                      <span className="text-[10px] px-2 py-0.5 bg-[#EFECE4] text-[#4A3B32] dark:bg-[#25272A] dark:text-[#D5D0C3] border border-[#D8D1C2] dark:border-[#353A40] font-bold flex items-center gap-1">
                        {getCategoryIcon(tag.mediaType as MediaType, 11)}
                        <span>{MEDIA_TYPE_LABELS[tag.mediaType as MediaType]}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-[#FAF8F5] text-zinc-600 dark:bg-[#141517] dark:text-zinc-400 border border-[#E6E0D5] dark:border-[#2D3137] flex items-center gap-1">
                        <Globe size={11} />
                        <span>通用</span>
                      </span>
                    )}

                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-sans">
                      ({usageCount} 项引用)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(tag)}
                      className="p-1.5 text-zinc-500 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] transition-colors cursor-pointer"
                      title="编辑标签"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="删除标签"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-zinc-400 text-xs italic">
              {searchQuery ? '没有找到符合搜索条件的标签' : '暂无标签定义，可在上方输入并新建'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#dcd6cb] dark:border-[#2D3137] bg-[#F4F0E6] dark:bg-[#111214] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214] hover:opacity-90 cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
