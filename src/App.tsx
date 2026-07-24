/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Film, Tv, Music, Gamepad, Compass, Bookmark, Search, Plus, Sun, Moon, Database, Calendar, Layers, Sparkles, Filter, SquareCheck, LogOut, User, Ghost, Folder, Tag, ChevronDown, ChevronUp, Settings, HelpCircle } from 'lucide-react';
import { MediaItem, Collection, CheckInHabit, CheckInLog, MediaType, MEDIA_TYPE_LABELS, TagDefinition } from './types';
import { deduplicateLogs } from './utils/helpers';
import { DEFAULT_MEDIA_ITEMS, DEFAULT_COLLECTIONS, DEFAULT_HABITS, DEFAULT_CHECK_IN_LOGS, DEFAULT_TAG_DEFINITIONS } from './utils/defaultData';

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
import TagManagerModal from './components/TagManagerModal';
import UserGuideModal from './components/UserGuideModal';
import AccountSettingsModal from './components/AccountSettingsModal';
import { apiJson } from './utils/api';
import { getDisplayCoverCandidates } from './utils/imageProxy';

type CloudPayload = {
  version: string;
  exportedAt: string;
  mediaItems: MediaItem[];
  collections: Collection[];
  habits: CheckInHabit[];
  checkInLogs: CheckInLog[];
  tagDefinitions: TagDefinition[];
};

type CloudSyncState = {
  enabled: boolean;
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'conflict';
  message: string;
  updatedAt?: string | null;
};

type RecoverySnapshotInfo = {
  available: boolean;
  savedAt?: string | null;
  itemCount?: number;
};

type SafetySnapshot = {
  id: string;
  reason: string;
  savedAt: string;
  payload: CloudPayload;
};

type SafetySnapshotInfo = {
  available: boolean;
  savedAt?: string | null;
  reason?: string;
  itemCount?: number;
  snapshotCount?: number;
};

function getOnboardingKey(username: string | null): string {
  const normalized = username?.trim().toLowerCase() || 'guest';
  return `media_management_onboarding_completed_${normalized}`;
}

function normalizeMediaCoverUrl(url: string): string {
  return url
    .replace('/s_ratio_poster/', '/l_ratio_poster/')
    .replace('/mpic/', '/lpic/')
    .replace('/spic/', '/lpic/');
}

function normalizeKnownTestCover(item: MediaItem): string {
  const coverUrl = item.coverUrl || '';
  if (item.id === 'test-wikipedia-three-body' && (!coverUrl || coverUrl.startsWith('data:image/svg+xml'))) {
    return 'https://img1.doubanio.com/view/subject/l/public/s2768378.jpg';
  }
  if (item.id === 'test-douban-game-zelda' && (!coverUrl || coverUrl.startsWith('data:image/svg+xml'))) {
    return 'https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg';
  }
  return coverUrl;
}

function normalizeLegacyMediaItem(item: MediaItem): MediaItem {
  const title = (item.title || '').trim();
  const titleParts = title.split(/\s+\/\s+/).map(part => part.trim()).filter(Boolean);
  const normalizedTitleFields = !item.originalTitle && titleParts.length >= 2
    ? {
        title: titleParts[0],
        originalTitle: titleParts.slice(1).join(' / '),
      }
    : {};

  return {
    ...item,
    ...normalizedTitleFields,
    coverUrl: normalizeMediaCoverUrl(normalizeKnownTestCover(item)),
  };
}

function normalizeMediaItems(items: MediaItem[]): MediaItem[] {
  return items.map(normalizeLegacyMediaItem);
}

function getArchiveGridColumnsForWidth(width: number): number {
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

function getCurrentArchiveGridColumns(): number {
  if (typeof window === 'undefined') return 5;
  return getArchiveGridColumnsForWidth(window.innerWidth);
}

export default function App() {
  // Helper for user-scoped storage key
  const getStorageKey = (keyType: 'items' | 'collections' | 'logs' | 'tags', username: string | null, isAdminUser: boolean) => {
    if (!username) return `media_archive_${keyType}_guest`;
    const normalized = username.trim().toLowerCase();
    if (isAdminUser || normalized === 'echoingstill' || normalized === 'admin') {
      return `media_archive_${keyType}_admin`;
    }
    return `media_archive_${keyType}_user_${normalized}`;
  };

  // --- Authentication State ---
  const initialUser = localStorage.getItem('media_management_user');
  const initialAdmin = localStorage.getItem('media_management_is_admin') === 'true' || (initialUser?.toLowerCase() === 'echoingstill') || (initialUser?.toLowerCase() === 'admin');

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (initialUser === 'Guest') {
      localStorage.removeItem('media_management_user');
      return null;
    }
    return initialUser;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return initialAdmin;
  });
  const [loadedStorageScope, setLoadedStorageScope] = useState<string>(() => {
    if (!initialUser || initialUser === 'Guest') return '';
    return getStorageKey('items', initialUser, initialAdmin);
  });

  const handleLogin = (username: string, adminStatus = false) => {
    const isAdm = adminStatus || username.toLowerCase() === 'echoingstill' || username.toLowerCase() === 'admin';
    setLoadedStorageScope('');
    setCurrentUser(username);
    localStorage.setItem('media_management_user', username);
    if (isAdm) {
      setIsAdmin(true);
      localStorage.setItem('media_management_is_admin', 'true');
    } else {
      setIsAdmin(false);
      localStorage.removeItem('media_management_is_admin');
    }
    window.dispatchEvent(new Event('media_archive_guides_reset'));
  };

  const handleLogout = () => {
    setLoadedStorageScope('');
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem('media_management_user');
    localStorage.removeItem('media_management_is_admin');
    localStorage.removeItem('media_management_cloud_token');
    localStorage.removeItem('media_management_cloud_user');
    localStorage.removeItem('media_management_cloud_updated_at');
    setCloudSync({
      enabled: false,
      status: 'error',
      message: '已退出云同步账号。',
    });
    window.dispatchEvent(new Event('media_archive_guides_reset'));
  };

  // --- Persistent LocalState ---
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    if (!initialUser || initialUser === 'Guest') return [];
    if (initialAdmin) {
      const saved = localStorage.getItem('media_archive_items_admin') || localStorage.getItem('media_archive_items');
      return saved ? normalizeMediaItems(JSON.parse(saved)) : DEFAULT_MEDIA_ITEMS;
    } else {
      const userKey = `media_archive_items_user_${initialUser.toLowerCase()}`;
      const saved = localStorage.getItem(userKey);
      return saved ? normalizeMediaItems(JSON.parse(saved)) : [];
    }
  });

  // Track the sorting order stable across renders
  const [sortedMediaIds, setSortedMediaIds] = useState<string[]>(() => {
    return mediaItems.map(itm => itm.id);
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    if (!initialUser || initialUser === 'Guest') return [];
    if (initialAdmin) {
      const saved = localStorage.getItem('media_archive_collections_admin') || localStorage.getItem('media_archive_collections');
      return saved ? JSON.parse(saved) : DEFAULT_COLLECTIONS;
    } else {
      const userKey = `media_archive_collections_user_${initialUser.toLowerCase()}`;
      const saved = localStorage.getItem(userKey);
      return saved ? JSON.parse(saved) : [];
    }
  });

  const [habits, setHabits] = useState<CheckInHabit[]>(() => {
    return (Object.keys(MEDIA_TYPE_LABELS) as MediaType[]).map(type => ({
      id: type,
      name: MEDIA_TYPE_LABELS[type],
      color: type === 'book' ? 'orange' : type === 'movie' ? 'blue' : type === 'tv' ? 'purple' : type === 'anime' ? 'rose' : type === 'music' ? 'green' : type === 'game' ? 'amber' : 'zinc',
    }));
  });

  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>(() => {
    if (!initialUser || initialUser === 'Guest') return [];
    if (initialAdmin) {
      const saved = localStorage.getItem('media_archive_check_in_logs_admin') || localStorage.getItem('media_archive_check_in_logs');
      return saved ? JSON.parse(saved) : DEFAULT_CHECK_IN_LOGS;
    } else {
      const userKey = `media_archive_check_in_logs_user_${initialUser.toLowerCase()}`;
      const saved = localStorage.getItem(userKey);
      return saved ? JSON.parse(saved) : [];
    }
  });

  const darkMode = true;

  // --- Tag System State ---
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>(() => {
    if (!initialUser || initialUser === 'Guest') return [];
    if (initialAdmin) {
      const saved = localStorage.getItem('media_archive_tags_admin') || localStorage.getItem('media_archive_tag_definitions');
      return saved ? JSON.parse(saved) : DEFAULT_TAG_DEFINITIONS;
    } else {
      const userKey = `media_archive_tags_user_${initialUser.toLowerCase()}`;
      const saved = localStorage.getItem(userKey);
      return saved ? JSON.parse(saved) : [];
    }
  });

  // Reload user data when user changes
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser === 'Guest') {
      handleLogout();
      return;
    }

    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const itemKey = getStorageKey('items', currentUser, isAdm);
    const collectionKey = getStorageKey('collections', currentUser, isAdm);
    const logKey = getStorageKey('logs', currentUser, isAdm);
    const tagKey = getStorageKey('tags', currentUser, isAdm);

    // Load items
    const savedItems = localStorage.getItem(itemKey) || (isAdm ? localStorage.getItem('media_archive_items') : null);
    if (savedItems) {
      try { setMediaItems(normalizeMediaItems(JSON.parse(savedItems))); } catch { setMediaItems(isAdm ? DEFAULT_MEDIA_ITEMS : []); }
    } else {
      setMediaItems(isAdm ? DEFAULT_MEDIA_ITEMS : []);
    }

    // Load collections
    const savedCols = localStorage.getItem(collectionKey) || (isAdm ? localStorage.getItem('media_archive_collections') : null);
    if (savedCols) {
      try { setCollections(JSON.parse(savedCols)); } catch { setCollections(isAdm ? DEFAULT_COLLECTIONS : []); }
    } else {
      setCollections(isAdm ? DEFAULT_COLLECTIONS : []);
    }

    // Load logs
    const savedLogs = localStorage.getItem(logKey) || (isAdm ? localStorage.getItem('media_archive_check_in_logs') : null);
    if (savedLogs) {
      try { setCheckInLogs(JSON.parse(savedLogs)); } catch { setCheckInLogs(isAdm ? DEFAULT_CHECK_IN_LOGS : []); }
    } else {
      setCheckInLogs(isAdm ? DEFAULT_CHECK_IN_LOGS : []);
    }

    // Load tags
    const savedTags = localStorage.getItem(tagKey) || (isAdm ? localStorage.getItem('media_archive_tag_definitions') : null);
    if (savedTags) {
      try { setTagDefinitions(JSON.parse(savedTags)); } catch { setTagDefinitions(isAdm ? DEFAULT_TAG_DEFINITIONS : []); }
    } else {
      setTagDefinitions(isAdm ? DEFAULT_TAG_DEFINITIONS : []);
    }
    setLoadedStorageScope(itemKey);
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!currentUser) return;
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const tagKey = getStorageKey('tags', currentUser, isAdm);
    const itemKey = getStorageKey('items', currentUser, isAdm);
    if (loadedStorageScope !== itemKey) return;
    localStorage.setItem(tagKey, JSON.stringify(tagDefinitions));
    if (isAdm) {
      localStorage.setItem('media_archive_tag_definitions', JSON.stringify(tagDefinitions));
    }
  }, [tagDefinitions, currentUser, isAdmin, loadedStorageScope]);

  const handleRegisterTag = (name: string, mediaType: MediaType | 'global' = 'global') => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setTagDefinitions(prev => {
      const existing = prev.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        if (mediaType && existing.mediaType !== mediaType) {
          return prev.map(t => t.id === existing.id ? { ...t, mediaType } : t);
        }
        return prev;
      }
      const newTag: TagDefinition = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        mediaType,
      };
      return [...prev, newTag];
    });
  };

  const handleRenameTagInItems = (oldName: string, newName: string) => {
    setMediaItems(prev => prev.map(item => {
      if (!item.tags || !item.tags.includes(oldName)) return item;
      return {
        ...item,
        tags: item.tags.map(t => t === oldName ? newName : t),
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const handleDeleteTagInItems = (tagName: string) => {
    setMediaItems(prev => prev.map(item => {
      if (!item.tags || !item.tags.includes(tagName)) return item;
      return {
        ...item,
        tags: item.tags.filter(t => t !== tagName),
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const handleClearSampleData = () => {
    setMediaItems([]);
    setCheckInLogs([]);
    setSortedMediaIds([]);
    if (currentUser) {
      const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
      const itemKey = getStorageKey('items', currentUser, isAdm);
      const logKey = getStorageKey('logs', currentUser, isAdm);
      localStorage.setItem(itemKey, JSON.stringify([]));
      localStorage.setItem(logKey, JSON.stringify([]));
      if (isAdm) {
        localStorage.setItem('media_archive_items', JSON.stringify([]));
        localStorage.setItem('media_archive_check_in_logs', JSON.stringify([]));
      }
    }
  };

  const handleResetSampleData = () => {
    setMediaItems(DEFAULT_MEDIA_ITEMS);
    setCollections(DEFAULT_COLLECTIONS);
    setCheckInLogs(DEFAULT_CHECK_IN_LOGS);
    setSortedMediaIds(DEFAULT_MEDIA_ITEMS.map(i => i.id));
    if (currentUser) {
      const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
      const itemKey = getStorageKey('items', currentUser, isAdm);
      const collectionKey = getStorageKey('collections', currentUser, isAdm);
      const logKey = getStorageKey('logs', currentUser, isAdm);
      localStorage.setItem(itemKey, JSON.stringify(DEFAULT_MEDIA_ITEMS));
      localStorage.setItem(collectionKey, JSON.stringify(DEFAULT_COLLECTIONS));
      localStorage.setItem(logKey, JSON.stringify(DEFAULT_CHECK_IN_LOGS));
      if (isAdm) {
        localStorage.setItem('media_archive_items', JSON.stringify(DEFAULT_MEDIA_ITEMS));
        localStorage.setItem('media_archive_collections', JSON.stringify(DEFAULT_COLLECTIONS));
        localStorage.setItem('media_archive_check_in_logs', JSON.stringify(DEFAULT_CHECK_IN_LOGS));
      }
    }
  };

  // --- Search / Filters / Navigation State ---
  // The user requested: "主页只显示清单，然后才是媒体库"
  // Default tab is 'wishlist' (想看清单)
  const [selectedTab, setSelectedTab] = useState<'wishlist' | 'archive' | 'collections' | 'calendar' | 'backup'>('wishlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<MediaType | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<MediaItem['status'] | 'all'>('all');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | 'all'>('all');
  const [archiveGridColumns, setArchiveGridColumns] = useState(getCurrentArchiveGridColumns);
  const [archivePage, setArchivePage] = useState(1);
  const archiveDragStateRef = React.useRef({ startX: 0, active: false, moved: false });
  const [isStandaloneTagsExpanded, setIsStandaloneTagsExpanded] = useState(false);
  const [recoverySnapshotTick, setRecoverySnapshotTick] = useState(0);
  const [safetySnapshotTick, setSafetySnapshotTick] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setArchiveGridColumns(getCurrentArchiveGridColumns());
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [showTagManager, setShowTagManager] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [userGuideInitialTab, setUserGuideInitialTab] = useState<'features' | 'triggers' | 'data'>('features');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGuidePrompt, setShowGuidePrompt] = useState(false);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>(() => {
    const hasToken = Boolean(localStorage.getItem('media_management_cloud_token'));
    return {
      enabled: hasToken,
      status: hasToken ? 'idle' : 'error',
      message: hasToken ? '已登录云同步账号，等待同步。' : '当前未连接云同步。本机记录仍会保存；需要多设备同步时请联系部署者开启云同步。',
      updatedAt: localStorage.getItem('media_management_cloud_updated_at'),
    };
  });

  useEffect(() => {
    if (!currentUser) {
      setShowGuidePrompt(false);
      return;
    }
    setShowGuidePrompt(localStorage.getItem(getOnboardingKey(currentUser)) !== 'true');
  }, [currentUser]);

  const buildCloudPayload = (): CloudPayload => ({
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    mediaItems,
    collections,
    habits,
    checkInLogs,
    tagDefinitions,
  });

  const getRecoverySnapshotKey = () => `media_management_pre_cloud_restore_${currentUser || 'guest'}`;

  const parseRecoverySnapshot = (raw: string | null): Partial<CloudPayload> | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const getRecoverySnapshotPayload = (): Partial<CloudPayload> | null => {
    const keys = Array.from(new Set([
      getRecoverySnapshotKey(),
      currentUser ? `media_management_pre_cloud_restore_${currentUser.trim().toLowerCase()}` : '',
      'media_management_pre_cloud_restore_guest',
    ].filter(Boolean)));

    for (const key of keys) {
      const snapshot = parseRecoverySnapshot(localStorage.getItem(key));
      if (snapshot && hasMeaningfulCloudPayload(snapshot)) return snapshot;
    }
    return null;
  };

  const gzipTextToBase64 = async (text: string): Promise<string | null> => {
    const CompressionStreamCtor = (window as any).CompressionStream;
    if (!CompressionStreamCtor) return null;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStreamCtor('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const hasMeaningfulCloudPayload = (payload: Partial<CloudPayload>) => {
    return Boolean(
      (Array.isArray(payload.mediaItems) && payload.mediaItems.length > 0) ||
      (Array.isArray(payload.collections) && payload.collections.length > 0) ||
      (Array.isArray(payload.checkInLogs) && payload.checkInLogs.length > 0)
    );
  };

  const getSafetySnapshotsKey = () => `media_management_safety_snapshots_${currentUser || 'guest'}`;

  const readSafetySnapshots = (): SafetySnapshot[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getSafetySnapshotsKey()) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter(snapshot => snapshot?.payload && hasMeaningfulCloudPayload(snapshot.payload))
        : [];
    } catch {
      return [];
    }
  };

  const writeSafetySnapshots = (snapshots: SafetySnapshot[]) => {
    let next = snapshots.slice(0, 6);
    while (next.length > 0) {
      try {
        localStorage.setItem(getSafetySnapshotsKey(), JSON.stringify(next));
        setSafetySnapshotTick(tick => tick + 1);
        return true;
      } catch {
        next = next.slice(0, -1);
      }
    }
    return false;
  };

  const saveSafetySnapshot = (reason: string) => {
    const payload = buildCloudPayload();
    if (!hasMeaningfulCloudPayload(payload)) return false;
    const snapshot: SafetySnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      reason,
      savedAt: new Date().toISOString(),
      payload,
    };
    return writeSafetySnapshots([snapshot, ...readSafetySnapshots()]);
  };

  const recoverySnapshotInfo: RecoverySnapshotInfo = React.useMemo(() => {
    const snapshot = getRecoverySnapshotPayload();
    if (!snapshot) return { available: false };
    return {
      available: true,
      savedAt: snapshot.exportedAt || null,
      itemCount: Array.isArray(snapshot.mediaItems) ? snapshot.mediaItems.length : 0,
    };
  }, [currentUser, recoverySnapshotTick, mediaItems.length]);

  const safetySnapshotInfo: SafetySnapshotInfo = React.useMemo(() => {
    const snapshots = readSafetySnapshots();
    const latest = snapshots[0];
    if (!latest) return { available: false, snapshotCount: 0 };
    return {
      available: true,
      savedAt: latest.savedAt,
      reason: latest.reason,
      itemCount: Array.isArray(latest.payload.mediaItems) ? latest.payload.mediaItems.length : 0,
      snapshotCount: snapshots.length,
    };
  }, [currentUser, safetySnapshotTick, mediaItems.length]);

  const hasStoredArrayData = (key: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed);
    } catch {
      return raw.trim().length > 0;
    }
  };

  const hasStoredUserData = () => {
    if (!currentUser) return false;
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    return Boolean(
      hasStoredArrayData(getStorageKey('items', currentUser, isAdm)) ||
      hasStoredArrayData(getStorageKey('collections', currentUser, isAdm)) ||
      hasStoredArrayData(getStorageKey('logs', currentUser, isAdm))
    );
  };

  const normalizeCloudIdentityText = (value?: string) =>
    (value || '').toLowerCase().replace(/\s+/g, ' ').replace(/[“”"']/g, '').trim();

  const getMediaIdentityCandidates = (item: MediaItem) => {
    const candidates = [
      item.id,
      item.sourceUrl,
      item.title,
      item.originalTitle,
      `${item.title} / ${item.originalTitle || ''}`,
    ].map(normalizeCloudIdentityText).filter(Boolean);
    return Array.from(new Set(candidates));
  };

  const isSameCloudMediaItem = (a: MediaItem, b: MediaItem) => {
    if (a.sourceUrl && b.sourceUrl && a.sourceUrl === b.sourceUrl) return true;
    const aKeys = getMediaIdentityCandidates(a);
    const bKeys = getMediaIdentityCandidates(b);
    return aKeys.some(key => bKeys.includes(key));
  };

  const isNewerItem = (a?: string, b?: string) => {
    const aTime = a ? new Date(a).getTime() : 0;
    const bTime = b ? new Date(b).getTime() : 0;
    return aTime >= bTime;
  };

  const mergeCloudMediaItem = (cloudItem: MediaItem, localItem: MediaItem): MediaItem => {
    const primary = isNewerItem(localItem.updatedAt, cloudItem.updatedAt) ? localItem : cloudItem;
    const secondary = primary === localItem ? cloudItem : localItem;
    return {
      ...secondary,
      ...primary,
      originalTitle: primary.originalTitle || secondary.originalTitle,
      creator: primary.creator || secondary.creator,
      coverUrl: primary.coverUrl || secondary.coverUrl,
      description: primary.description || secondary.description,
      sourceUrl: primary.sourceUrl || secondary.sourceUrl,
      completedDate: primary.completedDate || secondary.completedDate,
      startDate: primary.startDate || secondary.startDate,
      wishlistMonth: primary.wishlistMonth || secondary.wishlistMonth,
      personalRating: primary.personalRating || secondary.personalRating || 0,
      personalNote: primary.personalNote || secondary.personalNote || '',
      tags: Array.from(new Set([...(secondary.tags || []), ...(primary.tags || [])])),
      collections: Array.from(new Set([...(secondary.collections || []), ...(primary.collections || [])])),
      noteImages: Array.from(new Set([...(secondary.noteImages || []), ...(primary.noteImages || [])])),
      reReadLogs: deduplicateLogs([...(secondary.reReadLogs || []), ...(primary.reReadLogs || [])]),
      reReadCount: deduplicateLogs([...(secondary.reReadLogs || []), ...(primary.reReadLogs || [])]).length,
      updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString(),
    };
  };

  const mergeMediaArrays = (cloudItems: MediaItem[] = [], localItems: MediaItem[] = []) => {
    const merged = normalizeMediaItems(cloudItems);
    normalizeMediaItems(localItems).forEach(localItem => {
      const matchIndex = merged.findIndex(cloudItem => isSameCloudMediaItem(cloudItem, localItem));
      if (matchIndex >= 0) {
        merged[matchIndex] = mergeCloudMediaItem(merged[matchIndex], localItem);
      } else {
        merged.unshift(localItem);
      }
    });
    return merged;
  };

  const mergeById = <T extends { id: string }>(cloudValues: T[] = [], localValues: T[] = []) => {
    const map = new Map<string, T>();
    cloudValues.forEach(value => map.set(value.id, value));
    localValues.forEach(value => map.set(value.id, { ...(map.get(value.id) || {} as T), ...value }));
    return Array.from(map.values());
  };

  const mergeCheckInLogArrays = (cloudLogs: CheckInLog[] = [], localLogs: CheckInLog[] = []) => {
    const map = new Map<string, CheckInLog>();
    [...cloudLogs, ...localLogs].forEach(log => {
      const key = `${log.date}__${log.habitId}__${(log.note || '').trim()}`;
      map.set(key, log);
    });
    return Array.from(map.values());
  };

  const mergeCloudPayloadWithLocal = (payload: Partial<CloudPayload>): Partial<CloudPayload> => ({
    ...payload,
    mediaItems: mergeMediaArrays(payload.mediaItems || [], mediaItems),
    collections: mergeById(payload.collections || [], collections),
    habits: mergeById(payload.habits || [], habits),
    checkInLogs: mergeCheckInLogArrays(payload.checkInLogs || [], checkInLogs),
    tagDefinitions: mergeById(payload.tagDefinitions || [], tagDefinitions),
  });

  const applyCloudPayload = (payload: Partial<CloudPayload>, options: { mergeLocal?: boolean } = {}) => {
    const nextPayload = options.mergeLocal ? mergeCloudPayloadWithLocal(payload) : payload;
    if (Array.isArray(nextPayload.mediaItems)) setMediaItems(normalizeMediaItems(nextPayload.mediaItems));
    if (Array.isArray(nextPayload.collections)) setCollections(nextPayload.collections);
    if (Array.isArray(nextPayload.habits)) setHabits(nextPayload.habits);
    if (Array.isArray(nextPayload.checkInLogs)) setCheckInLogs(nextPayload.checkInLogs);
    if (Array.isArray(nextPayload.tagDefinitions)) setTagDefinitions(nextPayload.tagDefinitions);
  };

  const getCloudToken = () => localStorage.getItem('media_management_cloud_token') || '';

  const handlePullCloud = async () => {
    const token = getCloudToken();
    if (!token) {
      setCloudSync({
        enabled: false,
        status: 'error',
        message: '未登录云同步账号，请重新登录。',
      });
      return;
    }
    setCloudSync(prev => ({ ...prev, enabled: true, status: 'syncing', message: '正在从云端读取数据...' }));
    try {
      const { response, data } = await apiJson<{
        success?: boolean;
        data?: CloudPayload | null;
        updatedAt?: string | null;
        error?: string;
      }>('/api/sync/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || '读取云端数据失败。');
      }
      if (!data.data) {
        setCloudSync({
          enabled: true,
          status: 'synced',
          message: '云端暂无数据，可先上传本机数据。',
          updatedAt: null,
        });
        return;
      }
      if (hasMeaningfulCloudPayload(buildCloudPayload())) {
        saveSafetySnapshot('从云端合并恢复前');
        localStorage.setItem(
          getRecoverySnapshotKey(),
          JSON.stringify(buildCloudPayload())
        );
        setRecoverySnapshotTick(tick => tick + 1);
      }
      applyCloudPayload(data.data, { mergeLocal: true });
      if (data.updatedAt) {
        localStorage.setItem('media_management_cloud_updated_at', data.updatedAt);
      }
      setCloudSync({
        enabled: true,
        status: 'synced',
        message: '已从云端合并恢复到本机。本机未同步的新条目会被保留，并已自动保存恢复前快照；确认无误后可手动上传到云端。',
        updatedAt: data.updatedAt,
      });
    } catch (error: any) {
      setCloudSync({
        enabled: Boolean(token),
        status: 'error',
        message: error.message || '读取云端数据失败。',
      });
    }
  };

  const handleRestoreRecoverySnapshot = () => {
    const snapshot = getRecoverySnapshotPayload();
    if (!snapshot) {
      setCloudSync(prev => ({
        ...prev,
        status: 'error',
        message: '没有找到可恢复的本机快照。如果旧数据已经被覆盖，需要从之前导出的 JSON 或豆瓣 CSV 重新导入。',
      }));
      return;
    }

    saveSafetySnapshot('合并恢复云恢复前快照前');
    applyCloudPayload(snapshot, { mergeLocal: true });
    setRecoverySnapshotTick(tick => tick + 1);
    setCloudSync(prev => ({
      ...prev,
      status: 'synced',
      message: '已把云恢复前的本机快照合并回当前数据。请先确认图书等记录已恢复，再手动上传到云端。',
    }));
    setSelectedTab('archive');
  };

  const handleRestoreSafetySnapshot = () => {
    const latest = readSafetySnapshots()[0];
    if (!latest) {
      setCloudSync(prev => ({
        ...prev,
        status: 'error',
        message: '没有找到可恢复的安全快照。如果本机和云端都没有旧数据，需要重新导入 CSV 或 JSON 备份。',
      }));
      return;
    }

    saveSafetySnapshot('合并恢复最近安全快照前');
    applyCloudPayload(latest.payload, { mergeLocal: true });
    setSafetySnapshotTick(tick => tick + 1);
    setCloudSync(prev => ({
      ...prev,
      status: 'synced',
      message: `已合并恢复最近安全快照（${latest.reason}）。请确认数据正常后再上传云端。`,
    }));
    setSelectedTab('archive');
  };

  const handlePushCloud = async (force = false) => {
    const token = getCloudToken();
    if (!token) {
      setCloudSync({
        enabled: false,
        status: 'error',
        message: '未登录云同步账号，请重新登录。',
      });
      return;
    }
    setCloudSync(prev => ({ ...prev, enabled: true, status: 'syncing', message: '正在上传本机数据到云端...' }));
    try {
      saveSafetySnapshot('上传云端前');
      let payload: CloudPayload = buildCloudPayload();
      if (!hasMeaningfulCloudPayload(payload)) {
        setCloudSync({
          enabled: true,
          status: 'error',
          message: '本机没有可上传的档案数据。已阻止空数据覆盖云端，请先从云端恢复或导入备份。',
        });
        return;
      }

      let baseUpdatedAt = localStorage.getItem('media_management_cloud_updated_at');
      if (!force) {
        setCloudSync(prev => ({ ...prev, enabled: true, status: 'syncing', message: '正在合并云端与本机数据...' }));
        const { response: pullResponse, data: pullData } = await apiJson<{
          success?: boolean;
          data?: CloudPayload | null;
          updatedAt?: string | null;
          error?: string;
        }>('/api/sync/data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pullResponse.ok || !pullData?.success) {
          throw new Error(pullData?.error || '上传前读取云端数据失败，已停止上传以避免覆盖云端。');
        }
        if (pullData.data && hasMeaningfulCloudPayload(pullData.data)) {
          payload = {
            ...mergeCloudPayloadWithLocal(pullData.data),
            version: '1.2.0',
            exportedAt: new Date().toISOString(),
          } as CloudPayload;
        }
        baseUpdatedAt = pullData.updatedAt || baseUpdatedAt;
      }
      const payloadJson = JSON.stringify(payload);
      const payloadGzipBase64 = await gzipTextToBase64(payloadJson);
      const { response, data } = await apiJson<{
        success?: boolean;
        updatedAt?: string;
        error?: string;
        conflict?: { updatedAt?: string };
      }>('/api/sync/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(payloadGzipBase64 ? { payloadGzipBase64 } : { payload }),
          baseUpdatedAt,
          force,
        }),
      });
      if (response.status === 409) {
        setCloudSync({
          enabled: true,
          status: 'conflict',
          message: data?.error || '云端数据已变化，请选择从云端恢复或确认用本机覆盖云端。',
          updatedAt: data?.conflict?.updatedAt,
        });
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || '上传云端数据失败。');
      }
      if (data.updatedAt) {
        localStorage.setItem('media_management_cloud_updated_at', data.updatedAt);
      }
      setCloudSync({
        enabled: true,
        status: 'synced',
        message: force ? '本机数据已覆盖同步到云端。' : '本机数据已与云端合并后同步到云端。',
        updatedAt: data.updatedAt,
      });
    } catch (error: any) {
      setCloudSync({
        enabled: Boolean(token),
        status: 'error',
        message: error.message || '上传云端数据失败。',
      });
    }
  };

  useEffect(() => {
    const token = getCloudToken();
    if (!currentUser || !token) {
      setCloudSync(prev => ({
        ...prev,
        enabled: false,
        status: 'error',
        message: '当前未连接云同步。本机记录仍会保存；需要多设备同步时请联系部署者开启云同步。',
      }));
      return;
    }
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const expectedStorageScope = getStorageKey('items', currentUser, isAdm);
    if (loadedStorageScope !== expectedStorageScope) return;

    let cancelled = false;
    const bootstrapCloudSync = async () => {
      setCloudSync(prev => ({ ...prev, enabled: true, status: 'syncing', message: '正在检查云端数据...' }));
      try {
        const { response, data } = await apiJson<{
          success?: boolean;
          data?: CloudPayload | null;
          updatedAt?: string | null;
          error?: string;
        }>('/api/sync/data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || '云同步不可用，本机数据仍会保留。');
        }

        const localHasData = hasStoredUserData();
        if (data.data && !localHasData) {
          applyCloudPayload(data.data, { mergeLocal: true });
          if (data.updatedAt) localStorage.setItem('media_management_cloud_updated_at', data.updatedAt);
          setCloudSync({
            enabled: true,
            status: 'synced',
            message: '已自动从云端加载数据。',
            updatedAt: data.updatedAt,
          });
          return;
        }

        if (!data.data && localHasData) {
          setCloudSync({
            enabled: true,
            status: 'idle',
            message: '云端暂无数据。本机已有记录，请在“数据相关”页确认后手动上传到云端。',
            updatedAt: null,
          });
          return;
        }

        if (data.data && localHasData) {
          setCloudSync({
            enabled: true,
            status: 'conflict',
            message: '本机和云端都有数据。为避免覆盖，请手动选择恢复云端或上传本机数据。',
            updatedAt: data.updatedAt,
          });
          return;
        }

        setCloudSync({
          enabled: true,
          status: 'synced',
          message: '云同步已连接，当前暂无数据。',
          updatedAt: data.updatedAt,
        });
      } catch (error: any) {
        if (cancelled) return;
        setCloudSync({
          enabled: true,
          status: 'error',
          message: error.message || '云同步不可用，本机数据仍会保留。',
        });
      }
    };

    bootstrapCloudSync();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isAdmin, loadedStorageScope]);

  const handleUpdateAccount = (newUsername: string, newPassword?: string) => {
    setLoadedStorageScope('');
    const usersData = localStorage.getItem('media_management_users');
    const users = usersData ? JSON.parse(usersData) : {};

    const oldUser = currentUser || '';
    const oldLower = oldUser.trim().toLowerCase();
    const newLower = newUsername.trim().toLowerCase();

    const currentPass = users[oldLower] || (oldLower === 'echoingstill' ? 'Echoingstill' : '');
    const updatedPass = newPassword ? newPassword : currentPass;

    if (oldLower !== newLower) {
      delete users[oldLower];

      if (!isAdmin) {
        const itemKeyOld = `media_archive_items_user_${oldLower}`;
        const itemKeyNew = `media_archive_items_user_${newLower}`;
        const colKeyOld = `media_archive_collections_user_${oldLower}`;
        const colKeyNew = `media_archive_collections_user_${newLower}`;
        const logKeyOld = `media_archive_check_in_logs_user_${oldLower}`;
        const logKeyNew = `media_archive_check_in_logs_user_${newLower}`;
        const tagKeyOld = `media_archive_tags_user_${oldLower}`;
        const tagKeyNew = `media_archive_tags_user_${newLower}`;

        const savedItems = localStorage.getItem(itemKeyOld);
        if (savedItems) {
          localStorage.setItem(itemKeyNew, savedItems);
          localStorage.removeItem(itemKeyOld);
        }

        const savedCols = localStorage.getItem(colKeyOld);
        if (savedCols) {
          localStorage.setItem(colKeyNew, savedCols);
          localStorage.removeItem(colKeyOld);
        }

        const savedLogs = localStorage.getItem(logKeyOld);
        if (savedLogs) {
          localStorage.setItem(logKeyNew, savedLogs);
          localStorage.removeItem(logKeyOld);
        }

        const savedTags = localStorage.getItem(tagKeyOld);
        if (savedTags) {
          localStorage.setItem(tagKeyNew, savedTags);
          localStorage.removeItem(tagKeyOld);
        }
      }
    }

    users[newLower] = updatedPass;
    localStorage.setItem('media_management_users', JSON.stringify(users));

    setCurrentUser(newUsername.trim());
    localStorage.setItem('media_management_user', newUsername.trim());

    const isAdm = newLower === 'echoingstill' || newLower === 'admin';
    setIsAdmin(isAdm);
    if (isAdm) {
      localStorage.setItem('media_management_is_admin', 'true');
    } else {
      localStorage.removeItem('media_management_is_admin');
    }
  };

  // Client ID for AI limit tracking
  useEffect(() => {
    if (!localStorage.getItem('media_archive_client_id')) {
      const newId = 'client_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('media_archive_client_id', newId);
    }
  }, []);

  // Save states to LocalStorage on changes with user scoping
  useEffect(() => {
    if (!currentUser) return;
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const key = getStorageKey('items', currentUser, isAdm);
    if (loadedStorageScope !== key) return;
    localStorage.setItem(key, JSON.stringify(mediaItems));
    if (isAdm) {
      localStorage.setItem('media_archive_items', JSON.stringify(mediaItems));
    }
  }, [mediaItems, currentUser, isAdmin, loadedStorageScope]);

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
    if (!currentUser) return;
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const key = getStorageKey('collections', currentUser, isAdm);
    const itemKey = getStorageKey('items', currentUser, isAdm);
    if (loadedStorageScope !== itemKey) return;
    localStorage.setItem(key, JSON.stringify(collections));
    if (isAdm) {
      localStorage.setItem('media_archive_collections', JSON.stringify(collections));
    }
  }, [collections, currentUser, isAdmin, loadedStorageScope]);

  useEffect(() => {
    localStorage.setItem('media_archive_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    if (!currentUser) return;
    const isAdm = isAdmin || currentUser.toLowerCase() === 'echoingstill' || currentUser.toLowerCase() === 'admin';
    const key = getStorageKey('logs', currentUser, isAdm);
    const itemKey = getStorageKey('items', currentUser, isAdm);
    if (loadedStorageScope !== itemKey) return;
    localStorage.setItem(key, JSON.stringify(checkInLogs));
    if (isAdm) {
      localStorage.setItem('media_archive_check_in_logs', JSON.stringify(checkInLogs));
    }
  }, [checkInLogs, currentUser, isAdmin, loadedStorageScope]);

  useEffect(() => {
    // Force dark mode always
  }, []);

  // --- Authentication Handlers ---
  // (already defined above)

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
    const existing = mediaItems.find(i => i.title.toLowerCase() === title.trim().toLowerCase());
    if (existing) {
      let updatedLogs = deduplicateLogs(existing.reReadLogs || []);
      const prevDate = existing.completedDate || new Date().toISOString().split('T')[0];
      const prevNote = existing.personalNote?.trim();

      if (prevNote) {
        if (!updatedLogs[0] || updatedLogs[0].note?.trim() !== prevNote) {
          updatedLogs = [{ id: Math.random().toString(36).substring(2, 9), date: prevDate, note: prevNote }, ...updatedLogs];
        }
      } else if (existing.completedDate && updatedLogs.length === 0) {
        updatedLogs = [{ id: Math.random().toString(36).substring(2, 9), date: existing.completedDate, note: '首次完成感悟' }, ...updatedLogs];
      }

      updatedLogs = deduplicateLogs(updatedLogs);

      handleUpdateWishlistItem({
        ...existing,
        wishlistMonth: month,
        status: 'wishlist',
        personalNote: '', // Clear note for new re-read session
        reReadLogs: updatedLogs,
        reReadCount: updatedLogs.length,
        updatedAt: new Date().toISOString()
      });
    } else {
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
    }
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
    tagDefinitions?: TagDefinition[];
  }) => {
    saveSafetySnapshot('导入 JSON 备份前');
    applyCloudPayload(data, { mergeLocal: true });
  };

  const handleResetToDefault = () => {
    saveSafetySnapshot('重置为示例数据前');
    setMediaItems(DEFAULT_MEDIA_ITEMS);
    setCollections(DEFAULT_COLLECTIONS);
    setHabits(DEFAULT_HABITS);
    setCheckInLogs(DEFAULT_CHECK_IN_LOGS);
  };

  const normalizeImportMatchText = (value?: string) =>
    (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[“”"']/g, '')
      .trim();

  const splitLegacyImportedTitle = (value?: string) => {
    const parts = (value || '').split(/\s+\/\s+/).map(part => part.trim()).filter(Boolean);
    return {
      title: parts[0] || value || '',
      originalTitle: parts.length > 1 ? parts.slice(1).join(' / ') : '',
    };
  };

  const shouldReplaceImportedField = (value?: string, importedFallbackPrefix?: string) => {
    const normalized = (value || '').trim();
    if (!normalized) return true;
    if (normalized === '未记录创作者') return true;
    if (normalized === '鏈褰曞垱浣滆€?') return true;
    if (normalized.startsWith('data:image/svg+xml')) return true;
    if (importedFallbackPrefix && normalized.startsWith(importedFallbackPrefix)) return true;
    return false;
  };

  const isSameImportedMedia = (existing: MediaItem, incoming: MediaItem) => {
    if (existing.sourceUrl && incoming.sourceUrl && existing.sourceUrl === incoming.sourceUrl) return true;

    const existingLegacy = splitLegacyImportedTitle(existing.title);
    const titleCandidates = [
      existing.title,
      existing.originalTitle,
      existingLegacy.title,
      existingLegacy.originalTitle,
      `${existingLegacy.title} / ${existingLegacy.originalTitle}`,
    ].map(normalizeImportMatchText).filter(Boolean);

    const incomingCandidates = [
      incoming.title,
      incoming.originalTitle,
      `${incoming.title} / ${incoming.originalTitle || ''}`,
    ].map(normalizeImportMatchText).filter(Boolean);

    return incomingCandidates.some(candidate => titleCandidates.includes(candidate));
  };

  const mergeImportedMediaItem = (existing: MediaItem, incoming: MediaItem): MediaItem => {
    const legacy = splitLegacyImportedTitle(existing.title);
    const tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    const collections = Array.from(new Set([...(existing.collections || []), ...(incoming.collections || [])]));

    return {
      ...existing,
      title: legacy.originalTitle && existing.title.includes(' / ') ? legacy.title : (incoming.title || existing.title),
      originalTitle: existing.originalTitle || incoming.originalTitle || legacy.originalTitle || undefined,
      type: incoming.type || existing.type,
      creator: shouldReplaceImportedField(existing.creator) && incoming.creator ? incoming.creator : existing.creator,
      coverUrl: shouldReplaceImportedField(existing.coverUrl) && incoming.coverUrl ? incoming.coverUrl : existing.coverUrl,
      description:
        shouldReplaceImportedField(existing.description, '批量导入数据') && incoming.description
          ? incoming.description
          : existing.description,
      sourceUrl: existing.sourceUrl || incoming.sourceUrl,
      completedDate: existing.completedDate || incoming.completedDate,
      status: existing.status || incoming.status,
      personalRating: existing.personalRating > 0 ? existing.personalRating : incoming.personalRating,
      personalNote: existing.personalNote || incoming.personalNote,
      tags,
      collections,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleBulkAddItems = (newItems: MediaItem[]) => {
    saveSafetySnapshot('批量导入前');
    setMediaItems(prev => {
      const merged = [...prev];
      const additions: MediaItem[] = [];

      newItems.forEach(item => {
        const matchIndex = merged.findIndex(existing => isSameImportedMedia(existing, item));
        if (matchIndex >= 0) {
          merged[matchIndex] = mergeImportedMediaItem(merged[matchIndex], item);
        } else {
          additions.push(item);
        }
      });

      return [...additions, ...merged];
    });
  };

  // Derived unique bound & standalone tags for the archive tag filter bar
  const { boundTagsForCurrentCategory, standaloneTags } = React.useMemo(() => {
    // Count occurrences of each tag among items matching status filter
    const countMap = new Map<string, number>();
    mediaItems.forEach(item => {
      if (selectedStatusFilter === 'all' || item.status === selectedStatusFilter) {
        item.tags?.forEach(tag => {
          countMap.set(tag, (countMap.get(tag) || 0) + 1);
        });
      }
    });

    // 1. Bound tags for selected category (shown ONLY when a specific category is selected)
    const bound: { name: string; count: number; mediaType: MediaType }[] = [];
    if (selectedTypeFilter !== 'all') {
      const knownBoundNames = new Set<string>();
      tagDefinitions
        .filter(t => t.mediaType === selectedTypeFilter)
        .forEach(t => knownBoundNames.add(t.name));

      mediaItems.forEach(item => {
        if (item.type === selectedTypeFilter) {
          item.tags?.forEach(tag => {
            const def = tagDefinitions.find(t => t.name === tag);
            if (def && def.mediaType === selectedTypeFilter) {
              knownBoundNames.add(tag);
            }
          });
        }
      });

      knownBoundNames.forEach(name => {
        bound.push({
          name,
          count: countMap.get(name) || 0,
          mediaType: selectedTypeFilter,
        });
      });
      bound.sort((a, b) => b.count - a.count);
    }

    // 2. Standalone (uncategorized / global) tags
    const knownStandaloneNames = new Set<string>();
    tagDefinitions
      .filter(t => !t.mediaType || t.mediaType === 'global')
      .forEach(t => knownStandaloneNames.add(t.name));

    mediaItems.forEach(item => {
      if (selectedTypeFilter === 'all' || item.type === selectedTypeFilter) {
        item.tags?.forEach(tag => {
          const def = tagDefinitions.find(t => t.name === tag);
          if (!def || !def.mediaType || def.mediaType === 'global') {
            knownStandaloneNames.add(tag);
          }
        });
      }
    });

    const standalone: { name: string; count: number; mediaType: 'global' }[] = [];
    knownStandaloneNames.forEach(name => {
      standalone.push({
        name,
        count: countMap.get(name) || 0,
        mediaType: 'global',
      });
    });
    standalone.sort((a, b) => b.count - a.count);

    return { boundTagsForCurrentCategory: bound, standaloneTags: standalone };
  }, [mediaItems, selectedTypeFilter, selectedStatusFilter, tagDefinitions]);

  // --- Filters Pipeline ---
  const filteredItems = mediaItems
    .filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle || '').toLowerCase().includes(q) ||
        item.creator.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));

      const matchesType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

      const matchesCollection =
        selectedCollectionFilter === null || item.collections.includes(selectedCollectionFilter);

      const matchesTag =
        selectedTagFilter === 'all' || (item.tags && item.tags.includes(selectedTagFilter));

      return matchesSearch && matchesType && matchesStatus && matchesCollection && matchesTag;
    })
    .sort((a, b) => {
      const idxA = sortedMediaIds.indexOf(a.id);
      const idxB = sortedMediaIds.indexOf(b.id);
      
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return -1; // New items sorted at the top
      if (idxB === -1) return 1;
      
      return idxA - idxB;
    });

  const archivePageSize = archiveGridColumns * 8;
  const totalArchivePages = Math.max(1, Math.ceil(filteredItems.length / archivePageSize));
  const currentArchivePage = Math.min(archivePage, totalArchivePages);
  const archivePageStart = (currentArchivePage - 1) * archivePageSize;
  const visibleFilteredItems = filteredItems.slice(archivePageStart, archivePageStart + archivePageSize);
  const filteredItemCoverSignature = filteredItems.map(item => `${item.id}:${item.coverUrl || ''}`).join('|');

  useEffect(() => {
    setArchivePage(1);
  }, [searchQuery, selectedTypeFilter, selectedStatusFilter, selectedCollectionFilter, selectedTagFilter]);

  useEffect(() => {
    if (archivePage > totalArchivePages) setArchivePage(totalArchivePages);
  }, [archivePage, totalArchivePages]);

  const goToArchivePage = (page: number) => {
    if (totalArchivePages <= 0) return;
    const wrapped = ((page - 1 + totalArchivePages) % totalArchivePages) + 1;
    setArchivePage(wrapped);
  };

  const goToNextArchivePage = () => goToArchivePage(currentArchivePage + 1);
  const goToPrevArchivePage = () => goToArchivePage(currentArchivePage - 1);

  useEffect(() => {
    if (selectedTab !== 'archive' || filteredItems.length === 0 || totalArchivePages <= 1) return;

    const preloadPage = (page: number) => {
      const wrapped = ((page - 1 + totalArchivePages) % totalArchivePages) + 1;
      const start = (wrapped - 1) * archivePageSize;
      filteredItems.slice(start, start + archivePageSize).forEach(item => {
        if (!item.coverUrl) return;
        getDisplayCoverCandidates(item.coverUrl, 'card').forEach(url => {
          const image = new Image();
          image.decoding = 'async';
          image.src = url;
        });
      });
    };

    const run = () => {
      preloadPage(currentArchivePage + 1);
      preloadPage(currentArchivePage - 1);
    };

    const idleWindow = window as any;
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(run, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timerId = window.setTimeout(run, 250);
    return () => window.clearTimeout(timerId);
  }, [selectedTab, currentArchivePage, totalArchivePages, archivePageSize, filteredItemCoverSignature]);

  const archivePageNumbers = Array.from(new Set([
    1,
    currentArchivePage - 1,
    currentArchivePage,
    currentArchivePage + 1,
    totalArchivePages,
  ].filter(page => page >= 1 && page <= totalArchivePages))).sort((a, b) => a - b);

  const renderArchivePagination = (position: 'top' | 'bottom') => (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-zinc-400 font-serif ${position === 'bottom' ? 'pt-2' : ''}`}>
      <span>
        第 {currentArchivePage} / {totalArchivePages} 页，本页 {visibleFilteredItems.length} 项，共 {filteredItems.length} 项
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={goToPrevArchivePage}
          className="px-2.5 py-1 border border-zinc-800 text-zinc-300 hover:text-[#DDDAC4] hover:border-[#DDDAC4] transition-colors"
        >
          上一页
        </button>
        {archivePageNumbers.map((page, index) => (
          <React.Fragment key={page}>
            {index > 0 && page - archivePageNumbers[index - 1] > 1 && (
              <span className="px-1 text-zinc-600">...</span>
            )}
            <button
              type="button"
              onClick={() => goToArchivePage(page)}
              className={`min-w-8 px-2 py-1 border transition-colors ${
                page === currentArchivePage
                  ? 'bg-[#DDDAC4] text-[#111214] border-[#DDDAC4] font-bold'
                  : 'border-zinc-800 text-zinc-300 hover:text-[#DDDAC4] hover:border-[#DDDAC4]'
              }`}
            >
              {page}
            </button>
          </React.Fragment>
        ))}
        <button
          type="button"
          onClick={goToNextArchivePage}
          className="px-2.5 py-1 border border-zinc-800 text-zinc-300 hover:text-[#DDDAC4] hover:border-[#DDDAC4] transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (selectedTab !== 'archive') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextArchivePage();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevArchivePage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTab, currentArchivePage, totalArchivePages]);

  const activeMediaDetail = mediaItems.find(itm => itm.id === activeMediaDetailId);

  // If user is not authenticated, render LoginView
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div
      className="dark min-h-screen transition-all duration-300 font-serif bg-[#111214] text-[#e3e4e6] selection:bg-zinc-800"
    >
      {/* Decorative Minimal Ambient Line */}
      <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800"></div>

      <AISettingsModal 
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        isAdmin={isAdmin}
      />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Header Section */}
        <header data-guide="app-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6 border-[#E6E0D5] dark:border-zinc-850">
          <div className="flex items-center gap-1">
            <div>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#4A3B32] dark:text-[#DDDAC4] tracking-tight flex flex-wrap items-baseline gap-3">
                <span className="text-3xl md:text-5xl font-serif font-bold">Media Management</span>
                <span className="text-2xl md:text-3xl opacity-30 font-serif font-normal text-zinc-400">/</span>
                <span className="text-xl md:text-2xl opacity-80 font-serif font-normal">媒体管理</span>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-3 font-serif">
                阅读是一座随身携带的避难所
              </p>
            </div>
          </div>

          {/* User Profile, Theme & LogOut */}
          <div className="flex items-center gap-3 self-end md:self-auto text-xs">
            <button
              onClick={() => setShowAccountSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-800 bg-[#121214] hover:bg-zinc-800/80 transition-colors cursor-pointer rounded-none group"
              title="点击修改账号用户名与密码"
            >
              <User size={13} className="opacity-60 group-hover:opacity-100" />
              <span className="font-bold uppercase text-[12px] tracking-wider text-zinc-300 font-serif flex items-center gap-1.5">
                <span>用户: {currentUser}</span>
                {isAdmin && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0.5 font-sans font-semibold">
                    管理员
                  </span>
                )}
              </span>
            </button>

            {/* Persistent User Guide Button */}
            <button
              data-guide="help-btn"
              onClick={() => {
                setUserGuideInitialTab('features');
                setShowUserGuide(true);
              }}
              className="p-2 rounded-none border border-[#E6E0D5] dark:border-zinc-800 text-[#4A3B32] dark:text-[#DDDAC4] hover:bg-[#4A3B32]/10 dark:hover:bg-[#DDDAC4]/10 transition-colors cursor-pointer flex items-center justify-center"
              title="查看使用指引"
            >
              <HelpCircle size={13} />
            </button>

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

        {/* First Visit Onboarding Banner */}
        <AnimatePresence>
          {showGuidePrompt && currentUser && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 bg-[#4A3B32]/10 dark:bg-[#DDDAC4]/10 border border-[#4A3B32]/30 dark:border-[#DDDAC4]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-serif"
            >
              <div className="flex items-center gap-2 text-[#4A3B32] dark:text-[#DDDAC4]">
                <Sparkles size={14} className="shrink-0 text-amber-400 animate-pulse" />
                <span>首次使用请先查看数据说明：当前会先保存到本机，重要记录请在“数据相关”里导出备份或连接云同步。</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowGuidePrompt(false);
                    localStorage.setItem(getOnboardingKey(currentUser), 'true');
                    setUserGuideInitialTab('data');
                    setShowUserGuide(true);
                  }}
                  className="px-3 py-1 bg-[#4A3B32] dark:bg-[#DDDAC4] text-white dark:text-[#111214] font-bold text-[11px] uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle size={12} />
                  <span>查看数据指引</span>
                </button>
                <button
                  onClick={() => {
                    setShowGuidePrompt(false);
                    localStorage.setItem(getOnboardingKey(currentUser), 'true');
                  }}
                  className="px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px] cursor-pointer"
                >
                  稍后再说
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cloud/local conflict prompt */}
        <AnimatePresence>
          {cloudSync.status === 'conflict' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-serif"
            >
              <div className="flex items-center gap-2 text-amber-100">
                <Database size={14} className="shrink-0 text-amber-300" />
                <span>
                  本机和云端都有数据，应用不会自动覆盖。请进入“数据相关”选择从云端恢复，或确认用本机数据覆盖云端。
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedTab('backup');
                    setUserGuideInitialTab('data');
                    setShowUserGuide(true);
                  }}
                  className="px-3 py-1 bg-amber-200 text-[#111214] font-bold text-[11px] uppercase tracking-wider hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle size={12} />
                  <span>查看恢复指引</span>
                </button>
                <button
                  onClick={() => setSelectedTab('backup')}
                  className="px-3 py-1 border border-amber-300/50 text-amber-100 hover:bg-amber-300/10 font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  去数据相关
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Tab Navigation */}
        <nav data-guide="main-nav" className="flex flex-wrap gap-1 border-b pb-1 border-[#E6E0D5] dark:border-[#2D3137]">
          {[
            { id: 'wishlist', label: '月度清单', icon: <Bookmark size={14} />, guide: 'monthly-wishlist-tab' },
            { id: 'archive', label: '媒体档案', icon: <Book size={14} />, guide: 'media-archive' },
            { id: 'collections', label: '合集分组', icon: <Layers size={14} />, guide: 'collections' },
            { id: 'calendar', label: '打卡记录', icon: <Calendar size={14} />, guide: 'check-in-calendar' },
            { id: 'backup', label: '数据相关', icon: <Database size={14} />, guide: 'data-management' },
          ].map((tab) => (
            <button
              key={tab.id}
              data-guide={tab.guide}
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
            data-guide="tags"
            onClick={() => setShowTagManager(true)}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-none border-b-2 font-serif ${
              darkMode 
                ? 'border-transparent text-zinc-400 hover:text-[#DDDAC4] hover:border-[#DDDAC4]' 
                : 'border-transparent text-zinc-500 hover:text-[#4A3B32] hover:border-[#4A3B32]'
            }`}
          >
            <span>管理标签库</span>
            <Tag size={14} />
          </button>

          <button
            data-guide="add-media"
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
            <span>录入档案</span>
            <Plus size={14} />
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
                const existing = mediaItems.find(i => i.title.toLowerCase() === title.trim().toLowerCase());
                if (existing) {
                  const now = new Date();
                  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  let updatedLogs = deduplicateLogs(existing.reReadLogs || []);
                  const prevDate = existing.completedDate || new Date().toISOString().split('T')[0];
                  const prevNote = existing.personalNote?.trim();

                  if (prevNote) {
                    if (!updatedLogs[0] || updatedLogs[0].note?.trim() !== prevNote) {
                      updatedLogs = [{ id: Math.random().toString(36).substring(2, 9), date: prevDate, note: prevNote }, ...updatedLogs];
                    }
                  } else if (existing.completedDate && updatedLogs.length === 0) {
                    updatedLogs = [{ id: Math.random().toString(36).substring(2, 9), date: existing.completedDate, note: '首次完成感悟' }, ...updatedLogs];
                  }

                  updatedLogs = deduplicateLogs(updatedLogs);

                  handleUpdateWishlistItem({
                    ...existing,
                    wishlistMonth: currentMonthStr,
                    status: 'wishlist',
                    personalNote: '', // Clear note for new re-read session
                    reReadLogs: updatedLogs,
                    reReadCount: updatedLogs.length,
                    updatedAt: new Date().toISOString()
                  });
                } else {
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
                }
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

            {/* Tag Filter Dock in Media Archive */}
            {(boundTagsForCurrentCategory.length > 0 || standaloneTags.length > 0) && (
              <div className="space-y-2.5 mt-4 font-serif">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag size={13} className="text-[#8c7a6b] dark:text-[#a8988a]" />
                    <span className="text-sm font-serif uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-bold">标签筛选</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedTagFilter !== 'all' && (
                      <button
                        onClick={() => setSelectedTagFilter('all')}
                        className="text-[11px] text-[#4A3B32] dark:text-[#DDDAC4] hover:underline font-serif font-bold cursor-pointer"
                      >
                        清除筛选 (当前: #{selectedTagFilter})
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Category Bound Tags Block (Only shown when a category is selected) */}
                {selectedTypeFilter !== 'all' && boundTagsForCurrentCategory.length > 0 && (
                  <div className="p-2.5 bg-[#F4F1EA] dark:bg-[#1C1E20] border border-[#DDD7C8] dark:border-[#2D3137] space-y-1.5">
                    <div className="text-xs font-bold text-[#4A3B32] dark:text-[#DDDAC4] flex items-center gap-1.5 font-serif">
                      <span className="w-1.5 h-1.5 bg-[#4A3B32] dark:bg-[#DDDAC4] inline-block" />
                      <span>【{MEDIA_TYPE_LABELS[selectedTypeFilter]}】专属关联标签</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {boundTagsForCurrentCategory.map(({ name, count }) => {
                        const isSelected = selectedTagFilter === name;
                        return (
                          <button
                            key={name}
                            onClick={() => setSelectedTagFilter(isSelected ? 'all' : name)}
                            className={`px-2.5 py-1 text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-[#4A3B32] text-white border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] font-bold shadow-xs'
                                : (darkMode
                                    ? 'bg-[#25272A] text-[#D5D0C3] border-[#353A40] hover:border-[#DDDAC4]'
                                    : 'bg-[#EFECE4] text-[#4A3B32] border-[#D8D1C2] hover:bg-[#E8E4D8] hover:border-[#4A3B32]')
                            }`}
                          >
                            <span>#{name}</span>
                            <span className="text-[10px] opacity-75">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Standalone / Uncategorized Tags Block (Shows max 2 lines default, collapsible) */}
                {standaloneTags.length > 0 && (
                  <div className="p-2.5 bg-white dark:bg-[#111214] border border-[#E6E0D5] dark:border-[#2d3137] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-zinc-400 inline-block" />
                        <span>通用独立标签</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStandaloneTagsExpanded(!isStandaloneTagsExpanded)}
                        className="text-[11px] text-[#4A3B32] dark:text-[#DDDAC4] hover:underline font-bold cursor-pointer flex items-center gap-1"
                      >
                        <span>{isStandaloneTagsExpanded ? '收起标签' : '展开更多'}</span>
                        {isStandaloneTagsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    <div
                      className={`flex flex-wrap gap-1.5 transition-all duration-300 ${
                        isStandaloneTagsExpanded ? '' : 'max-h-[68px] overflow-hidden'
                      }`}
                    >
                      {/* All tags option */}
                      <button
                        onClick={() => setSelectedTagFilter('all')}
                        className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer border ${
                          selectedTagFilter === 'all'
                            ? 'bg-[#4A3B32] text-[#FBF9F3] border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] dark:border-[#DDDAC4]'
                            : (darkMode
                                ? 'bg-[#191b1e]/40 text-zinc-400 border-[#2d3137] hover:bg-zinc-900 hover:text-zinc-200'
                                : 'bg-[#FAF8F5] text-[#756256] border-[#E6E0D5] hover:bg-white hover:text-[#4A3B32]')
                        }`}
                      >
                        全部标签
                      </button>

                      {standaloneTags.map(({ name, count }) => {
                        const isSelected = selectedTagFilter === name;
                        return (
                          <button
                            key={name}
                            onClick={() => setSelectedTagFilter(isSelected ? 'all' : name)}
                            className={`px-2.5 py-1 text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-[#4A3B32] text-white border-[#4A3B32] dark:bg-[#DDDAC4] dark:text-[#111214] dark:border-[#DDDAC4] font-bold shadow-sm'
                                : (darkMode
                                    ? 'bg-[#191b1e] text-zinc-300 border-[#2d3137] hover:border-zinc-500'
                                    : 'bg-[#FAF8F5] text-zinc-700 border-[#E6E0D5] hover:border-[#4A3B32]')
                            }`}
                          >
                            <span>#{name}</span>
                            <span className="text-[10px] opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unified grid display of media records */}
            {filteredItems.length > 0 ? (
              <div className="space-y-5 mt-4">
                {renderArchivePagination('top')}

                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 touch-pan-y select-none"
                  onPointerDown={(event) => {
                    archiveDragStateRef.current = { startX: event.clientX, active: true, moved: false };
                  }}
                  onPointerUp={(event) => {
                    const dragState = archiveDragStateRef.current;
                    if (!dragState.active) return;
                    const deltaX = event.clientX - dragState.startX;
                    archiveDragStateRef.current.active = false;
                    if (Math.abs(deltaX) < 80) return;
                    archiveDragStateRef.current.moved = true;
                    if (deltaX < 0) {
                      goToNextArchivePage();
                    } else {
                      goToPrevArchivePage();
                    }
                    window.setTimeout(() => {
                      archiveDragStateRef.current.moved = false;
                    }, 0);
                  }}
                  onPointerCancel={() => {
                    archiveDragStateRef.current.active = false;
                  }}
                  onClickCapture={(event) => {
                    if (!archiveDragStateRef.current.moved) return;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {visibleFilteredItems.map((item, index) => (
                    <MediaCard
                      key={`${item.id}-${archivePageStart + index}`}
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

                {renderArchivePagination('bottom')}
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
              tagDefinitions={tagDefinitions}
              onImport={handleImportBackup}
              onReset={handleResetToDefault}
              onBulkAddItems={handleBulkAddItems}
              darkMode={darkMode}
              isAdmin={isAdmin && ['echoingstill', 'admin'].includes((currentUser || '').toLowerCase())}
              cloudSync={cloudSync}
              recoverySnapshotInfo={recoverySnapshotInfo}
              safetySnapshotInfo={safetySnapshotInfo}
              onPullCloud={handlePullCloud}
              onPushCloud={handlePushCloud}
              onRestoreRecoverySnapshot={handleRestoreRecoverySnapshot}
              onRestoreSafetySnapshot={handleRestoreSafetySnapshot}
            />
          </div>
        )}

      </div>

      {/* ==================== DETAILED DIALOG MODAL ==================== */}
      {activeMediaDetail && (
        <MediaDetailModal
          item={activeMediaDetail}
          tagDefinitions={tagDefinitions}
          onRegisterTag={handleRegisterTag}
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
          tagDefinitions={tagDefinitions}
          onRegisterTag={handleRegisterTag}
          onOpenTagManager={() => setShowTagManager(true)}
          onSave={handleCreateOrUpdateMedia}
          onClose={() => {
            setShowAddModal(false);
            setActiveMediaEdit(null);
          }}
        />
      )}

      {/* ==================== TAG MANAGER MODAL ==================== */}
      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        tagDefinitions={tagDefinitions}
        mediaItems={mediaItems}
        onUpdateTagDefinitions={setTagDefinitions}
        onRenameTagInItems={handleRenameTagInItems}
        onDeleteTagInItems={handleDeleteTagInItems}
      />

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

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        currentUser={currentUser || ''}
        isAdmin={isAdmin}
        onUpdateAccount={handleUpdateAccount}
      />

      {/* User Guide Onboarding Tour Modal */}
      <UserGuideModal
        isOpen={showUserGuide}
        onClose={() => setShowUserGuide(false)}
        initialTab={userGuideInitialTab}
        onSwitchTab={(tab) => setSelectedTab(tab)}
        onOpenAddModal={(open) => setShowAddModal(open)}
        onClearSampleData={handleClearSampleData}
        onResetSampleData={handleResetSampleData}
        isAdmin={isAdmin}
      />

    </div>
  );
}
