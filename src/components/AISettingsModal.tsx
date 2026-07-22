import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Key, Info, Zap, ShieldCheck } from 'lucide-react';

interface AISettings {
  provider: 'gemini' | 'openai' | 'siliconflow';
  userApiKey: string;
  baseUrl: string;
  useCustomKey: boolean;
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function AISettingsModal({ isOpen, onClose, isAdmin }: AISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('ai_settings');
    return saved ? JSON.parse(saved) : {
      provider: 'openai',
      userApiKey: '',
      baseUrl: '',
      useCustomKey: false
    };
  });

  const [currentLimit, setCurrentLimit] = useState<number>(50);
  const [newLimitInput, setNewLimitInput] = useState<string>('50');
  const [limitMsg, setLimitMsg] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/limit')
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.limit === 'number') {
            setCurrentLimit(data.limit);
            setNewLimitInput(String(data.limit));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSaveLimit = async () => {
    const num = parseInt(newLimitInput, 10);
    if (isNaN(num) || num < 1) {
      setLimitMsg('⚠️ 请输入有效的整无限额数字');
      return;
    }
    try {
      const res = await fetch('/api/admin/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: num }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLimit(data.limit);
        setLimitMsg('✅ 系统每日解析限额已成功更新为 ' + data.limit + ' 次！');
      } else {
        setLimitMsg('⚠️ ' + (data.error || '更新失败'));
      }
    } catch (err: any) {
      setLimitMsg('⚠️ 无法连接到服务器');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#FBF9F3] dark:bg-[#111214] border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#4A3B32] dark:text-[#DDDAC4]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#4A3B32] dark:text-[#DDDAC4] font-serif">
                AI 解析设置 / AI SETTINGS
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Mode Selection */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                解析模式 / PARSE MODE
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, useCustomKey: false }))}
                  className={`flex flex-col items-center gap-2 p-4 border transition-all ${
                    !settings.useCustomKey 
                      ? 'bg-[#4A3B32] border-transparent text-[#FBF9F3] shadow-lg' 
                      : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <Zap size={20} />
                  <div className="text-center">
                    <div className="text-[11px] font-bold uppercase tracking-wider">公共模式</div>
                    <div className="text-[9px] opacity-60">使用共享额度</div>
                  </div>
                </button>

                <button
                  onClick={() => setSettings(prev => ({ ...prev, useCustomKey: true }))}
                  className={`flex flex-col items-center gap-2 p-4 border transition-all ${
                    settings.useCustomKey 
                      ? 'bg-[#4A3B32] border-transparent text-[#FBF9F3] shadow-lg' 
                      : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <ShieldCheck size={20} />
                  <div className="text-center">
                    <div className="text-[11px] font-bold uppercase tracking-wider">个人模式</div>
                    <div className="text-[9px] opacity-60">使用自有 KEY</div>
                  </div>
                </button>
              </div>
            </div>

            {settings.useCustomKey && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 overflow-hidden pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                    API 提供商 / PROVIDER
                  </label>
                  <select
                    value={settings.provider}
                    onChange={(e) => setSettings(prev => ({ ...prev, provider: e.target.value as 'gemini' | 'openai' | 'siliconflow' }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-xs text-[#4A3B32] dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#4A3B32]"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="siliconflow">SiliconFlow (硅基流动)</option>
                    <option value="openai">Other (OpenAI Compatible)</option>
                  </select>
                </div>

                {settings.provider === 'openai' && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                      API 代理地址 / BASE URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.deepseek.com"
                      value={settings.baseUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-[#4A3B32] dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#4A3B32]"
                    />
                    <p className="text-[9px] text-zinc-400">留空则默认使用 OpenAI 官方地址</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">
                    API KEY
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Key size={14} />
                    </div>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={settings.userApiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, userApiKey: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-9 pr-3 py-2 text-xs text-[#4A3B32] dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#4A3B32]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 space-y-3 font-serif">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    👑 管理员权限控制台
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 border border-amber-500/30 font-mono">
                    无限解析特权已生效
                  </span>
                </div>
                
                <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  管理员模式下使用公共模式进行解析不受任何次数限制。您可以在下方实时调整非管理员用户的公共模式每日解析限额。
                </p>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                    修改系统每日公共解析限额 (当前: {currentLimit} 次/天)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={newLimitInput}
                      onChange={(e) => setNewLimitInput(e.target.value)}
                      className="w-24 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveLimit}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-serif cursor-pointer transition-colors"
                    >
                      保存新限额
                    </button>
                  </div>
                  {limitMsg && (
                    <p className="text-[10px] font-serif text-amber-600 dark:text-amber-400 pt-1">
                      {limitMsg}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3 flex items-center gap-3">
              <Info size={16} className="text-amber-600 dark:text-amber-500 shrink-0" />
              <div className="text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed font-serif">
                {isAdmin 
                  ? `您当前处于管理员模式，AI 解析完全无限制。公共用户的每日共享解析限额为 ${currentLimit} 次/天。`
                  : settings.useCustomKey 
                  ? "配置自有 API 后将不再受公共模式的每日限额限制。"
                  : `公共模式每日限额为 ${currentLimit} 次/天，管理员模式或自有 API Key 可不受限制。`}
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#4A3B32] dark:bg-[#DDDAC4] text-[#FBF9F3] dark:text-[#111214] text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              完成 / DONE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
