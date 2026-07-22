# AI Studio Requirement: Animated User Guide

## Background

媒体管理 (Media Management) is a personal media archive and habit tracking app. The app already has several core areas: login/guest entry, monthly wishlist, media archive, collection groups, check-in calendar, data backup/import, tag management, AI parsing settings, and media entry/editing.

The next task is to add an animated user guide that helps first-time users understand the product quickly without turning the home screen into a landing page.

## Goal

Create an in-app animated guide for first-time and returning users. The guide should teach the main workflow:

1. Enter as a guest or account user.
2. Add a media item by pasting a Douban or other media link.
3. Confirm parsed title, cover, type, tags, and metadata.
4. Organize the item into tags and collections.
5. Add the item to the monthly wishlist.
6. Mark progress and completion from the monthly list.
7. Review the full archive and check-in calendar.
8. Export or import local data.

The guide should feel like a polished product walkthrough, not a static help document.

## Primary Users

- Users who want to record books, movies, TV/anime, music, and games in one private archive.
- Users who rely on Douban links for quick entry.
- Users who want local-first data storage and manual backup/import.
- Users who may not understand the difference between monthly plans, full archive, collections, and tags.

## Entry Points

Add these guide entry points:

1. First visit after login or guest entry
   - Show a small welcome guide prompt after the main app loads.
   - Do not block the page immediately with a large modal unless the user clicks "Start".
   - Store completion state locally, for example `media_management_onboarding_completed`.

2. Persistent help button
   - Add a small icon button in the header near AI settings/theme/logout.
   - Use a familiar icon such as `CircleHelp` from lucide-react.
   - Tooltip: `查看使用指引`.
   - Clicking it reopens the guide anytime.

3. Contextual empty-state shortcut
   - If a section is empty, show a compact "查看如何添加" action where appropriate.
   - Keep it subtle; do not duplicate the whole guide content in empty states.

## Guide Format

Use an animated step-by-step overlay tour.

Requirements:

- Use the existing visual style: dark editorial layout, thin borders, serif headings, restrained colors.
- Avoid rounded card-heavy marketing style.
- Overlay should dim the background and spotlight the current target area when possible.
- Each step should have:
  - Short title.
  - One concise explanation sentence.
  - Optional animated visual cue.
  - `上一步`, `下一步`, `跳过`, `完成` controls.
- Progress indicator should show current step and total, for example `3 / 8`.
- The guide must work on desktop and mobile.
- It must not cover the target UI in a way that makes the step confusing.
- Respect reduced-motion preference: if `prefers-reduced-motion` is enabled, replace movement with fade transitions.

## Suggested Step Script

### Step 1: Welcome

Target: header title area.

Title: `欢迎来到媒体管理`

Copy: `这里可以统一管理你的书、电影、剧集、动漫、音乐和游戏，并记录每月计划与完成进度。`

Animation: subtle fade-in and line reveal around the header.

### Step 2: Monthly Wishlist

Target: `月度清单` navigation and current month board.

Title: `先从本月清单开始`

Copy: `把这个月想读、想看、想听、想玩的内容放进对应分类，完成后直接勾选。`

Animation: highlight one monthly category card and show a small checkmark motion.

### Step 3: Add Media

Target: `录入档案` button.

Title: `快速录入作品`

Copy: `点击录入档案后，可以粘贴豆瓣链接或直接输入作品名，让系统自动填充基础信息。`

Animation: cursor-like motion from the nav button to the modal input.

### Step 4: AI / Douban Parse

Target: media edit modal parse input and parse button.

Title: `粘贴链接自动解析`

Copy: `豆瓣链接会优先使用稳定的豆瓣元数据，标题、封面、评分和分类会更准确。`

Animation: show text being pasted, then fields filling in sequence.

### Step 5: Tags

Target: tag selector area in the edit modal or `管理标签库`.

Title: `用标签建立自己的分类法`

Copy: `标签可以是通用标签，也可以绑定到图书、电影、音乐等具体类型。`

Animation: tag chips slide into the selected tag area.

### Step 6: Collections

Target: collection selector or `合集分组` nav.

Title: `用合集保存主题书影音`

Copy: `合集适合整理长期主题，比如一生之书、投资学习、治愈作品或朋友推荐。`

Animation: item card moves into a collection group.

### Step 7: Archive And Detail

Target: `媒体档案` nav and one media card.

Title: `档案库保存完整记录`

Copy: `在媒体档案中可以筛选类型、状态和标签，也可以打开详情补充感想、评分和附件。`

Animation: filter chips highlight, then card detail panel opens.

### Step 8: Check-In And Backup

Target: `打卡记录` and `数据相关` nav.

Title: `记录习惯，也记得备份`

Copy: `打卡记录用于追踪日常习惯；数据相关里可以导出备份，方便迁移或恢复。`

Animation: calendar day pulses once, then export icon appears.

## Interaction Requirements

- Users can skip the guide at any step.
- Users can finish the guide and should not see the first-visit prompt again.
- Users can reopen the full guide from the help button.
- The guide should not create or modify real media data during the walkthrough.
- The guide can use lightweight simulated animations, but must not leave fake records in localStorage.
- If the target element is unavailable because a modal is closed, the guide should open the required modal automatically for that step, then restore normal state when finished or skipped.
- If automatic targeting is too complex, use a centered guide panel with an animated mini mockup for that step.

## Technical Expectations

- Prefer a reusable component such as `UserGuideTour.tsx`.
- Keep guide state local to the browser.
- Use existing dependencies where possible:
  - `motion/react` for transitions.
  - `lucide-react` for icons.
- Avoid adding a large tour dependency unless necessary.
- Keep guide data in a structured array, for example:

```ts
const GUIDE_STEPS = [
  {
    id: 'welcome',
    title: '欢迎来到媒体管理',
    body: '...',
    target: '[data-guide="app-header"]',
  },
];
```

- Add stable `data-guide` attributes to relevant UI targets instead of relying on fragile text selectors.
- The component should gracefully fall back if a target selector is missing.

## Recommended UI Targets

Add `data-guide` attributes to:

- App header: `data-guide="app-header"`
- Main navigation: `data-guide="main-nav"`
- Monthly wishlist: `data-guide="monthly-wishlist"`
- Add media button: `data-guide="add-media"`
- Parse input area: `data-guide="parse-media"`
- Tag manager button/area: `data-guide="tags"`
- Collection area: `data-guide="collections"`
- Media archive section: `data-guide="media-archive"`
- Check-in calendar: `data-guide="check-in-calendar"`
- Data management section: `data-guide="data-management"`

## Copy Style

- Use concise Chinese.
- Avoid tutorial walls of text.
- Avoid technical words such as `localStorage`, `API`, `JSON` in the main guide unless the step is about backup or AI settings.
- Keep each explanation under 40 Chinese characters when possible.
- The tone should be calm and practical.

## Acceptance Criteria

1. On first guest/account entry, the user sees a non-intrusive guide prompt.
2. Starting the guide shows animated steps with previous/next/skip/finish controls.
3. Completing or skipping the guide stores local completion state.
4. Header help button can reopen the guide anytime.
5. Desktop and mobile layouts have no overlapping text or controls.
6. The guide does not create test records or modify user archive data.
7. If the guide opens a modal for demonstration, closing/skipping restores the app to a usable state.
8. `npm run lint` and `npm run build` pass.
9. Browser smoke test covers:
   - First guest entry guide prompt.
   - Full guide navigation.
   - Skip and finish behavior.
   - Reopening from help button.
   - Mobile viewport layout.

## Out Of Scope For This Task

- Full documentation center.
- Video export.
- Server-side account authentication.
- Cloud sync.
- Public marketing landing page.
- Rewriting the main app navigation.

## Notes For AI Studio

This should be implemented as an in-app product guide, not a separate README page. The user should be able to understand the app by watching the guide and then immediately continue using the same screen.
