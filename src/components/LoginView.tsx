/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, User, ArrowRight, SquareCheck } from 'lucide-react';
import { apiJson } from '../utils/api';

interface LoginViewProps {
  onLogin: (username: string, isAdmin?: boolean) => void;
  darkMode: boolean;
}

const USERS_STORAGE_KEY = 'media_management_users';
const SAVED_USERS_STORAGE_KEY = 'media_management_saved_users';
const RESERVED_USERS = new Set(['echoingstill', 'admin']);

function readStoredUsers(): Record<string, string> {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    const users = data ? JSON.parse(data) : {};
    if (!users.echoingstill) {
      users.echoingstill = 'Echoingstill';
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return { echoingstill: 'Echoingstill' };
  }
}

function normalizeUsername(user: string): string {
  return user.trim().toLowerCase();
}

function readSavedUsernames(): string[] {
  try {
    const data = localStorage.getItem(SAVED_USERS_STORAGE_KEY);
    const users = data ? JSON.parse(data) : [];
    return Array.isArray(users)
      ? users
          .filter((user): user is string => typeof user === 'string')
          .map(normalizeUsername)
          .filter(user => user && !RESERVED_USERS.has(user))
      : [];
  } catch {
    return [];
  }
}

function getVisibleStoredUsers(): string[] {
  return Array.from(new Set(readSavedUsernames()))
    .filter(user => user && !RESERVED_USERS.has(user));
}

export default function LoginView({ onLogin, darkMode }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [knownUsers, setKnownUsers] = useState<string[]>(() => getVisibleStoredUsers());

  // Local-only account storage keeps user accounts saved locally
  const getStoredUsers = (): Record<string, string> => {
    return readStoredUsers();
  };

  const saveKnownUser = (user: string) => {
    const normalized = normalizeUsername(user);
    if (!normalized) return;
    const saved = Array.from(new Set([...readSavedUsernames(), normalized]))
      .filter(user => !RESERVED_USERS.has(user));
    localStorage.setItem(SAVED_USERS_STORAGE_KEY, JSON.stringify(saved));
    setKnownUsers(getVisibleStoredUsers());
  };

  const saveUser = (user: string, pass: string) => {
    const users = getStoredUsers();
    const normalized = normalizeUsername(user);
    if (!normalized) return;
    users[normalized] = pass;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    saveKnownUser(normalized);
  };

  const tryCloudAuth = async (endpoint: '/api/sync/login' | '/api/sync/register', normalizedUser: string, rawPassword: string) => {
    try {
      const { response, data } = await apiJson<{
        success?: boolean;
        token?: string;
        user?: { username: string };
        error?: string;
      }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUser, password: rawPassword }),
      });

      if (response.status === 404 || response.status === 503 || !data) {
        return { available: false };
      }
      if (!response.ok || !data.success || !data.token || !data.user) {
        return { available: true, error: data.error || '云端账号验证失败' };
      }
      localStorage.setItem('media_management_cloud_token', data.token);
      localStorage.setItem('media_management_cloud_user', data.user.username);
      return { available: true, username: data.user.username };
    } catch {
      return { available: false };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    const users = getStoredUsers();
    const normalizedUser = normalizeUsername(username);
    setLoading(true);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        setLoading(false);
        return;
      }
      const cloud = await tryCloudAuth('/api/sync/register', normalizedUser, password);
      if (cloud.available && cloud.error) {
        setError(cloud.error);
        setLoading(false);
        return;
      }
      if (!cloud.available && users[normalizedUser]) {
        setError('该用户名已被注册');
        setLoading(false);
        return;
      }
      if (cloud.available) {
        saveKnownUser(cloud.username || username.trim());
      } else {
        saveUser(username.trim(), password);
      }
      const isRegisteredAdmin = normalizedUser === 'echoingstill';
      setSuccessMsg(cloud.available ? '云端注册成功！正在自动登录...' : '本地注册成功！正在自动登录...');
      setTimeout(() => {
        onLogin(cloud.username || username.trim(), isRegisteredAdmin);
      }, 800);
    } else {
      const cloud = await tryCloudAuth('/api/sync/login', normalizedUser, password);
      if (cloud.available && cloud.error) {
        setError(cloud.error);
        setLoading(false);
        return;
      }
      const storedPass = users[normalizedUser] || (normalizedUser === 'echoingstill' ? 'Echoingstill' : null);
      if (!cloud.available && (!storedPass || storedPass !== password)) {
        setError('用户名或密码错误');
        setLoading(false);
        return;
      }
      if (cloud.available) {
        saveKnownUser(cloud.username || username.trim());
      } else {
        saveKnownUser(username.trim());
      }
      const isAdminUser = normalizedUser === 'echoingstill' || normalizedUser === 'admin';
      onLogin(cloud.username || username.trim(), isAdminUser);
    }
    setLoading(false);
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
            {error}
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
              {knownUsers.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] opacity-50">本浏览器保存的账号</p>
                  <div className="flex flex-wrap gap-1.5">
                    {knownUsers.map(user => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => setUsername(user)}
                        className={`px-2 py-1 text-[10px] border rounded-none transition-colors ${
                          darkMode
                            ? 'border-[#2e3238] text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                            : 'border-[#d3cbbe] text-zinc-500 hover:text-[#2B1E19] hover:border-zinc-500'
                        }`}
                      >
                        {user}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            disabled={loading}
            className={`w-full py-3 text-xs tracking-widest font-bold transition-all duration-200 flex items-center justify-center gap-2 rounded-none cursor-pointer font-serif ${
              darkMode 
                ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                : 'bg-[#4A3B32] text-white hover:bg-[#382B24]'
            } disabled:opacity-60 disabled:cursor-wait`}
          >
            <span>{loading ? '正在验证账户...' : mode === 'register' ? '确认注册并加入' : '立即登录系统'}</span>
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </form>

        {/* Footer info */}
        <div className="space-y-2 pt-4 border-t border-[#d3cbbe] dark:border-[#2e3238] relative z-10 text-center font-serif">
          <p className="text-[10px] opacity-60 leading-relaxed">
            登录页只显示本浏览器保存过的账号名，不是云端用户列表。换浏览器或换设备时，请登录同一云同步账号恢复数据。
          </p>
        </div>

      </div>
    </div>
  );
}
