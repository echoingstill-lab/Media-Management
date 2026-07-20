/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MediaType = 'book' | 'movie' | 'tv' | 'anime' | 'music' | 'game' | 'other';

export interface ReReadLog {
  id: string;
  date: string;
  note: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  creator: string; // Author, Director, Studio, etc.
  coverUrl: string;
  description: string;
  status: 'wishlist' | 'progress' | 'completed' | 'paused'; // 想看/在看/已看/搁置
  progressText?: string; // e.g. "第 5 章", "12/24集"
  startDate?: string;
  completedDate?: string;
  reReadCount: number;
  reReadLogs: ReReadLog[];
  personalRating: number; // 0 - 10 (half stars, represented as 0 to 10 points)
  personalNote: string;
  noteImages: string[]; // Base64 or image URLs
  tags: string[]; // Custom labels
  collections: string[]; // Array of Collection IDs
  wishlistMonth?: string; // Optional target month for wishlist planning (e.g. "2026-07")
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string; // e.g. hex color or tailwind badge class
  createdAt: string;
}

export interface CheckInHabit {
  id: string;
  name: string;
  icon?: string;
  color: string; // Tailwind tint
  mediaType: MediaType | 'general';
}

export interface CheckInLog {
  date: string; // YYYY-MM-DD
  habitId: string;
  note?: string;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  book: '图书',
  movie: '电影',
  tv: '电视剧',
  anime: '动漫',
  music: '音乐',
  game: '游戏',
  other: '其他',
};

export const STATUS_LABELS: Record<MediaItem['status'], { label: string; color: string }> = {
  wishlist: { label: '想看/想读', color: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20' },
  progress: { label: '进行中', color: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  completed: { label: '已完成', color: 'bg-[#6B7D8C]/15 dark:bg-[#6B7D8C]/25 text-[#4E5D6A] dark:text-[#A4B7C6] border border-[#6B7D8C]/25' },
  paused: { label: '已搁置', color: 'bg-stone-500/10 dark:bg-zinc-500/15 text-stone-600 dark:text-stone-400 border border-stone-500/20' },
};
