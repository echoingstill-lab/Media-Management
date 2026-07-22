/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, User, Key, Check, Shield } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAdmin: boolean;
  onUpdateAccount: (newUsername: string, newPassword?: string) => void;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
  onUpdateAccount,
}: AccountSettingsModalProps) {
  const [usernameInput, setUsernameInput] = useState(currentUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser) {
      setError('用户名不能为空');
      return;
    }

    // Verify current password
    const usersData = localStorage.getItem('media_management_users');
    const users = usersData ? JSON.parse(usersData) : {};
    const oldLower = currentUser.trim().toLowerCase();
    const newLower = trimmedUser.toLowerCase();

    const storedPass = users[oldLower] || (oldLower === 'echoingstill' ? 'Echoingstill' : null);

    if (storedPass && currentPassword !== storedPass) {
      setError('当前原密码输入错误，校验失败');
      return;
    }

    // Check duplicate username if changing username
    if (newLower !== oldLower) {
      if (users[newLower]) {
        setError('该新用户名已被其他账号占用，请使用其他用户名');
        return;
      }
    }

    // Check new password if provided
    if (newPassword) {
      if (newPassword !== confirmNewPassword) {
        setError('两次输入的新密码不一致');
        return;
      }
    }

    // Save changes
    onUpdateAccount(trimmedUser, newPassword || undefined);
    setSuccessMsg('账号与密码修改成功！');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-serif animate-fade-in">
      <div className="w-full max-w-md bg-[#181A1E] text-[#e3e4e6] border border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-[#DDDAC4] flex items-center gap-2">
              <User size={18} className="text-amber-500" />
              <span>修改账号与密码</span>
            </h3>
            <p className="text-xs text-zinc-400">
              您可以随时更名或更新您的凭据。修改记录将即时同步并保存。
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isAdmin && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <Shield size={14} className="shrink-0 text-amber-400" />
            <span>您当前处于管理员权限账号（Echoingstill）。修改密码后将成为新验证凭据。</span>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Current Username */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">修改档案用户名</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="请输入新用户名..."
                className="w-full bg-[#111214] border border-zinc-800 focus:border-zinc-600 px-9 py-2.5 text-white outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-500">用户名不可与系统中现有其他用户重复。</p>
          </div>

          {/* Current Password Verification */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
            <label className="text-zinc-400 block font-medium">验证当前原密码</label>
            <div className="relative">
              <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前账号原密码以验证身份..."
                className="w-full bg-[#111214] border border-zinc-800 focus:border-zinc-600 px-9 py-2.5 text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* New Password (Optional) */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">新密码 (如不修改请留空)</label>
            <div className="relative">
              <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码 (可留空)..."
                className="w-full bg-[#111214] border border-zinc-800 focus:border-zinc-600 px-9 py-2.5 text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          {newPassword && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-zinc-400 block font-medium">确认新密码</label>
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="请再次输入新密码..."
                  className="w-full bg-[#111214] border border-zinc-800 focus:border-zinc-600 px-9 py-2.5 text-white outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#DDDAC4] hover:bg-white text-zinc-950 font-bold cursor-pointer transition-colors"
            >
              保存修改
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
