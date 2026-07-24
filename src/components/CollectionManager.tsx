/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Folder, 
  Trash2, 
  ChevronRight, 
  Layers, 
  SquareCheck, 
  ArrowLeft, 
  FileText,
  X,
  ChevronDown,
  MoreVertical,
  Edit2,
  FolderPlus,
  MinusCircle
} from 'lucide-react';
import { Collection, MediaItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import FeatureGuideBanner from './FeatureGuideBanner';
import { getDisplayCoverUrl } from '../utils/imageProxy';

interface CollectionManagerProps {
  collections: Collection[];
  mediaItems: MediaItem[];
  onCreateCollection: (collection: Omit<Collection, 'id' | 'createdAt'>) => void;
  onDeleteCollection: (id: string) => void;
  onUpdateCollection: (id: string, updates: Partial<Collection>) => void;
  onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
  onSelectCollectionFilter: (collectionId: string | null) => void;
  selectedCollectionId: string | null;
  onSelectItem?: (id: string) => void;
}

export default function CollectionManager({
  collections,
  mediaItems,
  onCreateCollection,
  onDeleteCollection,
  onUpdateCollection,
  onUpdateItemCollections,
  onSelectCollectionFilter,
  selectedCollectionId,
  onSelectItem,
}: CollectionManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [parentForNewSub, setParentForNewSub] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('media_archive_expanded_collections');
    if (saved) return new Set(JSON.parse(saved));
    return new Set();
  });

  // Auto-expand all on first load if none are saved
  useEffect(() => {
    const saved = localStorage.getItem('media_archive_expanded_collections');
    if (!saved && collections.length > 0) {
      const allIds = collections.map(c => c.id);
      setExpandedIds(new Set(allIds));
    }
  }, [collections]);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem('media_archive_expanded_collections', JSON.stringify(Array.from(expandedIds)));
  }, [expandedIds]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateCollection({
      name: name.trim(),
      description: description.trim(),
      parentId: parentForNewSub,
    });

    // Auto-expand the newly created parent if it has children now
    if (parentForNewSub) {
      const newExpanded = new Set(expandedIds);
      newExpanded.add(parentForNewSub);
      setExpandedIds(newExpanded);
    }

    setName('');
    setDescription('');
    setParentForNewSub(null);
    setShowAddForm(false);
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);
  const [colContextMenu, setColContextMenu] = useState<{ x: number, y: number, colId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    // Align to the top left of the card, same as in App.tsx
    setContextMenu({ 
      x: rect.left, 
      y: rect.top, 
      itemId 
    });
    setColContextMenu(null);
  };

  const handleColContextMenu = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Align exactly to the bottom-left of the collection item for a neat boxed layout
    setColContextMenu({ 
      x: rect.left, 
      y: rect.bottom, 
      colId 
    });
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setColContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const getAllChildCollectionIds = (colId: string): string[] => {
    const ids = [colId];
    const children = collections.filter(c => c.parentId === colId);
    children.forEach(child => {
      ids.push(...getAllChildCollectionIds(child.id));
    });
    return ids;
  };

  const getDirectItemsForCollection = (colId: string | null) => {
    if (colId === null || colId === 'all-master') return mediaItems;
    return mediaItems.filter(item => item.collections.includes(colId));
  };

  const getItemsForCollection = (colId: string | null) => {
    if (colId === null || colId === 'all-master') return mediaItems;
    
    const allRelevantIds = getAllChildCollectionIds(colId);
    return mediaItems.filter(item => item.collections.some(id => allRelevantIds.includes(id)));
  };

  const renderCollectionTree = (parentId: string | null = null, depth = 0) => {
    const children = collections.filter(c => c.parentId === parentId || (!parentId && !c.parentId));
    
    // If we are at root, we need to handle both null and undefined for parentId
    const rootItems = parentId === null 
      ? collections.filter(c => !c.parentId) 
      : collections.filter(c => c.parentId === parentId);

    return rootItems.map(col => {
      const isSelected = selectedCollectionId === col.id;
      const subCols = collections.filter(c => c.parentId === col.id);
      const isExpanded = expandedIds.has(col.id);

      return (
        <div key={col.id} className="select-none">
          <div 
            onClick={() => onSelectCollectionFilter(col.id)}
            onContextMenu={(e) => handleColContextMenu(e, col.id)}
            className={`group flex items-center gap-2 py-2 px-3 cursor-pointer transition-all border-l-2 ${
              isSelected 
                ? 'bg-[#FAF8F5] dark:bg-zinc-900/50 border-[#4A3B32] dark:border-[#DDDAC4] text-zinc-900 dark:text-zinc-100' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/20'
            }`}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            <div className="flex items-center gap-2 flex-grow min-w-0">
              {subCols.length > 0 ? (
                <button 
                  onClick={(e) => toggleExpand(col.id, e)}
                  className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              ) : (
                <div className="w-4" />
              )}
              <Folder size={14} className={isSelected ? 'text-[#4A3B32] dark:text-[#DDDAC4]' : 'text-zinc-400'} />
              {renamingColId === col.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    if (renameValue.trim()) {
                      onUpdateCollection(col.id, { name: renameValue.trim() });
                    }
                    setRenamingColId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (renameValue.trim()) {
                        onUpdateCollection(col.id, { name: renameValue.trim() });
                      }
                      setRenamingColId(null);
                    }
                  }}
                  autoFocus
                  className="text-xs truncate bg-[#191b1e] dark:bg-[#111214] border border-[#4A3B32] p-0.5 w-full text-white"
                />
              ) : (
                <span 
                  className={`text-xs truncate ${isSelected ? 'font-bold' : ''}`}
                  onDoubleClick={() => {
                    setRenameValue(col.name);
                    setRenamingColId(col.id);
                  }}
                >
                  {col.name}
                </span>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParentForNewSub(col.id);
                setShowAddForm(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] transition-all"
              title="添加子合集"
            >
              <FolderPlus size={12} />
            </button>
          </div>
          
          {isExpanded && subCols.length > 0 && (
            <div className="border-l border-zinc-100 dark:border-zinc-800 ml-4">
              {renderCollectionTree(col.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const isMasterSelected = selectedCollectionId === 'all-master' || selectedCollectionId === null;
  const currentCol = isMasterSelected 
    ? { name: '全部归档项目', description: '系统最高规格主档案。展示全馆入藏的所有内容。', id: 'all-master' } 
    : collections.find(c => c.id === selectedCollectionId);

  const filteredItems = getDirectItemsForCollection(selectedCollectionId);
  const immediateSubCols = selectedCollectionId && selectedCollectionId !== 'all-master'
    ? collections.filter(c => c.parentId === selectedCollectionId)
    : [];
  const directItems = selectedCollectionId === null || selectedCollectionId === 'all-master'
    ? mediaItems
    : mediaItems.filter(item => item.collections.includes(selectedCollectionId));

  return (
    <div data-guide="collections" className="space-y-4">
      <FeatureGuideBanner
        guideKey="collections_nested_guide"
        title="无限层级合集与主题分组"
        badge="分组典藏"
        description="支持建立树状父子合集（例如：父合集“2026年度书单” → 子合集“哲学思辨”）。您可以将散落在图书、影视、音乐与游戏中的不同作品归入同一个主题，形成专属于您的知识与文化策展。"
      />

      <div className="flex flex-col md:flex-row h-full min-h-[700px] border border-[#E6E0D5] dark:border-[#2D3137] bg-white dark:bg-[#191b1e] overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 border-r border-[#E6E0D5] dark:border-[#2D3137] flex flex-col bg-[#FAF8F5]/30 dark:bg-zinc-950/20">
        <div className="p-4 border-b border-[#E6E0D5] dark:border-[#2D3137] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[#4A3B32] dark:text-[#DDDAC4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">合集列表</span>
          </div>
          <button
            onClick={() => {
              setParentForNewSub(null);
              setShowAddForm(true);
            }}
            className="p-1 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-[#E6E0D5] dark:hover:border-zinc-800 transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto py-2">
          {/* Master Item */}
          <div 
            onClick={() => onSelectCollectionFilter('all-master')}
            className={`flex items-center gap-2 py-3 px-4 cursor-pointer transition-all border-l-2 mb-2 ${
              isMasterSelected 
                ? 'bg-[#FAF8F5] dark:bg-zinc-900/50 border-[#4A3B32] dark:border-[#DDDAC4] text-zinc-900 dark:text-zinc-100' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/20'
            }`}
          >
            <Layers size={14} className={isMasterSelected ? 'text-[#4A3B32] dark:text-[#DDDAC4]' : 'text-zinc-400'} />
            <span className={`text-xs uppercase tracking-widest ${isMasterSelected ? 'font-bold' : ''}`}>全部归档</span>
            <span className="ml-auto text-[9px] font-serif opacity-50">{mediaItems.length}</span>
          </div>

          {/* Hierarchical Tree */}
          <div className="space-y-1">
            {renderCollectionTree(null)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        <AnimatePresence mode="wait">
          {currentCol ? (
            <motion.div
              key={currentCol.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 md:p-8 bg-[#FAF8F5]/50 dark:bg-zinc-900/40 border-b border-[#E6E0D5] dark:border-zinc-800">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {currentCol.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                        {currentCol.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-100">
                      {filteredItems.length}
                    </div>
                    <div className="text-[11px] font-serif italic text-zinc-400 uppercase tracking-widest">已归档项目</div>
                    
                    {!isMasterSelected && (
                      <div className="flex gap-4 mt-3">
                        <button
                          onClick={() => {
                            setParentForNewSub(currentCol.id);
                            setShowAddForm(true);
                          }}
                          className="flex items-center gap-1 text-[12px] font-bold text-zinc-400 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          <FolderPlus size={14} />
                          <span>添加子合集</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`确定要彻底删除合集 "${currentCol.name}" 吗？归档项目不会被删除。`)) {
                              onDeleteCollection(selectedCollectionId!);
                              onSelectCollectionFilter(null);
                            }
                          }}
                          className="flex items-center gap-1 text-[12px] font-bold text-zinc-300 hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>删除合集</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Grid (Combined) */}
              <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#E6E0D5]/80 dark:border-zinc-800 pb-2 pt-2">
                    <FileText size={14} className="text-[#4A3B32] dark:text-[#DDDAC4]" />
                    <span className="text-[12px] font-bold uppercase tracking-widest text-[#4A3B32] dark:text-[#DDDAC4] font-serif">
                      归档项目 / Items in Collection
                    </span>
                  </div>

                  {(() => {
                    const combinedItems = [
                      ...immediateSubCols.map(col => ({ ...col, isCollection: true })),
                      ...filteredItems.map(item => ({ ...item, isCollection: false }))
                    ];
                    
                    if (combinedItems.length > 0) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {combinedItems.map(item => {
                            if (item.isCollection) {
                              const subCol = item as any; // Cast as Collection
                              const subColItems = getItemsForCollection(subCol.id);
                              const previewItems = subColItems.slice(0, 4);
                              
                              return (
                                <div
                                  key={subCol.id}
                                  onClick={() => onSelectCollectionFilter(subCol.id)}
                                  onContextMenu={(e) => handleColContextMenu(e, subCol.id)}
                                  className="group relative flex flex-col bg-[#FAF8F5]/40 dark:bg-zinc-900/10 border border-[#E6E0D5] dark:border-zinc-800 hover:border-[#4A3B32] dark:hover:border-[#DDDAC4] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md p-4"
                                >
                                  <div className="absolute top-0 left-4 -translate-y-1 w-12 h-2 bg-[#FAF8F5] dark:bg-zinc-900 border-t border-x border-[#E6E0D5] dark:border-zinc-800 rounded-t-xs" />
                                  <div className="aspect-[4/3] bg-[#FCFAF7]/50 dark:bg-zinc-950/20 border border-dashed border-[#E6E0D5]/80 dark:border-zinc-800/80 flex items-center justify-center p-2.5 relative overflow-hidden mb-3.5">
                                    {previewItems.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-1.5 w-full h-full max-w-[120px] max-h-[90px] group-hover:scale-105 transition-transform duration-300">
                                        {previewItems.map((item: any) => (
                                          <div key={item.id} className="aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-850 shadow-xs border border-white dark:border-zinc-900">
                                            <img src={getDisplayCoverUrl(item.coverUrl, 'card')} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1.5 text-zinc-300 dark:text-zinc-700">
                                        <Folder size={24} className="stroke-1 text-zinc-300 dark:text-zinc-700" />
                                        <span className="text-[9px] font-serif uppercase tracking-wider text-zinc-400 dark:text-zinc-650">空子合集</span>
                                      </div>
                                    )}
                                    <div className="absolute bottom-1.5 right-1.5 bg-[#4A3B32] text-white dark:bg-[#DDDAC4] dark:text-[#111214] text-[8px] font-serif py-0.5 px-1.5 font-bold">
                                      {subColItems.length}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1">
                                      <Folder size={12} className="shrink-0 text-zinc-400" />
                                      <span className="truncate group-hover:text-[#4A3B32] dark:group-hover:text-[#DDDAC4] transition-colors">{subCol.name}</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 truncate line-clamp-1">{subCol.description || '无介绍。'}</p>
                                  </div>
                                </div>
                              );
                            } else {
                              const mediaItem = item as any; // Cast as MediaItem
                              return (
                                <div
                                  key={mediaItem.id}
                                  onClick={() => onSelectItem?.(mediaItem.id)}
                                  onContextMenu={(e) => handleContextMenu(e, mediaItem.id)}
                                  className="group relative flex flex-col bg-white dark:bg-zinc-900/40 border border-[#E6E0D5] dark:border-zinc-800 hover:border-[#4A3B32] dark:hover:border-[#DDDAC4] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                                >
                                  <div className="aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                    <img src={getDisplayCoverUrl(mediaItem.coverUrl, 'card')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                  </div>
                                  <div className="p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate flex-grow">{mediaItem.title}</div>
                                      {!isMasterSelected && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateItemCollections(mediaItem.id, mediaItem.collections.filter((id: string) => id !== selectedCollectionId));
                                          }}
                                          className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all shrink-0"
                                          title="移出此合集"
                                        >
                                          <MinusCircle size={18} />
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-serif text-zinc-400 uppercase tracking-widest">{mediaItem.type}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                          <FileText size={48} className="mb-4 stroke-1 text-zinc-400 dark:text-zinc-650" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em]">此归档尚无项目或子合集</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400">
              <p className="text-xs font-bold uppercase tracking-widest">请从侧边栏选择一个合集</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.form 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleSubmit} 
              className="w-full max-w-md p-6 bg-white dark:bg-[#191b1e] border-2 border-[#4A3B32] dark:border-[#DDDAC4] space-y-6 shadow-2xl relative"
            >
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B1E19] dark:text-zinc-100 font-serif flex items-center gap-2">
                  <FolderPlus size={16} />
                  {parentForNewSub ? '添加子合集' : '新建根合集'}
                </h3>
              </div>

              {parentForNewSub && (
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500">
                  父级: <span className="font-bold text-zinc-800 dark:text-zinc-200">{collections.find(c => c.id === parentForNewSub)?.name}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-serif">
                    合集名称
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="如：2026读书计划、经典科幻..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:border-[#4A3B32]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-serif">
                    合集介绍
                  </label>
                  <textarea
                    placeholder="简短描述该分类的收录初衷..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full text-xs bg-[#FAF8F5] dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2D3137] text-zinc-800 dark:text-zinc-100 px-3 py-2.5 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs text-zinc-500 hover:text-[#4A3B32] font-bold uppercase"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4A3B32] text-white dark:bg-[#DDDAC4] dark:text-[#111214] text-xs font-bold uppercase tracking-wider"
                >
                  创建合集
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menus */}
      <AnimatePresence>
        {contextMenu && (
          <div 
            className="fixed inset-0 z-[9999]" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed bg-white dark:bg-[#1c1e22] border border-[#E6E0D5] dark:border-zinc-800 shadow-2xl py-1.5 min-w-[220px] max-h-[400px] overflow-y-auto custom-scrollbar"
              style={{ 
                left: Math.min(contextMenu.x, window.innerWidth - 240), 
                top: Math.min(contextMenu.y, window.innerHeight - 420) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">加入合集 / ADD TO COLLECTION</span>
              </div>
              {(() => {
                const targetItem = mediaItems.find(i => i.id === contextMenu.itemId);
                if (!targetItem) return null;

                const renderColItems = (parentId: string | null = null, depth = 0) => {
                  const items = collections.filter(c => c.parentId === parentId || (!parentId && !c.parentId));
                  return items.map(col => {
                    const isInCollection = targetItem.collections?.includes(col.id);
                    const subCols = collections.filter(c => c.parentId === col.id);
                    return (
                      <React.Fragment key={col.id}>
                        <button
                          onClick={() => {
                            onUpdateItemCollections(targetItem.id, [col.id]);
                            setContextMenu(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900/50 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] transition-colors text-left"
                          style={{ paddingLeft: `${depth * 12 + 12}px` }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Folder size={12} className={isInCollection ? 'text-[#4A3B32] dark:text-[#DDDAC4]' : 'opacity-50 shrink-0'} />
                            <span className={`truncate ${isInCollection ? 'font-bold text-zinc-900 dark:text-zinc-100' : ''}`}>{col.name}</span>
                          </div>
                          {isInCollection && <SquareCheck size={12} className="text-[#4A3B32] dark:text-[#DDDAC4] shrink-0" />}
                        </button>
                        {subCols.length > 0 && renderColItems(col.id, depth + 1)}
                      </React.Fragment>
                    );
                  });
                };
                return renderColItems(null);
              })()}
              {collections.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px] text-zinc-400 italic">尚无可用合集</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {colContextMenu && (
          <div 
            className="fixed inset-0 z-[9999]" 
            onClick={() => setColContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setColContextMenu(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed w-44 bg-white dark:bg-[#1c1e22] border border-[#E6E0D5] dark:border-zinc-800 shadow-2xl py-1.5"
              style={{ 
                left: Math.min(colContextMenu.x, window.innerWidth - 180), 
                top: Math.min(colContextMenu.y, window.innerHeight - 150) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  const col = collections.find(c => c.id === colContextMenu.colId);
                  if (col) {
                    setRenameValue(col.name);
                    setRenamingColId(col.id);
                  }
                  setColContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900/50 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] transition-colors text-left"
              >
                <Edit2 size={12} />
                <span>重命名</span>
              </button>
              <button
                onClick={() => {
                  const col = collections.find(c => c.id === colContextMenu.colId);
                  if (col && window.confirm(`确定要彻底删除合集 "${col.name}" 吗？归档项目不会被删除。`)) {
                    onDeleteCollection(col.id);
                    if (selectedCollectionId === col.id) {
                      onSelectCollectionFilter(null);
                    }
                  }
                  setColContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 size={12} />
                <span>删除</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}
