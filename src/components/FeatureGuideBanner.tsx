import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, HelpCircle } from 'lucide-react';

interface FeatureGuideBannerProps {
  guideKey: string; // Unique key stored in localStorage
  title: string;
  description: string;
  badge?: string;
  userId?: string | null;
}

export default function FeatureGuideBanner({
  guideKey,
  title,
  description,
  badge = '特色功能提示',
  userId
}: FeatureGuideBannerProps) {
  const activeUser = userId !== undefined ? userId : (localStorage.getItem('media_management_user') || 'guest');
  const storageKey = `media_archive_guide_dismissed_${activeUser}_${guideKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const isDismissed = localStorage.getItem(storageKey) === 'true';
      setVisible(!isDismissed);
    };

    checkVisibility();

    window.addEventListener('storage', checkVisibility);
    window.addEventListener('media_archive_guides_reset', checkVisibility);
    return () => {
      window.removeEventListener('storage', checkVisibility);
      window.removeEventListener('media_archive_guides_reset', checkVisibility);
    };
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="mb-4 p-3 bg-[#FBF9F3] dark:bg-[#181a1e] border-l-4 border-amber-600 dark:border-amber-400 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3 font-serif"
      >
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="p-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
              <span className="font-bold text-xs text-[#4A3B32] dark:text-[#DDDAC4] whitespace-normal">
                {title}
              </span>
              <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-mono shrink-0 whitespace-nowrap">
                {badge}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer text-[11px] font-sans font-medium inline-flex items-center gap-1 border border-zinc-300/60 dark:border-zinc-700/60 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 shrink-0 whitespace-nowrap self-center"
          title="不再显示此功能提示"
        >
          <span className="whitespace-nowrap select-none font-sans font-medium">我知道了</span>
          <X size={13} className="shrink-0" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
