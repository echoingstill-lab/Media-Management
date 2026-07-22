/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaItem, Collection, CheckInHabit, CheckInLog, ReReadLog, TagDefinition } from '../types';

// Default system tag definitions (standalone universal tags vs bound tags)
export const DEFAULT_TAG_DEFINITIONS: TagDefinition[] = [
  // 通用/独立存在标签 (Global / Standalone)
  { id: 'tag-g1', name: '治愈', mediaType: 'global' },
  { id: 'tag-g2', name: '感人', mediaType: 'global' },
  { id: 'tag-g3', name: '烧脑', mediaType: 'global' },
  { id: 'tag-g4', name: '科幻', mediaType: 'global' },
  { id: 'tag-g5', name: '神作', mediaType: 'global' },
  { id: 'tag-g6', name: '经典', mediaType: 'global' },
  { id: 'tag-g7', name: '娱乐', mediaType: 'global' },
  { id: 'tag-g8', name: '学习', mediaType: 'global' },
  { id: 'tag-g9', name: '推荐', mediaType: 'global' },
  { id: 'tag-g10', name: '必看', mediaType: 'global' },
  { id: 'tag-g11', name: '励志', mediaType: 'global' },
  { id: 'tag-g12', name: '哲思', mediaType: 'global' },
  { id: 'tag-g13', name: '硬科幻', mediaType: 'global' },

  // 图书绑定 (Book bound)
  { id: 'tag-b1', name: '纸质书', mediaType: 'book' },
  { id: 'tag-b2', name: '电子书', mediaType: 'book' },
  { id: 'tag-b3', name: '有声书', mediaType: 'book' },
  { id: 'tag-b4', name: '精装存本', mediaType: 'book' },
  { id: 'tag-b5', name: '专业工具', mediaType: 'book' },
  { id: 'tag-b6', name: '心理社科', mediaType: 'book' },
  { id: 'tag-b7', name: '经典文学', mediaType: 'book' },

  // 电影绑定 (Movie bound)
  { id: 'tag-m1', name: '影院观影', mediaType: 'movie' },
  { id: 'tag-m2', name: '国产电影', mediaType: 'movie' },
  { id: 'tag-m3', name: '日本电影', mediaType: 'movie' },
  { id: 'tag-m4', name: '剧情佳作', mediaType: 'movie' },
  { id: 'tag-m5', name: '文艺纪录', mediaType: 'movie' },

  // 剧集绑定 (TV bound)
  { id: 'tag-t1', name: '美剧', mediaType: 'tv' },
  { id: 'tag-t2', name: '日韩剧', mediaType: 'tv' },
  { id: 'tag-t3', name: '国产剧', mediaType: 'tv' },
  { id: 'tag-t4', name: '追剧首选', mediaType: 'tv' },
  { id: 'tag-t5', name: '情景喜剧', mediaType: 'tv' },

  // 动漫绑定 (Anime bound)
  { id: 'tag-a1', name: '高分动漫', mediaType: 'anime' },
  { id: 'tag-a2', name: '热血冒险', mediaType: 'anime' },
  { id: 'tag-a3', name: '青春日常', mediaType: 'anime' },
  { id: 'tag-a4', name: '番剧', mediaType: 'anime' },

  // 音乐绑定 (Music bound)
  { id: 'tag-mu1', name: '黑胶', mediaType: 'music' },
  { id: 'tag-mu2', name: '华语流行', mediaType: 'music' },
  { id: 'tag-mu3', name: '摇滚先锋', mediaType: 'music' },
  { id: 'tag-mu4', name: '古典器乐', mediaType: 'music' },
  { id: 'tag-mu5', name: '电子氛围', mediaType: 'music' },

  // 游戏绑定 (Game bound)
  { id: 'tag-ga1', name: 'Steam', mediaType: 'game' },
  { id: 'tag-ga2', name: 'Switch', mediaType: 'game' },
  { id: 'tag-ga3', name: '开放世界', mediaType: 'game' },
  { id: 'tag-ga4', name: '动作冒险', mediaType: 'game' },
  { id: 'tag-ga5', name: '独立神作', mediaType: 'game' },

  // 其他绑定 (Other bound)
  { id: 'tag-o1', name: '播客访谈', mediaType: 'other' },
  { id: 'tag-o2', name: '讲座展览', mediaType: 'other' },
  { id: 'tag-o3', name: '随笔摘录', mediaType: 'other' },
];

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
    createdAt: '2026-07-10T12:00:00Z',
  },
  {
    id: 'col-2',
    name: '金融投资与系统思维',
    description: '提升个人商业认知、金融理财及工具方法论的书籍合集。',
    createdAt: '2026-07-11T12:00:00Z',
  },
  {
    id: 'col-3',
    name: '温暖治愈系角落',
    description: '温和护眼、舒缓疲惫的动漫与日常随笔。',
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
  },
  {
    id: 'item-8',
    title: '肖申克的救赎',
    type: 'movie',
    creator: '弗兰克·德拉邦特',
    coverUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop',
    description: '希望是一个好东西，也许是最好的东西，而好东西是不会消逝的。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-02',
    completedDate: '2026-07-02',
    reReadCount: 3,
    reReadLogs: [
      { id: 're-4', date: '2026-07-10', note: '再次重温最后在沙滩重逢的场景，百看不厌。' }
    ],
    personalRating: 10,
    personalNote: '当之无愧的影史第一。完美的剧本，关于信念、自由与时间的伟大探讨。',
    noteImages: [],
    tags: ['经典', '励志', '剧情', '高分'],
    collections: ['col-1'],
    createdAt: '2026-07-02T14:00:00Z',
    updatedAt: '2026-07-10T16:00:00Z',
  },
  {
    id: 'item-9',
    title: '塞尔达传说：王国之泪',
    type: 'game',
    creator: '任天堂',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=300&auto=format&fit=crop',
    description: '天地无缝连接的究极海拉鲁冒险，手脑并用的造物浪漫。',
    status: 'progress',
    wishlistMonth: '2026-07',
    progressText: '神庙 45/152',
    startDate: '2026-07-10',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 9.8,
    personalNote: '手脑构建究极手太有意思了，探索地图极其自由，每天玩两小时简直是避风港。',
    noteImages: [],
    tags: ['游戏', '开放世界', 'Switch', '神作'],
    collections: ['col-1'],
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-20T22:00:00Z',
  },
  {
    id: 'item-10',
    title: '红楼梦',
    type: 'book',
    creator: '曹雪芹',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop',
    description: '中国古典小说巅峰之作，中国传统文化的百科全书。',
    status: 'progress',
    wishlistMonth: '2026-07',
    progressText: '前 40 回',
    startDate: '2026-07-05',
    reReadCount: 1,
    reReadLogs: [
      { id: 're-5', date: '2026-07-14', note: '重读前五回的判词，草蛇灰线，伏脉千里，愈显精妙。' }
    ],
    personalRating: 10,
    personalNote: '字字看来皆是血，十年辛苦不寻常。不愧是红楼。计划这三个月慢慢精读完。',
    noteImages: [],
    tags: ['名著', '纸质书', '文学', '精读'],
    collections: ['col-1'],
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-14T11:00:00Z',
  },
  {
    id: 'item-11',
    title: '流浪地球2',
    type: 'movie',
    creator: '郭帆',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop',
    description: '危难当前，唯有责任。太阳危机下人类自我救赎的史诗绝唱。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-08',
    completedDate: '2026-07-08',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 9.5,
    personalNote: '格局非常宏大，特效甚至超越了前作，550W和数字生命线的交织，展现了无与伦比的硬科幻魅力。',
    noteImages: [],
    tags: ['科幻', '硬科幻', '国产电影', '宏大'],
    collections: [],
    createdAt: '2026-07-08T19:00:00Z',
    updatedAt: '2026-07-08T22:30:00Z',
  },
  {
    id: 'item-12',
    title: '怪奇物语 第五季',
    type: 'tv',
    creator: '达菲兄弟',
    coverUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=300&auto=format&fit=crop',
    description: '霍金斯小镇的孩子们与颠倒世界最后的终局之战。',
    status: 'wishlist',
    wishlistMonth: '2026-08',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '',
    noteImages: [],
    tags: ['美剧', '悬疑', '科幻', '期待'],
    collections: [],
    createdAt: '2026-07-19T10:00:00Z',
    updatedAt: '2026-07-19T10:00:00Z',
  },
  {
    id: 'item-13',
    title: '黑神话：悟空',
    type: 'game',
    creator: '游戏科学',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=300&auto=format&fit=crop',
    description: '踏上取经路，比心修行。国产3A动作游戏里程碑。',
    status: 'wishlist',
    wishlistMonth: '2026-08',
    reReadCount: 0,
    reReadLogs: [],
    personalRating: 0,
    personalNote: '',
    noteImages: [],
    tags: ['游戏', '动作', '西游记', '国产'],
    collections: [],
    createdAt: '2026-07-20T14:00:00Z',
    updatedAt: '2026-07-20T14:00:00Z',
  },
  {
    id: 'item-14',
    title: 'Daft Punk - Random Access Memories',
    type: 'music',
    creator: 'Daft Punk',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
    description: '电子乐传奇双人组的绝唱，对模拟录音黄金时代的伟大复古致敬。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-03',
    completedDate: '2026-07-03',
    reReadCount: 5,
    reReadLogs: [
      { id: 're-6', date: '2026-07-12', note: '戴上降噪耳机，细细倾听Get Lucky的吉他声线，绝妙。' }
    ],
    personalRating: 9.8,
    personalNote: '极其饱满的模拟音乐，完美的编曲与混音。听多少遍都不会腻。',
    noteImages: [],
    tags: ['电子乐', '复古', '黑胶', '神作'],
    collections: ['col-3'],
    createdAt: '2026-07-03T10:00:00Z',
    updatedAt: '2026-07-12T15:00:00Z',
  },
  {
    id: 'item-15',
    title: '进击的巨人',
    type: 'anime',
    creator: '荒木哲郎 / WIT STUDIO / MAPPA',
    coverUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?q=80&w=300&auto=format&fit=crop',
    description: '关于自由、墙壁与残酷世界的宏大史诗，无尽宿命的终点。',
    status: 'completed',
    wishlistMonth: '2026-07',
    startDate: '2026-07-14',
    completedDate: '2026-07-14',
    reReadCount: 1,
    reReadLogs: [
      { id: 're-7', date: '2026-07-17', note: '重看第三季白夜一集，依然看得热泪盈眶。' }
    ],
    personalRating: 10,
    personalNote: '叙事技巧和音乐配合都是历史级别的。虽然结局有争议，但绝对不虚此行。',
    noteImages: [],
    tags: ['动漫', '史诗', '神作', '热血', '悬疑'],
    collections: ['col-1'],
    createdAt: '2026-07-14T20:00:00Z',
    updatedAt: '2026-07-17T22:00:00Z',
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

// Deduplicate logs to prevent identical repeated records
export function deduplicateLogs(logs: ReReadLog[]): ReReadLog[] {
  if (!logs || logs.length === 0) return [];
  const result: ReReadLog[] = [];
  for (const log of logs) {
    const prev = result[result.length - 1];
    // Skip if adjacent log in result has identical id or identical non-empty note
    if (
      prev &&
      ((log.id && prev.id === log.id) ||
        (prev.note && log.note && prev.note.trim() === log.note.trim()))
    ) {
      continue;
    }
    result.push(log);
  }
  return result;
}
