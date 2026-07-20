/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaItem, Collection, CheckInHabit, CheckInLog } from '../types';

// Compress uploaded/pasted images to save LocalStorage space
export function compressImage(file: File, maxWidth = 400, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Generate beautiful, eye-safe abstract SVG cover images on the fly
export function generateSvgCover(title: string, creator: string, type: string): string {
  const hues: Record<string, number> = {
    book: 35,    // Warm amber
    movie: 200,  // Soft ocean blue
    tv: 280,     // Gentle purple
    anime: 150,  // Calming sage green
    music: 330,  // Rose pink
    game: 230,   // Cool slate blue
    other: 180,  // Muted teal
  };

  const baseHue = hues[type] || 200;
  const color1 = `hsl(${baseHue}, 45%, 15%)`;
  const color2 = `hsl(${(baseHue + 40) % 360}, 45%, 25%)`;
  const textLight = `hsl(${baseHue}, 30%, 90%)`;
  const textMuted = `hsl(${baseHue}, 20%, 70%)`;
  const borderCol = `hsl(${baseHue}, 30%, 35%)`;

  const svgString = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600' width='100%' height='100%'>
      <defs>
        <linearGradient id='grad' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='${color1}' />
          <stop offset='100%' stop-color='${color2}' />
        </linearGradient>
        <pattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'>
          <path d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(255, 255, 255, 0.03)' stroke-width='1'/>
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill='url(#grad)' />
      <rect width='100%' height='100%' fill='url(#grid)' />
      
      <!-- Minimalist Borders -->
      <rect x='15' y='15' width='370' height='570' rx='10' fill='none' stroke='${borderCol}' stroke-dasharray='5,5' stroke-width='1' />
      
      <!-- Content -->
      <g transform='translate(40, 100)'>
        <!-- Media Type Label Badge -->
        <rect x='0' y='0' width='70' height='24' rx='12' fill='rgba(255, 255, 255, 0.08)' stroke='rgba(255, 255, 255, 0.15)' />
        <text x='35' y='16' font-family='Inter, sans-serif' font-size='10' fill='${textMuted}' text-anchor='middle' font-weight='bold' letter-spacing='1'>${type.toUpperCase()}</text>
      </g>

      <g transform='translate(40, 240)'>
        <!-- Multi-line title display -->
        <text x='0' y='0' font-family='Inter, "Noto Sans CJK SC", sans-serif' font-size='28' font-weight='bold' fill='${textLight}' letter-spacing='-0.5'>
          ${title.length > 10 ? title.substring(0, 10) + '...' : title}
        </text>
        <text x='0' y='45' font-family='Inter, sans-serif' font-size='15' fill='${textMuted}'>
          by ${creator || '未知创作者'}
        </text>
      </g>

      <!-- Decorative Zen Circles -->
      <circle cx='320' cy='480' r='60' fill='none' stroke='rgba(255, 255, 255, 0.04)' stroke-width='2' />
      <circle cx='320' cy='480' r='30' fill='none' stroke='rgba(255, 255, 255, 0.06)' stroke-dasharray='4,4' stroke-width='1' />
      
      <g transform='translate(40, 530)'>
        <text x='0' y='0' font-family='monospace' font-size='11' fill='rgba(255, 255, 255, 0.2)'>MEDIA ARCHIVE // UNIT 109</text>
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// Default custom Collections/Groups
export const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: '必看神作与一生之书',
    description: '那些触及灵魂、极具启发性的高分经典作品。',
    color: 'from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/30',
    createdAt: '2026-07-10T12:00:00Z',
  },
  {
    id: 'col-2',
    name: '金融投资与系统思维',
    description: '提升个人商业认知、金融理财及工具方法论的书籍合集。',
    color: 'from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/30',
    createdAt: '2026-07-11T12:00:00Z',
  },
  {
    id: 'col-3',
    name: '温暖治愈系角落',
    description: '温和护眼、舒缓疲惫的动漫与日常随笔。',
    color: 'from-pink-600/20 to-purple-600/20 text-pink-400 border-pink-500/30',
    createdAt: '2026-07-12T12:00:00Z',
  },
];

// Initial Media Seed Data
export const DEFAULT_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'item-1',
    title: '三体',
    type: 'book',
    creator: '刘慈欣',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop',
    description: '中国科幻文学的里程碑之作，将人类历史与浩瀚宇宙深度结合。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-01',
    completedDate: '2026-07-10',
    reReadCount: 2,
    reReadLogs: [
      { id: 're-1', date: '2026-07-15', note: '重读红岸基地部分，细节依然震撼，对叶文洁的心理变化有了更多体会。' },
      { id: 're-2', date: '2026-07-18', note: '着重看了古筝行动的描写，文字中的冷静与客观张力十足。' },
    ],
    personalRating: 10,
    personalNote: '这是一部真正宏大的史诗。不管是宇宙社会学的推演，还是黑暗森林法则的冰冷，都带给我无与伦比的智力享受。推荐选择【纸质书】收藏，在静夜中细细品味。',
    noteImages: [],
    tags: ['纸质书', '学习', '科幻', '硬科幻', '宇宙', '神作'],
    collections: ['col-1'],
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-18T15:30:00Z',
  },
  {
    id: 'item-2',
    title: '葬送的芙莉莲',
    type: 'anime',
    creator: '斋藤圭一郎 / MADHOUSE',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop',
    description: '勇者一行人打败魔王之后，“长生”精灵魔法使芙莉莲重新踏上了解人类的旅程。',
    status: 'progress',
    wishlistMonth: '2026-07',
    progressText: '第 12 集 / 28 集',
    startDate: '2026-07-12',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 9.5,
    personalNote: '节奏温和，风格非常舒适温馨。它探讨的不仅是魔法，更是时间、记忆、人与人之间纽带的意义。非常适合在夜晚关掉大灯，点一盏温黄色的台灯，配上一杯热茶静静观赏。',
    noteImages: [],
    tags: ['娱乐', '感受', '治愈', '奇幻', '高分动漫', '舒适'],
    collections: ['col-1', 'col-3'],
    createdAt: '2026-07-12T20:00:00Z',
    updatedAt: '2026-07-19T21:00:00Z',
  },
  {
    id: 'item-3',
    title: '千与千寻',
    type: 'movie',
    creator: '宫崎骏',
    coverUrl: 'https://images.unsplash.com/photo-1501183007986-d0d080b147f9?q=80&w=300&auto=format&fit=crop',
    description: '少女千寻误入神灵异世界，为了拯救变成猪的父母而展开的奇妙冒险。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-05',
    completedDate: '2026-07-05',
    reReadCount: 1,
    reReadLogs: [
      { id: 're-3', date: '2026-07-16', note: '和家人一起在大屏幕复看。每次看无脸男吃饱后在列车上的宁静，都觉得内心平和。' }
    ],
    personalRating: 9,
    personalNote: '宫崎骏的集大成之作。神隐世界的瑰丽幻想、白龙的温柔、无脸男的孤独。画面的色彩、久石让的配乐，每一处都堪称艺术品。',
    noteImages: [],
    tags: ['流媒体', '感受', '动画', '经典', '治愈', '日本电影'],
    collections: ['col-3'],
    createdAt: '2026-07-05T14:00:00Z',
    updatedAt: '2026-07-16T18:00:00Z',
  },
  {
    id: 'item-4',
    title: '穷查理宝典',
    type: 'book',
    creator: '查理·芒格',
    coverUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=300&auto=format&fit=crop',
    description: '汇集了查理·芒格过去20年的主要公开演讲 and 思想精髓。',
    status: 'wishlist',
    wishlistMonth: '2026-07',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '',
    noteImages: [],
    tags: ['电子书', '学习', '金融', '工具', '理性', '思维模型'],
    collections: ['col-2'],
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
  },
  {
    id: 'item-5',
    title: '黑客帝国',
    type: 'movie',
    creator: '莉莉·沃卓斯基 / 拉娜·沃卓斯基',
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=300&auto=format&fit=crop',
    description: '网络黑客尼奥发现现实世界居然是一个被称为“母体”的虚拟控制系统。',
    status: 'wishlist',
    wishlistMonth: '2026-07',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '',
    noteImages: [],
    tags: ['科幻', '赛博朋克', '哲学'],
    collections: [],
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'item-6',
    title: '塞尔达传说：荒野之息',
    type: 'game',
    creator: '任天堂',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=300&auto=format&fit=crop',
    description: '重塑开放世界概念的旷世巨作，林克的救世大冒险。',
    status: 'progress',
    wishlistMonth: '2026-07',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '太好玩了！开放世界的巅峰体验。',
    noteImages: [],
    tags: ['游戏', '开放世界', '冒险'],
    collections: [],
    createdAt: '2026-07-19T08:00:00Z',
    updatedAt: '2026-07-19T08:00:00Z',
  },
  {
    id: 'item-7',
    title: 'Jay',
    type: 'music',
    creator: '周杰伦',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    description: '周杰伦同名首张专辑，开启了华语乐坛的新纪元。',
    status: 'wishlist',
    wishlistMonth: '2026-07',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '',
    noteImages: [],
    tags: ['华语', '经典', '黑胶'],
    collections: [],
    createdAt: '2026-07-20T01:00:00Z',
    updatedAt: '2026-07-20T01:00:00Z',
  }
];

// Predefined default Check-In Habits
export const DEFAULT_HABITS: CheckInHabit[] = [
  { id: 'h-1', name: '每日阅读', color: 'emerald', mediaType: 'book' },
  { id: 'h-2', name: '影音欣赏', color: 'blue', mediaType: 'movie' },
  { id: 'h-3', name: '动漫追更', color: 'pink', mediaType: 'anime' },
  { id: 'h-4', name: '每日回顾', color: 'amber', mediaType: 'general' }
];

// Seeded check-in records for July 2026
export const DEFAULT_CHECK_IN_LOGS: CheckInLog[] = [
  // h-1: Reading
  { date: '2026-07-01', habitId: 'h-1', note: '阅读《三体》第1-3章，红岸基地部分起航。' },
  { date: '2026-07-02', habitId: 'h-1', note: '阅读《三体》第4-8章，叶文洁初入红岸。' },
  { date: '2026-07-04', habitId: 'h-1', note: '阅读《三体》第9-12章，三体游戏世界极其奇异。' },
  { date: '2026-07-05', habitId: 'h-1', note: '阅读《三体》第13-15章，感受脱水与恒纪元的变迁。' },
  { date: '2026-07-08', habitId: 'h-1', note: '阅读《三体》第16-20章，地球三体组织成立。' },
  { date: '2026-07-09', habitId: 'h-1', note: '阅读《三体》第21-25章，黑暗森林理论的萌芽。' },
  { date: '2026-07-10', habitId: 'h-1', note: '阅读完毕，古筝计划震撼人心。完成打卡！' },
  { date: '2026-07-15', habitId: 'h-1', note: '重读《三体》精彩片段，写下复看标注。' },
  { date: '2026-07-18', habitId: 'h-1', note: '重温第二章。' },

  // h-2: Movie watching
  { date: '2026-07-05', habitId: 'h-2', note: '重温《千与千寻》，画质极好，音乐动人。' },
  { date: '2026-07-16', habitId: 'h-2', note: '复看《千与千寻》，陪家人一起看。' },

  // h-3: Anime tracking
  { date: '2026-07-12', habitId: 'h-3', note: '开追《葬送的芙莉莲》1-2集，音乐和画面惊艳，安静温柔。' },
  { date: '2026-07-13', habitId: 'h-3', note: '看第3-4集，关于花海与英雄的记忆。' },
  { date: '2026-07-14', habitId: 'h-3', note: '看第5-6集，踏上极北方向的旅程。' },
  { date: '2026-07-17', habitId: 'h-3', note: '看第7-8集，与魔族的谈判和对决开始。' },
  { date: '2026-07-19', habitId: 'h-3', note: '看第9-12集，芙莉莲展示强大的压制力量。' },

  // h-4: Meditation/General Review
  { date: '2026-07-01', habitId: 'h-4', note: '月初整理，设立了本月的阅读和追更计划。' },
  { date: '2026-07-10', habitId: 'h-4', note: '完成了《三体》阅读，内心澎湃，完成了月度首个大目标！' },
  { date: '2026-07-19', habitId: 'h-4', note: '今日打卡：整理书影音网页管理器，UI非常温和护眼，满意！' },
];

// Helper to calculate streaks
export function calculateStreak(logs: CheckInLog[], habitId?: string): number {
  const dates = Array.from(new Set(
    logs
      .filter(l => !habitId || l.habitId === habitId)
      .map(l => l.date)
  )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending order (latest first)

  if (dates.length === 0) return 0;

  // Let's get today's date in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // If the latest check-in is not today and not yesterday, streak is broken (0)
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(dates[0]);

  for (let i = 0; i < dates.length; i++) {
    const logDate = new Date(dates[i]);
    const diffTime = Math.abs(currentDate.getTime() - logDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (i === 0 || diffDays <= 1) {
      streak++;
      currentDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}
