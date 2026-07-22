import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Book, 
  Sparkles, 
  Folder, 
  Calendar, 
  CheckCircle2, 
  Tag, 
  HelpCircle,
  Plus,
  Link,
  Users,
  Database,
  Trash2,
  RotateCcw,
  MousePointer,
  ListOrdered,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTab: (tab: 'wishlist' | 'archive' | 'collections' | 'calendar' | 'backup') => void;
  onOpenAddModal: (open: boolean) => void;
  onClearSampleData?: () => void;
  onResetSampleData?: () => void;
  isAdmin?: boolean;
}

export default function UserGuideModal({ 
  isOpen, 
  onClose, 
  onSwitchTab, 
  onOpenAddModal,
  onClearSampleData,
  onResetSampleData,
  isAdmin = false
}: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'triggers' | 'data'>('features');
  const [clearedNotice, setClearedNotice] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    if (onClearSampleData) {
      onClearSampleData();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  const handleReset = () => {
    if (onResetSampleData) {
      onResetSampleData();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 font-serif">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-[155] w-full max-w-3xl max-h-[85vh] bg-[#FBF9F3] dark:bg-[#121316] border-2 border-[#4A3B32] dark:border-[#DDDAC4] shadow-2xl flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-200"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214]">
                <Book size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-[#4A3B32] dark:text-[#DDDAC4]">
                  系统功能指引与使用说明
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  User Manual & Feature Specifications
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Bar */}
          <div className="px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-[#FBF9F3] dark:bg-[#121316] flex gap-6 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('features')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'features'
                  ? 'border-[#4A3B32] dark:border-[#DDDAC4] text-[#4A3B32] dark:text-[#DDDAC4]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Sparkles size={14} />
              <span>特色功能详解</span>
            </button>

            <button
              onClick={() => setActiveTab('triggers')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'triggers'
                  ? 'border-[#4A3B32] dark:border-[#DDDAC4] text-[#4A3B32] dark:text-[#DDDAC4]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <MousePointer size={14} />
              <span>触发式教学微卡</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('data')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'data'
                    ? 'border-[#4A3B32] dark:border-[#DDDAC4] text-[#4A3B32] dark:text-[#DDDAC4]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Database size={14} />
                <span>测试数据管理</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs leading-relaxed">
            
            {/* TAB 1: FEATURES */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                
                {/* Intro Banner */}
                <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4] mb-1">
                    关于媒体管理系统
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    本系统专为书、影、音、剧、漫与游戏打造。除基础的打卡归档外，重点集成了智能链接解析、同行记录定格、无限层级分组以及交互式日历悬停体验。
                  </p>
                </div>

                {/* Feature 1: AI Parse */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                      <Link size={16} className="text-amber-600 dark:text-amber-400" />
                      <span>1. 智能元数据抓取与解析</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        onOpenAddModal(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>去尝试</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    在录入作品时，支持粘贴豆瓣（图书/电影/音乐/游戏）、IMDb、Steam、Apple Music 或网易云链接。系统将自动提取作品封面、原作标题、主创团队、评分与简介，无需人工繁琐输入。
                  </p>
                </div>

                {/* Feature 2: Joint Logging */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                      <Users size={16} className="text-blue-600 dark:text-blue-400" />
                      <span>2. “一同记录”伴侣与同伴观影印记</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        onSwitchTab('archive');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>去查看</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    在每条作品记录中，不仅可以记录个人体会，还能专门录入“同看/同读对象”（如伴侣、朋友）、观看地点与当时共同经历的气氛感悟，将文化消费转化为珍贵的共同记忆。
                  </p>
                </div>

                {/* Feature 3: Nested Collections */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                      <Folder size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>3. 无限层级合集与主题分组</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        onSwitchTab('collections');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>前往合集</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    打破常规简单分组限制，支持创建父子树状合集。例如创建父合集“2026年度书单”，并在其下创建子合集“哲学思辨”与“科幻小说”，实现结构化作品典藏。
                  </p>
                </div>

                {/* Feature 4: Checkin Calendar Hover */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                      <Calendar size={16} className="text-purple-600 dark:text-purple-400" />
                      <span>4. 打卡日历与悬停即时预览</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        onSwitchTab('calendar');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>体验日历</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    打卡记录包含连续天数统计与热力图。鼠标移动并悬停在任一日期格子上，均可即时浮窗预览该日完成的全部打卡细节与特定记录感悟，交互自然流畅。
                  </p>
                </div>

                {/* Feature 5: Wishlist Carryover */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                      <ListOrdered size={16} className="text-rose-600 dark:text-rose-400" />
                      <span>5. 月度清单与一键跨月顺延</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        onSwitchTab('wishlist');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>月度清单</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    将准备在当月阅读或观赏的作品放入月度清单。月底未完成的项目，支持点击“一键顺延”快速调度至下月，已完成项目勾选后可自动标记打卡并归档。
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: TRIGGERED GUIDES */}
            {activeTab === 'triggers' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                  系统采用“按需触发”教学模式：在您首次使用特定功能（如点击录入、查看打卡日历、编辑合集）时，页面会自动弹出对应的简短气泡引导。
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-1.5">
                    <div className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4]">
                      触发点 1：作品录入界面
                    </div>
                    <p className="text-[#6B7D8C] dark:text-[#9AABB8] text-[11px]">
                      引导如何粘贴豆瓣/IMDb链接并使用 AI 自动填充数据。
                    </p>
                  </div>

                  <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-1.5">
                    <div className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4]">
                      触发点 2：月度清单顺延
                    </div>
                    <p className="text-[#6B7D8C] dark:text-[#9AABB8] text-[11px]">
                      演示当月计划制定与未完成项目的跨月顺延机制。
                    </p>
                  </div>

                  <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-1.5">
                    <div className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4]">
                      触发点 3：多层级合集构建
                    </div>
                    <p className="text-[#6B7D8C] dark:text-[#9AABB8] text-[11px]">
                      讲解父子合集分组的建立与作品归类。
                    </p>
                  </div>

                  <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-1.5">
                    <div className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4]">
                      触发点 4：打卡日历悬停
                    </div>
                    <p className="text-[#6B7D8C] dark:text-[#9AABB8] text-[11px]">
                      指引如何在热力图中移动鼠标悬停预览历史记录。
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      Object.keys(localStorage).forEach(key => {
                        if (key.includes('_guide') || key.startsWith('media_archive_guide_dismissed_')) {
                          localStorage.removeItem(key);
                        }
                      });
                      window.dispatchEvent(new Event('media_archive_guides_reset'));
                      window.dispatchEvent(new Event('storage'));
                      alert('已重置所有触发式教学记录，再次使用对应功能时将重新呈现提示。');
                    }}
                    className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>重新开启所有触发教学提示</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: DATA MANAGEMENT */}
            {activeTab === 'data' && isAdmin && (
              <div className="space-y-4">
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#4A3B32] dark:text-[#DDDAC4]">
                    <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                    <span>{isAdmin ? '管理员测试数据重置与管理' : '档案库数据清空与重置'}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {isAdmin
                      ? '作为管理员，您可以重置或清空系统预置的测试数据。普通注册用户默认将获得干净空白的专属档案空间。'
                      : '普通注册用户账户默认已为您准备好空白干净的私藏归档空间。如果您希望清空当前账号录入的所有临时记录，可以点击下方清空按钮。'}
                  </p>
                  
                  {clearedNotice && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>数据更新成功！您可以关闭此弹窗开始使用。</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleClear}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      <span>{isAdmin ? '清空测试数据' : '清空当前账户所有记录'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} />
                        <span>恢复预置示例测试数据</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181c] space-y-2">
                  <div className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4]">
                    数据隐私与离线导出说明
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    本软件所有数据默认仅保存在当前浏览器的 LocalStorage 本地存储中。建议定期前往“数据相关”标签页导出标准的 JSON 格式备份文件，保障您的数据安全。
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              Media Management System
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              关闭指引
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
