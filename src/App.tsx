/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Film, Tv, Music, Gamepad, Compass, Bookmark, Search, Plus, Sun, Moon, Database, Calendar, Layers, Sparkles, Filter, SquareCheck, LogOut, User, Ghost, Folder } from 'lucide-react';
import { MediaItem, Collection, CheckInHabit, CheckInLog, MediaType, MEDIA_TYPE_LABELS } from './types';
import { DEFAULT_MEDIA_ITEMS, DEFAULT_COLLECTIONS, DEFAULT_HABITS, DEFAULT_CHECK_IN_LOGS } from './utils/helpers';

// Components
import MediaCard from './components/MediaCard';
import MediaDetailModal from './components/MediaDetailModal';
import MediaEditModal from './components/MediaEditModal';
import CollectionManager from './components/CollectionManager';
import CheckInCalendar from './components/CheckInCalendar';
import DataManagement from './components/DataManagement';
import WishlistSection from './components/WishlistSection';
import LoginView from './components/LoginView';
import AISettingsModal from './components/AISettingsModal';

export default function App() {
  // --- Authentication State ---
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('media_management_user');
  });

  // --- Persistent LocalState ---
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('media_archive_items');
    return saved ? JSON.parse(saved) : DEFAULT_MEDIA_ITEMS;
  });

  // Track the sorting order stable across renders; only updates when switching tabs, or when items are added/deleted/imported.
  const [sortedMediaIds, setSortedMediaIds] = useState<string[]>(() => {
    const initialItems = localStorage.getItem('media_archive_items')
      ? JSON.parse(localStorage.getItem('media_archive_items')!)
      : DEFAULT_MEDIA_ITEMS;
    const sorted = [...initialItems].sort((a, b) => {
      const getWeight = (status: string | undefined) => {
        if (status === 'progress') return 1;
        if (status === 'wishlist') return 2;
        if (!status) return 3;
        if (status === 'completed') return 4;
        return 5;
      };
      return getWeight(a.status) - getWeight(b.status);
    });
    return sorted.map(itm => itm.id);
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('media_archive_collections');
    return saved ? JSON.parse(saved) : DEFAULT_COLLECTIONS;
  });

  const [habits, setHabits] = useState<CheckInHabit[]>(() => {
    return (Object.keys(MEDIA_TYPE_LABELS) as MediaType[]).map(type => ({
      id: type,
      name: MEDIA_TYPE_LABELS[type],
      color: type === 'book' ? 'orange' : type === 'movie' ? 'blue' : type === 'tv' ? 'purple' : type === 'anime' ? 'rose' : type === 'music' ? 'green' : type === 'game' ? 'amber' : 'zinc',
    }));
  });

  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>(() => {
    const saved = localStorage.getItem('media_archive_check_in_logs');
    return saved ? JSON.parse(saved) : DEFAULT_CHECK_IN_LOGS;
  });

  const [darkMode] = useState<boolean>(true);

  // --- Search / Filters / Navigation State ---
  // The user requested: "主页只显示清单，然后才是媒体库"
  // Default tab is 'wishlist' (想看清单)
  const [selectedTab, setSelectedTab] = useState<'wishlist' | 'archive' | 'collections' | 'calendar' | 'backup'>('wishlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<MediaType | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<MediaItem['status'] | 'all'>('all');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string | null>(null);

  // --- Modal Popups Trigger State ---
  const [activeMediaDetailId, setActiveMediaDetailId] = useState<string | null>(null);
  const [collectionContextMenu, setCollectionContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setCollectionContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleMediaContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    // Follow the cursor for precise positioning
    setCollectionContextMenu({ 
      x: e.clientX, 
      y: e.clientY, 
      itemId 
    });
  };
  const [activeMediaEdit, setActiveMediaEdit] = useState<MediaItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  // Client ID for AI limit tracking
  useEffect(() => {
    if (!localStorage.getItem('media_archive_client_id')) {
      const newId = 'client_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('media_archive_client_id', newId);
    }
  }, []);

  // Save states to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('media_archive_items', JSON.stringify(mediaItems));
  }, [mediaItems]);

  const mediaIdsString = mediaItems.map(itm => itm.id).join(',');

  useEffect(() => {
    const sorted = [...mediaItems].sort((a, b) => {
      const getWeight = (status: string | undefined) => {
        if (status === 'progress') return 1;
        if (status === 'wishlist') return 2;
        if (!status) return 3;
        if (status === 'completed') return 4;
        return 5;
      };
      return getWeight(a.status) - getWeight(b.status);
    });
    setSortedMediaIds(sorted.map(itm => itm.id));
  }, [selectedTab, mediaIdsString]);

  useEffect(() => {
    localStorage.setItem('media_archive_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('media_archive_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('media_archive_check_in_logs', JSON.stringify(checkInLogs));
  }, [checkInLogs]);

  useEffect(() => {
    // Force dark mode always
  }, []);

  // --- Authentication Handlers ---
  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('media_management_user', username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('media_management_user');
  };

  // --- Handlers ---
  const handleCreateOrUpdateMedia = (itemData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    if (itemData.id) {
      // Edit mode
      setMediaItems(prev =>
        prev.map(itm =>
          itm.id === itemData.id
            ? { ...itm, ...itemData, updatedAt: now } as MediaItem
            : itm
        )
      );
      // Update details view state if currently open
      if (activeMediaDetailId === itemData.id) {
        setActiveMediaDetailId(null);
      }
    } else {
      // Add mode
      const newItem: MediaItem = {
        ...itemData,
        id: `media-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      } as MediaItem;
      setMediaItems(prev => [newItem, ...prev]);
    }
    setShowAddModal(false);
    setActiveMediaEdit(null);
  };

  const handleDeleteMedia = (id: string) => {
    setMediaItems(prev => prev.filter(itm => itm.id !== id));
    setActiveMediaDetailId(null);
  };

  const handleUpdateItemCollections = (itemId: string, collectionIds: string[]) => {
    setMediaItems(prev =>
      prev.map(itm =>
        itm.id === itemId
          ? { ...itm, collections: collectionIds, updatedAt: new Date().toISOString() }
          : itm
      )
    );
  };

  const handleUpdateWishlistItem = (updatedItem: MediaItem) => {
    setMediaItems(prev =>
      prev.map(itm => (itm.id === updatedItem.id ? updatedItem : itm))
    );
  };

  const handleAddWishlistItem = (title: string, type: MediaType, month: string) => {
    const now = new Date().toISOString();
    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      title,
      type,
      creator: '',
      coverUrl: '',
      description: '',
      status: 'wishlist',
      tags: [],
      collections: [],
      wishlistMonth: month,
      reReadCount: 0,
      reReadLogs: [],
      personalRating: 0,
      personalNote: '',
      noteImages: [],
      createdAt: now,
      updatedAt: now,
    };
    setActiveMediaEdit(newItem);
    setShowAddModal(true);
  };

  const handleMoveUnfinishedWishlist = (fromMonth: string) => {
    const [y, m] = fromMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    const nextMonth = `${nextY}-${nextM}`;

    setMediaItems(prev =>
      prev.map(itm => {
        if (itm.status === 'wishlist' && itm.wishlistMonth === fromMonth) {
          return {
            ...itm,
            wishlistMonth: nextMonth,
            updatedAt: new Date().toISOString(),
          };
        }
        return itm;
      })
    );
  };

  // --- Collections Actions ---
  const handleCreateCollection = (newCol: Omit<Collection, 'id' | 'createdAt'>) => {
    const col: Collection = {
      ...newCol,
      id: `col-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCollections(prev => [...prev, col]);
  };

  const handleUpdateCollection = (id: string, updates: Partial<Collection>) => {
    setCollections(prev =>
      prev.map(col =>
        col.id === id ? { ...col, ...updates } : col
      )
    );
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(prev => prev.filter(col => col.id !== id));
    // Orphan collection references from mediaItems
    setMediaItems(prev =>
      prev.map(itm =>
        itm.collections.includes(id)
          ? { ...itm, collections: itm.collections.filter(cid => cid !== id) }
          : itm
      )
    );
    if (selectedCollectionFilter === id) {
      setSelectedCollectionFilter(null);
    }
  };

  // Habits are now fixed to media types
  const handleToggleCheckIn = (date: string, habitId: string) => {
    const existingIndex = checkInLogs.findIndex(l => l.date === date && l.habitId === habitId);

    if (existingIndex !== -1) {
      setCheckInLogs(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      const newLog: CheckInLog = {
        date,
        habitId,
      };
      setCheckInLogs(prev => [...prev, newLog]);
    }
  };

  // --- Data Sync / Restore Backup ---
  const handleImportBackup = (data: {
    mediaItems: MediaItem[];
    collections: Collection[];
    habits: CheckInHabit[];
    checkInLogs: CheckInLog[];
  }) => {
    if (data.mediaItems) setMediaItems(data.mediaItems);
    if (data.collections) setCollections(data.collections);
    if (data.habits) setHabits(data.habits);
    if (data.checkInLogs) setCheckInLogs(data.checkInLogs);
  };

  const handleResetToDefault = () => {
    setMediaItems(DEFAULT_MEDIA_ITEMS);
    setCollections(DEFAULT_COLLECTIONS);
    setHabits(DEFAULT_HABITS);
    setCheckInLogs(DEFAULT_CHECK_IN_LOGS);
  };

  const handleBulkAddItems = (newItems: MediaItem[]) => {
    setMediaItems(prev => [...newItems, ...prev]);
  };

  // --- Filters Pipeline ---
  const filteredItems = mediaItems
    .filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

      const matchesCollection =
        selectedCollectionFilter === null || item.collections.includes(selectedCollectionFilter);

      return matchesSearch && matchesType && matchesStatus && matchesCollection;
    })
    .sort((a, b) => {
      const idxA = sortedMediaIds.indexOf(a.id);
      const idxB = sortedMediaIds.indexOf(b.id);
      
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return -1; // New items sorted at the top
      if (idxB === -1) return 1;
      
      return idxA - idxB;
    });

  const activeMediaDetail = mediaItems.find(itm => itm.id === activeMediaDetailId);

  // If user is not authenticated, render LoginView
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} darkMode={darkMode} />;
  }

  return (
    <div
      className={`min-h-screen transition-all duration-300 font-serif ${
        darkMode
          ? 'dark bg-[#111214] text-[#e3e4e6] selection:bg-zinc-800'
          : 'bg-[#FAF8F5] text-[#2B1E19] selection:bg-zinc-200'
      }`}
    >
      {/* Decorative Minimal Ambient Line */}
      <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800"></div>

      <AISettingsModal 
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
      />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6 border-[#E6E0D5] dark:border-zinc-850">
          <div className="flex items-center gap-1">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#4A3B32] dark:text-[#DDDAC4] tracking-tight flex items-baseline gap-3">
                <span>Media Management</span>
                <span className="text-3xl md:text-4xl opacity-40 font-serif font-normal text-zinc-400">/</span>
                <span className="text-xl md:text-2xl opacity-90 font-serif tracking-widest">媒体管理</span>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-3 font-serif">
                阅读是一座随身携带的避难所
              </p>
            </div>
          </div>

          {/* User Profile, Theme & LogOut */}
          <div className="flex items-center gap-3 self-end md:self-auto text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-800 bg-[#121214] rounded-none">
              <User size={13} className="opacity-60" />
              <span className="font-bold uppercase text-[12px] tracking-wider text-zinc-400 font-serif">
                用户: {currentUser}
              </span>
            </div>

            <button
              onClick={() => setShowAISettings(true)}
              className="p-2 rounded-none border transition-all cursor-pointer flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
              title="AI 解析设置"
            >
              <Sparkles size={13} />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-none border border-[#E6E0D5] dark:border-[#2D3137] text-[#756256] hover:text-red-500 hover:border-red-250 transition-colors cursor-pointer"
              title="退出登录"
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* Global Tab Navigation */}
        <nav className="flex flex-wrap gap-1 border-b pb-1 border-[#E6E0D5] dark:border-[#2D3137]">
          {[
            { id: 'wishlist', label: '月度清单', icon: <Bookmark size={14} /> },
            { id: 'archive', label: '媒体档案', icon: <Book size={14} /> },
            { id: 'collections', label: '合集分组', icon: <Layers size={14} /> },
            { id: 'calendar', label: '打卡记录', icon: <Calendar size={14} /> },
            { id: 'backup', label: '数据相关', icon: <Database size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id as any);
                if (tab.id === 'archive') setSelectedCollectionFilter(null);
              }}
              className={`relative px-4 py-2.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-none font-serif ${
                selectedTab === tab.id
                  ? 'text-[#FBF9F3] dark:text-[#111214]'
                  : 'text-[#756256] dark:text-[#C5C0AA] hover:text-[#1A1A1A] dark:hover:text-[#DDDAC4]'
              }`}
            >
              {selectedTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#4A3B32] dark:bg-[#DDDAC4] z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
              {selectedTab === tab.id && (
                <motion.div
                  layoutId="activeTabBorder"
                  className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[#4A3B32] dark:border-[#DDDAC4] z-20"
                />
              )}
            </button>
          ))}

          <div className="flex-grow" />


          <button
            onClick={() => {
              setActiveMediaEdit(null);
              setShowAddModal(true);
            }}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-none border-b-2 font-serif ${
              darkMode 
                ? 'border-transparent text-zinc-400 hover:text-[#DDDAC4] hover:border-[#DDDAC4]' 
                : 'border-transparent text-zinc-500 hover:text-[#4A3B32] hover:border-[#4A3B32]'
            }`}
          >
            <Plus size={14} />
            <span>录入档案</span>
          </button>
        </nav>

        {/* ==================== TAB 1: 想看清单 (WISHLIST) ==================== */}
        {selectedTab === 'wishlist' && (
          <div className="space-y-5 animate-fade-in">
            <WishlistSection
              mediaItems={mediaItems}
              onUpdateItem={handleUpdateWishlistItem}
              onDeleteItem={handleDeleteMedia}
              onAddItem={handleAddWishlistItem}
              onAddNew={(title) => {
                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const nowIso = now.toISOString();
                setActiveMediaEdit({ 
                  id: `media-${Date.now()}`,
                  title, 
                  type: 'book', 
                  creator: '',
                  coverUrl: '',
                  description: '',
                  status: 'wishlist',
                  collections: [],
                  tags: [],
                  wishlistMonth: currentMonthStr,
                  reReadCount: 0,
                  reReadLogs: [],
                  personalRating: 0,
                  personalNote: '',
                  noteImages: [],
                  createdAt: nowIso,
                  updatedAt: nowIso,
                });
                setShowAddModal(true);
              }}
              onEditItem={(item) => {
                setActiveMediaEdit(item);
                setShowAddModal(true);
              }}
              onMoveUnfinished={handleMoveUnfinishedWishlist}
              darkMode={darkMode}
              onSelectItem={setActiveMediaDetailId}
            />
          </div>
        )}

        {/* ==================== TAB 2: 媒体库 (ARCHIVE DISPLAY) ==================== */}
        {selectedTab === 'archive' && (
          <div className="space-y-5 animate-fade-in">
            {/* Search, Status & Media Quick Filters */}
            <div className={`p-4 rounded-none border flex flex-col md:flex-row md:items-center gap-4 ${
              darkMode ? 'bg-[#191b1e] border-[#2d3137]' : 'bg-white border-[#E6E0D5] shadow-sm'
            }`}>
              {/* Search bar */}
              <div className="relative flex-grow flex gap-3">
                <div className="relative flex-grow">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-zinc-450" />
                  <input
                    type="text"
                    placeholder="搜索名称、作者或标签……"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full text-sm pl-9 pr-4 py-2.5 rounded-none border focus:outline-none ${
                      darkMode
                        ? 'bg-[#111214] border-[#2d3137] focus:border-[#635C56] text-zinc-100'
                        : 'bg-[#FAF8F5] border-[#E6E0D5] focus:border-[#4A3B32] text-[#2B1E19]'
                    }`}
                  />
                </div>
              </div>

              {/* Status Selector Dropdown */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Filter size={12} className="opacity-40" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-serif">状态筛选</span>
                </div>
                <div className="flex bg-[#FAF8F5] dark:bg-[#111214] p-1 border border-[#E6E0D5] dark:border-[#2d3137] gap-1 text-xs rounded-none">
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'wishlist', label: '想读看' },
                    { key: 'progress', label: '进行中' },
                    { key: 'completed', label: '已完成' },
                  ].map(st => (
                    <button
                      key={st.key}
                      onClick={() => setSelectedStatusFilter(st.key as any)}
                      className={`px-3 py-1 rounded-none font-bold text-xs uppercase tracking-wide transition-all duration-150 cursor-pointer ${
                        selectedStatusFilter === st.key
                          ? 'bg-[#4A3B32] text-[#FBF9F3] dark:bg-[#DDDAC4] dark:text-[#111214] font-bold'
                          : 'opacity-60 hover:opacity-100 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Redesigned Media Type Categories Dock */}
            <div className="space-y-2 mt-4 font-serif">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-serif uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-bold">媒体类型</span>
                <span className="h-px bg-[#E6E0D5] dark:bg-[#2d3137] flex-grow" />
              </div>
              <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2d3137] w-full rounded-none">
                {[
                  { key: 'all' as const, label: '全部', icon: <Layers size={13} /> },
                  { key: 'book' as const, label: '图书', icon: <Book size={13} /> },
                  { key: 'movie' as const, label: '电影', icon: <Film size={13} /> },
                  { key: 'tv' as const, label: '剧集', icon: <Tv size={13} /> },
                  { key: 'anime' as const, label: '动漫', icon: <Ghost size={13} /> },
                  { key: 'music' as const, label: '音乐', icon: <Music size={13} /> },
                  { key: 'game' as const, label: '游戏', icon: <Gamepad size={13} /> },
                  { key: 'other' as const, label: '其他', icon: <Sparkles size={13} /> },
                ].map(cat => {
                  const isActive = selectedTypeFilter === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedTypeFilter(cat.key as any)}
                      className={`px-3.5 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#4A3B32] text-[#FBF9F3] border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] dark:border-[#DDDAC4]'
                          : (darkMode
                              ? 'bg-[#191b1e]/40 text-zinc-400 border-[#2d3137] hover:bg-zinc-900 hover:text-zinc-200'
                              : 'bg-white text-[#756256] border-[#E6E0D5] hover:bg-[#FAF7F2] hover:text-[#4A3B32]')
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unified grid display of media records */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mt-4">
                {filteredItems.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onClick={() => setActiveMediaDetailId(item.id)}
                    onContextMenu={handleMediaContextMenu}
                    onStatusChange={(itemId, newStatus, extraFields) => {
                      setMediaItems(prev => prev.map(m => {
                        if (m.id === itemId) {
                          const now = new Date().toISOString();
                          const updated = {
                            ...m,
                            status: newStatus,
                            updatedAt: now,
                            ...extraFields
                          };
                          // If moving to completed, set completedDate
                          if (newStatus === 'completed' && !m.completedDate) {
                            updated.completedDate = now.split('T')[0];
                          }
                          // If moving to progress, set startDate
                          if (newStatus === 'progress' && !m.startDate) {
                            updated.startDate = now.split('T')[0];
                          }
                          // If moving to wishlist (加入清单-默认本月), and wishlistMonth is empty, set default to this month
                          if (newStatus === 'wishlist' && !m.wishlistMonth) {
                            const nowStr = now.split('T')[0];
                            updated.wishlistMonth = nowStr.substring(0, 7); // e.g. "2026-07"
                          }
                          return updated;
                        }
                        return m;
                      }));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-4 rounded-none">
                <div className="flex justify-center">
                  <Compass size={28} className="text-zinc-400 opacity-60" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider">未找到匹配记录</h3>
                <p className="text-xs opacity-50 max-w-[340px] mx-auto leading-relaxed">
                  尝试更改搜索关键字或选择不同的过滤器。
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTypeFilter('all');
                    setSelectedStatusFilter('all');
                    setSelectedCollectionFilter(null);
                  }}
                  className="px-3.5 py-1.5 text-[11px] bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-bold uppercase tracking-widest rounded-none transition-colors cursor-pointer font-serif"
                >
                  重置筛选条件
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: 分类合集 (COLLECTIONS) ==================== */}
        {selectedTab === 'collections' && (
          <CollectionManager
            collections={collections}
            mediaItems={mediaItems}
            onCreateCollection={handleCreateCollection}
            onDeleteCollection={handleDeleteCollection}
            onUpdateCollection={handleUpdateCollection}
            onUpdateItemCollections={handleUpdateItemCollections}
            onSelectCollectionFilter={(colId) => {
              setSelectedCollectionFilter(colId);
            }}
            selectedCollectionId={selectedCollectionFilter}
            onSelectItem={(itemId) => {
              setSelectedTab('archive');
              setActiveMediaDetailId(itemId);
            }}
          />
        )}

        {/* ==================== TAB 4: 日常专注打卡 (CALENDAR & HABITS) ==================== */}
        {selectedTab === 'calendar' && (
          <div className="animate-fade-in">
            <CheckInCalendar
              habits={habits}
              checkInLogs={checkInLogs}
              mediaItems={mediaItems}
              onToggleCheckIn={handleToggleCheckIn}
              onSelectItem={(id) => setActiveMediaDetailId(id)}
            />
          </div>
        )}

        {/* ==================== TAB 5: 数据管理与导入 (BACKUP MANAGEMENT) ==================== */}
        {selectedTab === 'backup' && (
          <div className="animate-fade-in">
            <DataManagement
              mediaItems={mediaItems}
              collections={collections}
              habits={habits}
              checkInLogs={checkInLogs}
              onImport={handleImportBackup}
              onReset={handleResetToDefault}
              onBulkAddItems={handleBulkAddItems}
              darkMode={darkMode}
            />
          </div>
        )}

      </div>

      {/* ==================== DETAILED DIALOG MODAL ==================== */}
      {activeMediaDetail && (
        <MediaDetailModal
          item={activeMediaDetail}
          onUpdateItem={(updated) => {
            setMediaItems(prev => prev.map(m => m.id === updated.id ? updated : m));
          }}
          onEdit={() => {
            setActiveMediaEdit(activeMediaDetail);
            setActiveMediaDetailId(null);
          }}
          onDelete={() => handleDeleteMedia(activeMediaDetail.id)}
          onClose={() => setActiveMediaDetailId(null)}
        />
      )}

      {/* ==================== EDIT / CREATE FORM MODAL ==================== */}
      {(showAddModal || activeMediaEdit) && (
        <MediaEditModal
          item={activeMediaEdit || undefined}
          collections={collections}
          onSave={handleCreateOrUpdateMedia}
          onClose={() => {
            setShowAddModal(false);
            setActiveMediaEdit(null);
          }}
        />
      )}

      {/* Global Collection Context Menu */}
      <AnimatePresence>
        {collectionContextMenu && (
          <div 
            className="fixed inset-0 z-[9999]" 
            onClick={() => setCollectionContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCollectionContextMenu(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bg-white dark:bg-[#1c1e22] border border-[#E6E0D5] dark:border-zinc-800 shadow-2xl py-1.5 min-w-[200px] max-h-[400px] overflow-y-auto"
              style={{ 
                left: Math.min(collectionContextMenu.x, window.innerWidth - 220), 
                top: Math.min(collectionContextMenu.y, window.innerHeight - 420) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-serif">加入合集 / ADD TO COLLECTION</span>
              </div>
              {(() => {
                const targetItem = mediaItems.find(i => i.id === collectionContextMenu.itemId);
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
                            const newCollections = isInCollection
                              ? (targetItem.collections || []).filter(id => id !== col.id)
                              : [...(targetItem.collections || []), col.id];
                            handleUpdateItemCollections(targetItem.id, newCollections);
                            setCollectionContextMenu(null);
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
