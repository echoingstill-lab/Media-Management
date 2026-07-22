/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Download, Upload, RefreshCw, AlertTriangle, SquareCheck, FileText, ClipboardList, Layers, FileCode } from 'lucide-react';
import { MediaItem, Collection, CheckInLog, CheckInHabit, MediaType, MEDIA_TYPE_LABELS } from '../types';

interface DataManagementProps {
  mediaItems: MediaItem[];
  collections: Collection[];
  habits: CheckInHabit[];
  checkInLogs: CheckInLog[];
  onImport: (data: {
    mediaItems: MediaItem[];
    collections: Collection[];
    habits: CheckInHabit[];
    checkInLogs: CheckInLog[];
  }) => void;
  onReset: () => void;
  onBulkAddItems: (items: MediaItem[]) => void;
  darkMode: boolean;
  isAdmin?: boolean;
}

interface ParsedImportRow {
  id: string;
  title: string;
  type: MediaType;
  creator: string;
  personalRating: number; // 0-10
  personalNote: string;
  status: MediaItem['status'];
  tags: string[];
  isValid: boolean;
  selected: boolean;
}

export default function DataManagement({
  mediaItems,
  collections,
  habits,
  checkInLogs,
  onImport,
  onReset,
  onBulkAddItems,
  darkMode,
  isAdmin = false,
}: DataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({
    type: 'idle',
    message: '',
  });

  // Douban/CSV Parser States
  const [importText, setImportText] = useState('');
  const [defaultImportType, setDefaultImportType] = useState<MediaType>('movie');
  const [defaultImportStatus, setDefaultImportStatus] = useState<MediaItem['status']>('completed');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [parsingError, setParsingError] = useState('');

  const handleExport = () => {
    try {
      const backupData = {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        mediaItems,
        collections,
        habits,
        checkInLogs,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `media_management_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatus({
        type: 'success',
        message: '数据已成功导出为备份 JSON 档案文件。',
      });
    } catch (e: any) {
      setStatus({
        type: 'error',
        message: `导出失败: ${e.message}`,
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        if (!json || typeof json !== 'object') {
          throw new Error('无效的备份文件：非 JSON 对象');
        }

        const importedItems = Array.isArray(json.mediaItems) ? json.mediaItems : [];
        const importedCollections = Array.isArray(json.collections) ? json.collections : [];
        const importedHabits = Array.isArray(json.habits) ? json.habits : [];
        const importedLogs = Array.isArray(json.checkInLogs) ? json.checkInLogs : [];

        onImport({
          mediaItems: importedItems,
          collections: importedCollections,
          habits: importedHabits,
          checkInLogs: importedLogs,
        });

        setStatus({
          type: 'success',
          message: `恢复档案成功！已同步恢复 ${importedItems.length} 个归档项目、${importedCollections.length} 个自定义合集以及 ${importedLogs.length} 条打卡记录。`,
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: any) {
        setStatus({
          type: 'error',
          message: `导入解析失败: ${err.message || '文件格式错误'}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    onReset();
    setStatus({
      type: 'success',
      message: '已成功重置为极简预设示例数据。',
    });
  };

  // --- Batch Import Parser Engine (Douban/CSV/Text Lists) ---
  const handleParseImportText = () => {
    setParsingError('');
    setParsedRows([]);

    if (!importText.trim()) {
      setParsingError('请输入或粘贴需要解析的媒体记录文本。');
      return;
    }

    try {
      const lines = importText.split('\n');
      const rows: ParsedImportRow[] = [];

      // Check if it looks like CSV/TSV with header
      const firstLine = lines[0].toLowerCase();
      const isCSV = firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes('标题') || firstLine.includes('title') || firstLine.includes('rating') || firstLine.includes('评分');

      if (isCSV) {
        // Parse CSV or Tab-Separated columns
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        
        // Helper to split CSV lines, handling quotes correctly
        const splitCSVLine = (text: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = splitCSVLine(lines[0]);
        
        // Find indices
        const titleIndex = headers.findIndex(h => h.includes('标题') || h.includes('title') || h.includes('name') || h.includes('名称'));
        const ratingIndex = headers.findIndex(h => h.includes('评分') || h.includes('rating') || h.includes('star') || h.includes('星级'));
        const noteIndex = headers.findIndex(h => h.includes('短评') || h.includes('附言') || h.includes('comment') || h.includes('note') || h.includes('我的评价'));
        const creatorIndex = headers.findIndex(h => h.includes('导演') || h.includes('作者') || h.includes('creator') || h.includes('author') || h.includes('director') || h.includes('制作'));
        const typeIndex = headers.findIndex(h => h.includes('类型') || h.includes('type') || h.includes('分类'));
        const tagsIndex = headers.findIndex(h => h.includes('标签') || h.includes('tag') || h.includes('label'));

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = splitCSVLine(line);
          if (cols.length === 0) continue;

          // Resolve Title (Fallback to first non-empty column)
          const rawTitle = titleIndex !== -1 ? cols[titleIndex] : cols[0];
          const cleanTitle = rawTitle ? rawTitle.replace(/^"|"$/g, '').trim() : '';

          if (!cleanTitle) continue;

          // Resolve Creator
          const rawCreator = creatorIndex !== -1 ? cols[creatorIndex] : '';
          const cleanCreator = rawCreator ? rawCreator.replace(/^"|"$/g, '').trim() : '';

          // Resolve Rating
          let rating = 0;
          if (ratingIndex !== -1 && cols[ratingIndex]) {
            const rawRatingStr = cols[ratingIndex].replace(/^"|"$/g, '').trim();
            const parsedNum = parseFloat(rawRatingStr);
            if (!isNaN(parsedNum)) {
              // Douban/CSV ratings can be 1-5 stars, 1-5 numbers, or 1-10 points
              if (parsedNum <= 5) {
                rating = parsedNum * 2; // scale to 0-10
              } else if (parsedNum <= 10) {
                rating = parsedNum;
              }
            } else {
              // If it has star characters like "★★★★★"
              const starsCount = (rawRatingStr.match(/★/g) || []).length;
              if (starsCount > 0) {
                rating = starsCount * 2;
              }
            }
          }

          // Resolve Note
          const rawNote = noteIndex !== -1 ? cols[noteIndex] : '';
          const cleanNote = rawNote ? rawNote.replace(/^"|"$/g, '').trim() : '';

          // Resolve Tags
          let parsedTags: string[] = [];
          if (tagsIndex !== -1 && cols[tagsIndex]) {
            const rawTagsStr = cols[tagsIndex].replace(/^"|"$/g, '').trim();
            parsedTags = rawTagsStr.split(/[;/,\s]+/).filter(Boolean);
          }

          // Resolve Type
          let parsedType = defaultImportType;
          if (typeIndex !== -1 && cols[typeIndex]) {
            const tVal = cols[typeIndex].toLowerCase();
            if (tVal.includes('书') || tVal.includes('book') || tVal.includes('read')) {
              parsedType = 'book';
            } else if (tVal.includes('影') || tVal.includes('movie') || tVal.includes('电影')) {
              parsedType = 'movie';
            } else if (tVal.includes('剧') || tVal.includes('tv') || tVal.includes('电视')) {
              parsedType = 'tv';
            } else if (tVal.includes('音') || tVal.includes('music') || tVal.includes('cd') || tVal.includes('歌')) {
              parsedType = 'music';
            } else if (tVal.includes('漫') || tVal.includes('anime') || tVal.includes('动画')) {
              parsedType = 'anime';
            } else if (tVal.includes('游') || tVal.includes('game')) {
              parsedType = 'game';
            }
          }

          // Resolve Status
          let parsedStatus: MediaItem['status'] = 'completed';
          const sVal = (cols[titleIndex] || '').toLowerCase(); // Or check in comment/note column
          if (sVal.includes('想看') || sVal.includes('wish')) {
             parsedStatus = 'wishlist';
          } else if (sVal.includes('在读') || sVal.includes('在看') || sVal.includes('进行中')) {
             parsedStatus = 'progress';
          } else if (sVal.includes('搁置')) {
             parsedStatus = 'wishlist';
          }

          rows.push({
            id: `row-${i}-${Date.now()}`,
            title: cleanTitle,
            type: parsedType,
            creator: cleanCreator,
            personalRating: rating,
            personalNote: cleanNote,
            status: parsedStatus,
            tags: parsedTags,
            isValid: true,
            selected: true,
          });
        }
      } else {
        // Plain text list parser: one title per line, e.g. "Inception" or "盗梦空间 (导演：诺兰) 5星"
        lines.forEach((line, index) => {
          const cleanLine = line.trim();
          if (!cleanLine) return;

          // Try to detect optional ratings like "(5星)" or "****" or "5/5"
          let rating = 0;
          let titlePart = cleanLine;

          const ratingRegex = /(?:(\d)[星★]|(\d)\s*\/\s*5|★★★★★|★★★★|★★★|★★|★)/i;
          const match = cleanLine.match(ratingRegex);
          if (match) {
            if (match[1]) {
              rating = parseInt(match[1]) * 2;
            } else if (match[2]) {
              rating = parseInt(match[2]) * 2;
            } else {
              const starsCount = (match[0].match(/★/g) || []).length;
              rating = starsCount * 2;
            }
            titlePart = cleanLine.replace(ratingRegex, '').trim();
          }

          // Try to extract creator in parentheses
          let creator = '';
          const parentheticalRegex = /[(（](?:作者|导演|制作)?[:：]?\s*([^）)]+)[)）]/;
          const creatorMatch = titlePart.match(parentheticalRegex);
          if (creatorMatch) {
            creator = creatorMatch[1].trim();
            titlePart = titlePart.replace(parentheticalRegex, '').trim();
          }

          // Clean title part from punctuation marks if it has trailing notes
          titlePart = titlePart.replace(/[,，;；]\s*$/, '');

          rows.push({
            id: `row-${index}-${Date.now()}`,
            title: titlePart || cleanLine,
            type: defaultImportType,
            creator,
            personalRating: rating,
            personalNote: '',
            status: defaultImportStatus,
            tags: [],
            isValid: !!titlePart,
            selected: !!titlePart,
          });
        });
      }

      if (rows.length === 0) {
        setParsingError('未能在文本中解析出有效的媒体项目标题，请检查输入格式。');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setParsingError(`文本解析出差: ${err.message}`);
    }
  };

  const handleRowToggle = (id: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleRowTypeChange = (id: string, type: MediaType) => {
    setParsedRows(prev =>
      prev.map(r => (r.id === id ? { ...r, type } : r))
    );
  };

  const handleRowStatusChange = (id: string, statusVal: MediaItem['status']) => {
    setParsedRows(prev =>
      prev.map(r => (r.id === id ? { ...r, status: statusVal } : r))
    );
  };

  const handleExecuteImport = () => {
    const selectedRows = parsedRows.filter(r => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      alert('请先选择至少一个有效的待导入记录');
      return;
    }

    const nowStr = new Date().toISOString();
    const newItems: MediaItem[] = selectedRows.map((row, idx) => {
      // Sleek modern cover generator using raw SVG base64
      const coverSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='300' height='400' fill='%2318181c'/><line x1='15' y1='15' x2='285' y2='15' stroke='%23333335' stroke-width='1'/><line x1='15' y1='385' x2='285' y2='385' stroke='%23333335' stroke-width='1'/><text x='50%' y='48%' text-anchor='middle' fill='%23f4f4f5' font-family='sans-serif' font-weight='700' font-size='20'>${encodeURIComponent(row.title.substring(0, 15))}</text><text x='50%' y='60%' text-anchor='middle' fill='%2371717a' font-family='sans-serif' font-size='12'>${encodeURIComponent(MEDIA_TYPE_LABELS[row.type] || '')}</text></svg>`;

      return {
        id: `imported-${Date.now()}-${idx}`,
        title: row.title,
        type: row.type,
        creator: row.creator || '未记录创作者',
        coverUrl: `data:image/svg+xml;utf8,${coverSvg}`,
        description: `批量导入数据：导入自多平台同步档案。`,
        status: row.status,
        tags: row.tags,
        collections: [],
        personalRating: row.personalRating,
        personalNote: row.personalNote,
        reReadCount: 0,
        reReadLogs: [],
        noteImages: [],
        createdAt: nowStr,
        updatedAt: nowStr,
      };
    });

    onBulkAddItems(newItems);
    
    // Clear state
    setImportText('');
    setParsedRows([]);
    
    setStatus({
      type: 'success',
      message: `成功批量导入 ${newItems.length} 项媒体记录至您的主媒体库中。`,
    });
  };

  return (
    <div data-guide="data-management" className="space-y-8 font-serif">
      
      {/* 1. Core Backup & Restore */}
      <div className={`border p-6 rounded-none transition-all duration-300 ${
        darkMode ? 'bg-[#191b1e] border-[#2d3137]' : 'bg-white border-[#E6E0D5] shadow-sm'
      }`}>
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100">
            备份与恢复
          </h2>
          <p className="text-[10.5px] uppercase tracking-wide text-zinc-400">
            本地存储备份控制台
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          
          {/* Export Card */}
          <button
            onClick={handleExport}
            className={`group flex flex-col items-center justify-center p-6 border transition-all text-center rounded-none cursor-pointer ${
              darkMode 
                ? 'bg-zinc-950/20 hover:bg-zinc-900/30 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="p-2.5 border border-zinc-350 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 group-hover:scale-105 transition-transform duration-250">
              <Download size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mt-3">导出配置文件</span>
            <span className="text-[10px] text-zinc-400 mt-1 max-w-[220px] leading-relaxed">
              下载包含您的媒体库、打卡日历及合集参数的独立 JSON 档案
            </span>
          </button>

          {/* Import Card */}
          <button
            onClick={handleImportClick}
            className={`group flex flex-col items-center justify-center p-6 border transition-all text-center rounded-none cursor-pointer ${
              darkMode 
                ? 'bg-zinc-950/20 hover:bg-zinc-900/30 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="p-2.5 border border-zinc-350 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 group-hover:scale-105 transition-transform duration-250">
              <Upload size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mt-3">导入恢复数据</span>
            <span className="text-[10px] text-zinc-400 mt-1 max-w-[220px] leading-relaxed">
              上传之前导出的 JSON 数据备份，快速覆盖还原设备中的历史配置
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </button>

          {isAdmin && (
            <button
              onClick={handleResetToDefault}
              className={`group flex flex-col items-center justify-center p-6 border transition-all text-center rounded-none cursor-pointer ${
                darkMode
                  ? 'bg-zinc-950/10 hover:bg-zinc-900/20 border-zinc-850 hover:border-red-900/20 text-zinc-500'
                  : 'bg-zinc-100/50 hover:bg-red-500/5 border-zinc-200 hover:border-red-200 text-zinc-600'
              }`}
            >
              <div className="p-2.5 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 group-hover:scale-105 transition-transform duration-250">
                <RefreshCw size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mt-3">重置示例档案</span>
              <span className="text-[10px] text-zinc-400 mt-1 max-w-[220px] leading-relaxed">
                清空当前已编辑数据，重新导入极简预设的书影音档案进行体验
              </span>
            </button>
          )}
        </div>

        {status.type !== 'idle' && (
          <div
            className={`mt-4 flex items-start gap-3 p-4 rounded-none text-xs transition-all animate-fade-in ${
              status.type === 'success'
                ? 'bg-zinc-100/55 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                : 'bg-red-500/5 border border-red-500/20 text-red-500'
            }`}
          >
            {status.type === 'success' ? (
              <SquareCheck size={14} className="mt-0.5 shrink-0 text-zinc-700 dark:text-zinc-300" />
            ) : (
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            )}
            <div className="leading-relaxed font-serif font-medium">{status.message}</div>
          </div>
        )}
      </div>

      {/* 2. Batch Import Engine Card */}
      <div className={`border p-6 rounded-none transition-all duration-300 ${
        darkMode ? 'bg-[#191b1e] border-[#2d3137]' : 'bg-white border-[#E6E0D5] shadow-sm'
      }`}>
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardList size={14} />
            <span>批量导入引擎</span>
          </h2>
          <p className="text-[10.5px] uppercase tracking-wide text-zinc-400">
            支持豆瓣、Neo-DB 等平台的 CSV 备份或文本列表解析
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-350 dark:border-zinc-850 rounded-none text-xs leading-relaxed space-y-2">
            <p className="font-bold text-zinc-700 dark:text-zinc-300">使用说明：</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-500 dark:text-zinc-400 font-serif">
              <li><strong>CSV/TSV 格式导入：</strong>直接复制您导出的 CSV 文件内容（首行包含列名如 `标题`, `个人评分`, `短评` / `Title`, `Rating`, `Comment` ），粘贴到下方文本框中。系统将智能分析字段对应入库。</li>
              <li><strong>纯文本名单导入：</strong>您也可以直接按行粘贴一连串媒体名称，例如：<br />
                <code className="text-zinc-800 dark:text-zinc-300 font-serif text-[10px] bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5">盗梦空间 (导演：诺兰) ★★★★★</code><br />
                <code className="text-zinc-800 dark:text-zinc-300 font-serif text-[10px] bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5">平凡的世界 (作者：路遥) 4/5</code>
              </li>
            </ul>
          </div>

          {/* Import Controls Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-serif uppercase tracking-wider text-zinc-500 block">
                默认媒体分类
              </label>
              <select
                value={defaultImportType}
                onChange={(e) => setDefaultImportType(e.target.value as MediaType)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-none px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                {Object.entries(MEDIA_TYPE_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-serif uppercase tracking-wider text-zinc-500 block">
                默认状态归档
              </label>
              <select
                value={defaultImportStatus}
                onChange={(e) => setDefaultImportStatus(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-none px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="completed">已读过 / 已看完 / 已玩过</option>
                <option value="progress">正在进行中 / 读看中</option>
                <option value="wishlist">放入想看清单</option>
              </select>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-serif uppercase tracking-wider text-zinc-500 block">
              复制备份数据粘贴至下方
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="列名示例：标题,导演,个人评分,短评&#10;盗梦空间,克里斯托弗·诺兰,5,太精彩了！&#10;或者纯文本单子：&#10;百年孤独 (作者:加西亚·马尔克斯)&#10;黑神话：悟空"
              rows={6}
              className={`w-full font-serif text-[11px] p-3 border rounded-none focus:outline-none focus:border-zinc-500 ${
                darkMode 
                  ? 'bg-[#18181c] border-zinc-800 text-zinc-200' 
                  : 'bg-zinc-50 border-zinc-250 text-zinc-800'
              }`}
            />
          </div>

          <div className="flex justify-between items-center">
            {parsingError && (
              <span className="text-red-500 text-xs font-serif">⚠️ {parsingError}</span>
            )}
            <button
              onClick={handleParseImportText}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-all ml-auto ${
                darkMode 
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950' 
                  : 'bg-zinc-900 hover:bg-black text-white'
              }`}
            >
              分析解析文本
            </button>
          </div>

          {/* Parsed Rows Preview Grid */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  待导入预览 ({parsedRows.filter(r => r.selected).length} 项被选中)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setParsedRows(prev => prev.map(r => ({ ...r, selected: true })))}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 uppercase"
                  >
                    全选
                  </button>
                  <span className="text-zinc-400">|</span>
                  <button
                    onClick={() => setParsedRows(prev => prev.map(r => ({ ...r, selected: false })))}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 uppercase"
                  >
                    全不选
                  </button>
                </div>
              </div>

              {/* Grid or Table */}
              <div className="max-h-72 overflow-y-auto border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                {parsedRows.map((row) => (
                  <div
                    key={row.id}
                    className={`p-3 flex items-start gap-4 text-xs transition-colors ${
                      row.selected 
                        ? (darkMode ? 'bg-zinc-900/30' : 'bg-zinc-50/50') 
                        : 'opacity-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleRowToggle(row.id)}
                      className="mt-1 cursor-pointer"
                    />

                    {/* Metadata column */}
                    <div className="flex-grow space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-800 dark:text-zinc-100 truncate">{row.title}</span>
                        {row.creator && (
                          <span className="text-[10px] text-zinc-400">({row.creator})</span>
                        )}
                      </div>

                      {/* Comment and Rating */}
                      {row.personalNote && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">“{row.personalNote}”</p>
                      )}

                      {row.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {row.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] px-1 border border-zinc-200 dark:border-zinc-800 text-zinc-500 font-serif">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Parameter Adjustments inline */}
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      
                      {/* Change Type */}
                      <select
                        value={row.type}
                        onChange={(e) => handleRowTypeChange(row.id, e.target.value as MediaType)}
                        className="text-[10.5px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-850 px-1 py-0.5 rounded-none font-bold"
                      >
                        {Object.entries(MEDIA_TYPE_LABELS).map(([key, val]) => (
                          <option key={key} value={key}>{val}</option>
                        ))}
                      </select>

                      {/* Change Status */}
                      <select
                        value={row.status}
                        onChange={(e) => handleRowStatusChange(row.id, e.target.value as any)}
                        className="text-[10.5px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-850 px-1 py-0.5 rounded-none font-bold"
                      >
                        <option value="completed">已读看</option>
                        <option value="progress">进行中</option>
                        <option value="wishlist">想看</option>
                      </select>

                      {/* Star Display */}
                      {row.personalRating > 0 && (
                        <span className="text-[10px] font-serif text-zinc-700 dark:text-zinc-300 font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-1.5 py-0.5 align-middle">
                          评分: {row.personalRating}/10
                        </span>
                      )}

                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation trigger */}
              <div className="flex justify-end">
                <button
                  onClick={handleExecuteImport}
                  className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 cursor-pointer transition-all ${
                    darkMode 
                      ? 'bg-zinc-100 hover:bg-white text-zinc-950' 
                      : 'bg-zinc-900 hover:bg-black text-white'
                  }`}
                >
                  <SquareCheck size={14} strokeWidth={2.5} />
                  <span>确认一键批量入库</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
