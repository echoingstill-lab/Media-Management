/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, User, ArrowRight, SquareCheck } from 'lucide-react';

interface LoginViewProps {
  onLogin: (username: string, isAdmin?: boolean) => void;
  darkMode: boolean;
}

export default function LoginView({ onLogin, darkMode }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Local-only account storage keeps user accounts saved locally
  const getStoredUsers = (): Record<string, string> => {
    const data = localStorage.getItem('media_management_users');
    const users = data ? JSON.parse(data) : {};
    // Ensure default admin user Echoingstill exists
    if (!users['echoingstill']) {
      users['echoingstill'] = 'Echoingstill';
    }
    return users;
  };

  const saveUser = (user: string, pass: string) => {
    const users = getStoredUsers();
    users[user.toLowerCase()] = pass;
    localStorage.setItem('media_management_users', JSON.stringify(users));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    const users = getStoredUsers();
    const normalizedUser = username.trim().toLowerCase();

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (users[normalizedUser]) {
        setError('该用户名已被注册');
        return;
      }
      saveUser(username.trim(), password);
      const isRegisteredAdmin = normalizedUser === 'echoingstill';
      setSuccessMsg('注册成功！正在自动登录...');
      setTimeout(() => {
        onLogin(username.trim(), isRegisteredAdmin);
      }, 800);
    } else {
      const storedPass = users[normalizedUser] || (normalizedUser === 'echoingstill' ? 'Echoingstill' : null);
      if (!storedPass || storedPass !== password) {
        setError('用户名或密码错误');
        return;
      }
      const isAdminUser = normalizedUser === 'echoingstill' || normalizedUser === 'admin';
      onLogin(username.trim(), isAdminUser);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-all duration-300 ${
      darkMode 
        ? 'bg-[#111214] text-[#e3e4e6] selection:bg-zinc-800' 
        : 'bg-[#fbf9f3] text-[#2B1E19] selection:bg-[#e4ded5]'
    }`}>
      
      {/* Editorial Grid Frame */}
      <div className={`w-full max-w-lg border p-8 md:p-12 space-y-8 rounded-none relative transition-all duration-300 ${
        darkMode ? 'border-[#2e3238] bg-[#1b1e22]' : 'border-[#d3cbbe] bg-white'
      }`}>
        
        {/* Subtle decorative hairline grid borders for magazine feel */}
        <div className={`absolute top-0 bottom-0 left-4 border-l pointer-events-none opacity-[0.03] ${darkMode ? 'border-white' : 'border-black'}`} />
        <div className={`absolute top-0 bottom-0 right-4 border-r pointer-events-none opacity-[0.03] ${darkMode ? 'border-white' : 'border-black'}`} />

        {/* Brand Header */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[9px] tracking-[0.25em] opacity-50">
              档案库系统校验
            </span>
            <div className={`w-1.5 h-1.5 ${darkMode ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2.5xl md:text-3xl font-bold tracking-tight font-serif">
              媒体管理
            </h1>
            <p className="text-xs font-serif opacity-50 tracking-wider">
              个人数字媒体馆：书籍、影视与音乐的私藏归档。
            </p>
          </div>
          
          <div className={`h-[1px] w-full ${darkMode ? 'bg-[#2e3238]' : 'bg-[#d3cbbe]'}`} />
        </div>

        {/* Main form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          {/* Form Mode Tabs */}
          <div className="flex border-b border-[#d3cbbe] dark:border-[#2e3238]">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 pb-3 text-xs tracking-wider font-bold transition-all border-b-2 rounded-none font-serif ${
                mode === 'login' 
                  ? 'border-[#4A3B32] dark:border-zinc-100 text-[#2B1E19] dark:text-[#e3e4e6] opacity-100' 
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#e3e4e6] opacity-65'
              }`}
            >
              登录账户
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 pb-3 text-xs tracking-wider font-bold transition-all border-b-2 rounded-none font-serif ${
                mode === 'register' 
                  ? 'border-[#4A3B32] dark:border-zinc-100 text-[#2B1E19] dark:text-[#e3e4e6] opacity-100' 
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#e3e4e6] opacity-65'
              }`}
            >
              注册新档案
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 text-xs font-serif bg-red-500/10 border border-red-500/20 text-red-500 rounded-none">
              ⚠️ {error}
            </div>
          )}
          
          {successMsg && (
            <div className="p-3 text-xs font-serif bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-none flex items-center gap-2">
              <SquareCheck size={12} strokeWidth={3} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4">
            
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-serif tracking-wider opacity-60 block">
                档案用户名
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名..."
                  className={`w-full text-xs pl-9 pr-4 py-3 rounded-none border focus:outline-none transition-all ${
                    darkMode 
                      ? 'bg-[#15171a] border-[#2e3238] focus:border-zinc-600 text-[#e3e4e6]' 
                      : 'bg-[#faf9f6] border-[#d3cbbe] focus:border-zinc-400 text-[#2B1E19]'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-serif tracking-wider opacity-60 block">
                账户密码
              </label>
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码..."
                  className={`w-full text-xs pl-9 pr-4 py-3 rounded-none border focus:outline-none transition-all ${
                    darkMode 
                      ? 'bg-[#15171a] border-[#2e3238] focus:border-zinc-600 text-[#e3e4e6]' 
                      : 'bg-[#faf9f6] border-[#d3cbbe] focus:border-zinc-400 text-[#2B1E19]'
                  }`}
                />
              </div>
            </div>

            {/* Confirm Password (only on Register) */}
            {mode === 'register' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-serif tracking-wider opacity-60 block">
                  确认密码
                </label>
                <div className="relative">
                  <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码..."
                    className={`w-full text-xs pl-9 pr-4 py-3 rounded-none border focus:outline-none transition-all ${
                      darkMode 
                        ? 'bg-[#15171a] border-[#2e3238] focus:border-zinc-600 text-[#e3e4e6]' 
                        : 'bg-[#faf9f6] border-[#d3cbbe] focus:border-zinc-400 text-[#2B1E19]'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            type="submit"
            className={`w-full py-3 text-xs tracking-widest font-bold transition-all duration-200 flex items-center justify-center gap-2 rounded-none cursor-pointer font-serif ${
              darkMode 
                ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                : 'bg-[#4A3B32] text-white hover:bg-[#382B24]'
            }`}
          >
            <span>{mode === 'register' ? '确认注册并加入' : '立即登录系统'}</span>
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </form>

        {/* Footer info */}
        <div className="space-y-2 pt-4 border-t border-[#d3cbbe] dark:border-[#2e3238] relative z-10 text-center font-serif">
          <p className="text-[10px] opacity-60 leading-relaxed">
            账号与数据自动持久化。管理员账号 (Echoingstill) 自动获得内置测试归档与管理能力；普通用户建立独立的私藏档案空间。
          </p>
        </div>

      </div>
    </div>
  );
}
