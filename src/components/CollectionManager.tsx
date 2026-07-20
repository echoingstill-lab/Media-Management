/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Folder, 
  Trash2, 
  ChevronRight, 
  Layers, 
  SquareCheck, 
  ArrowLeft, 
  FileText,
  X
} from 'lucide-react';
import { Collection, MediaItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CollectionManagerProps {
  collections: Collection[];
  mediaItems: MediaItem[];
  onCreateCollection: (collection: Omit<Collection, 'id' | 'createdAt'>) => void;
  onDeleteCollection: (id: string) => void;
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
  onUpdateItemCollections,
  onSelectCollectionFilter,
  selectedCollectionId,
  onSelectItem,
}: CollectionManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('border-[#4A3B32] text-[#4A3B32]');

  const presets = [
    { name: '雅致胡桃棕', value: 'border-[#4A3B32] text-[#4A3B32] bg-[#4A3B32]' },
    { name: '檀香灰褐', value: 'border-[#756256] text-[#756256] bg-[#756256]' },
    { name: '琥珀流金', value: 'border-[#B89045] text-[#B89045] bg-[#B89045]' },
    { name: '艾叶青绿', value: 'border-[#7B8B6F] text-[#7B8B6F] bg-[#7B8B6F]' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateCollection({
      name: name.trim(),
      description: description.trim(),
      color,
    });

    setName('');
    setDescription('');
    setShowAddForm(false);
  };

  const getItemsForCollection = (colId: string | null) => {
    if (colId === null) return mediaItems;
    return mediaItems.filter(item => item.collections.includes(colId));
  };

  const renderFolderIcon = (id: string | null, isSelected: boolean) => {
    return (
      <div className="relative">
        <Folder 
          size={isSelected ? 48 : 40} 
          className={`transition-all duration-300 ${
            isSelected 
              ? 'text-[#4A3B32] dark:text-[#DDDAC4] fill-[#4A3B32]/10' 
              : 'text-zinc-400 dark:text-zinc-600 group-hover:text-[#4A3B32] dark:group-hover:text-[#DDDAC4]'
          }`}
          strokeWidth={1.5}
        />
        {id === null && (
          <div className="absolute inset-0 flex items-center justify-center pt-1">
            <Layers size={14} className={isSelected ? 'text-[#4A3B32] dark:text-[#DDDAC4]' : 'text-zinc-400'} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E0D5] dark:border-[#2D3137] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 border border-[#E6E0D5] dark:border-[#2D3137] bg-[#FAF8F5] dark:bg-[#111214] text-[#4A3B32] dark:text-[#DDDAC4]">
              <Layers size={14} />
            </div>
            <h2 className="text-2xl font-serif font-bold tracking-wider text-[#2B1E19] dark:text-zinc-100">
              合集档案柜
            </h2>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="text-xs px-4 py-2 bg-[#4A3B32] hover:bg-[#382B24] dark:bg-[#DDDAC4] dark:hover:bg-white text-[#FBF9F3] dark:text-[#111214] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>新建合集</span>
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          >
            <form 
              onSubmit={handleSubmit} 
              className="w-full max-w-lg p-6 bg-white dark:bg-[#191b1e] border-2 border-[#4A3B32] dark:border-[#DDDAC4] space-y-6 shadow-2xl relative"
            >
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2B1E19] dark:text-zinc-100 font-mono">
                  ★ 新建合集文件夹
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-mono">
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
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-mono">
                    主色风格
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setColor(g.value)}
                        className={`px-3 py-2 text-left text-[10px] border transition-all flex items-center justify-between cursor-pointer ${
                          color === g.value 
                            ? 'bg-[#4A3B32] text-white dark:bg-[#DDDAC4] dark:text-[#111214] border-transparent font-bold' 
                            : 'bg-[#FAF8F5] dark:bg-[#111214] border-[#E6E0D5] dark:border-[#2D3137] text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span>{g.name.split(' / ')[1] || g.name.split(' / ')[0]}</span>
                        {color === g.value && <SquareCheck size={10} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-bold font-mono">
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
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnimatePresence mode="wait">
          {selectedCollectionId === null ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 p-4"
            >
              {/* Master Root Folder */}
              <motion.div
                layoutId="folder-master"
                onClick={() => onSelectCollectionFilter('all-master')}
                className="group flex flex-col items-center gap-4 cursor-pointer p-6 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900/40 transition-colors border border-transparent hover:border-[#E6E0D5] dark:hover:border-zinc-800"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              >
                <motion.div layoutId="folder-icon-master" transition={{ type: "spring", stiffness: 350, damping: 25 }}>
                  {renderFolderIcon(null, false)}
                </motion.div>
                <div className="text-center">
                  <motion.div layoutId="folder-name-master" className="text-xs font-bold text-zinc-800 dark:text-zinc-200" transition={{ type: "spring", stiffness: 350, damping: 25 }}>全部归档</motion.div>
                  <motion.div layoutId="folder-count-master" className="text-[9px] font-mono text-zinc-400 uppercase tracking-tighter mt-0.5" transition={{ type: "spring", stiffness: 350, damping: 25 }}>{mediaItems.length} 个项目</motion.div>
                </div>
              </motion.div>

              {/* Custom Folders */}
              {collections.map(col => {
                const colItems = getItemsForCollection(col.id);
                return (
                  <motion.div
                    key={col.id}
                    layoutId={`folder-${col.id}`}
                    onClick={() => onSelectCollectionFilter(col.id)}
                    className="group flex flex-col items-center gap-4 cursor-pointer p-6 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900/40 transition-colors border border-transparent hover:border-[#E6E0D5] dark:hover:border-zinc-800"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  >
                    <motion.div layoutId={`folder-icon-${col.id}`} transition={{ type: "spring", stiffness: 350, damping: 25 }}>
                      {renderFolderIcon(col.id, false)}
                    </motion.div>
                    <div className="text-center">
                      <motion.div layoutId={`folder-name-${col.id}`} className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]" transition={{ type: "spring", stiffness: 350, damping: 25 }}>{col.name}</motion.div>
                      <motion.div layoutId={`folder-count-${col.id}`} className="text-[9px] font-mono text-zinc-400 uppercase tracking-tighter mt-0.5" transition={{ type: "spring", stiffness: 350, damping: 25 }}>{colItems.length} 个项目</motion.div>
                    </div>
                  </motion.div>
                );
              })}

              <button
                onClick={() => setShowAddForm(true)}
                className="flex flex-col items-center gap-4 cursor-pointer p-6 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900/40 transition-colors border border-dashed border-[#E6E0D5] dark:border-zinc-800 group"
              >
                <div className="w-12 h-10 flex items-center justify-center text-zinc-300 group-hover:text-[#4A3B32] dark:group-hover:text-[#DDDAC4]">
                  <Plus size={28} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">添加新合集</div>
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-8 animate-fade-in"
            >
              {(() => {
                const isMasterSelected = selectedCollectionId === 'all-master';
                const currentCol = isMasterSelected 
                  ? { name: '全部归档项目', description: '系统最高规格主档案。展示全馆入藏的所有内容。', id: 'master' } 
                  : collections.find(c => c.id === selectedCollectionId);

                if (!currentCol) return null;

                const filteredItems = getItemsForCollection(isMasterSelected ? null : selectedCollectionId);
                const nonColItems = !isMasterSelected && selectedCollectionId
                  ? mediaItems.filter(item => !item.collections.includes(selectedCollectionId))
                  : [];

                return (
                  <motion.div 
                    layoutId={`folder-${currentCol.id}`}
                    className="bg-white dark:bg-[#191b1e] border border-[#E6E0D5] dark:border-[#2d3137] min-h-[600px] overflow-hidden"
                  >
                    {/* Immersive Header */}
                    <div className="bg-[#FAF8F5] dark:bg-zinc-900/40 p-8 border-b border-[#E6E0D5] dark:border-zinc-800">
                      <button
                        onClick={() => onSelectCollectionFilter(null)}
                        className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-[#4A3B32] dark:hover:text-[#DDDAC4] uppercase tracking-widest mb-8 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>返回档案柜</span>
                      </button>

                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-start gap-6">
                          <motion.div layoutId={`folder-icon-${currentCol.id}`} className="shrink-0">
                            {renderFolderIcon(isMasterSelected ? null : currentCol.id, true)}
                          </motion.div>
                          <div className="space-y-3">
                            <motion.h3 layoutId={`folder-name-${currentCol.id}`} className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                              {currentCol.name}
                            </motion.h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                              {currentCol.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <motion.div layoutId={`folder-count-${currentCol.id}`} className="text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-100">
                            {filteredItems.length}
                          </motion.div>
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">已归档项目</div>
                          
                          {!isMasterSelected && (
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要彻底删除合集 "${currentCol.name}" 吗？归档项目不会被删除。`)) {
                                  onDeleteCollection(selectedCollectionId!);
                                  onSelectCollectionFilter(null);
                                }
                              }}
                              className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-zinc-300 hover:text-red-500 transition-colors uppercase tracking-widest cursor-pointer"
                            >
                              <Trash2 size={11} />
                              <span>销毁此合集</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Add Tray */}
                    {!isMasterSelected && selectedCollectionId && nonColItems.length > 0 && (
                      <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto">
                        <div className="flex items-center gap-4 whitespace-nowrap min-w-max">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">快速存入:</span>
                          {nonColItems.slice(0, 10).map(item => (
                            <button
                              key={item.id}
                              onClick={() => onUpdateItemCollections(item.id, [...item.collections, selectedCollectionId])}
                              className="px-3 py-1.5 text-[10px] bg-white dark:bg-zinc-900 border border-[#E6E0D5] dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-[#4A3B32] dark:hover:border-[#DDDAC4] transition-all cursor-pointer"
                            >
                              + {item.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Grid */}
                    <div className="p-8">
                      {filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => onSelectItem?.(item.id)}
                              className="group flex gap-4 p-4 bg-[#FBF9F3] dark:bg-zinc-900/20 border border-transparent hover:border-[#4A3B32] dark:hover:border-[#DDDAC4] transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                              <img 
                                src={item.coverUrl} 
                                className="w-16 h-22 object-cover shadow-sm group-hover:scale-105 transition-transform" 
                                alt="" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-grow min-w-0 flex flex-col justify-between py-1">
                                <div>
                                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate mb-1">{item.title}</div>
                                  <div className="text-[11px] text-zinc-500 truncate">{item.creator || '无主创信息'}</div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{item.type}</span>
                                  {!isMasterSelected && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateItemCollections(item.id, item.collections.filter(id => id !== selectedCollectionId));
                                      }}
                                      className="text-[9px] font-bold text-zinc-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                                    >
                                      移出
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-4">
                            <FileText size={32} />
                          </div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">此归档文件夹尚空 / Folder is empty</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
