# 📚 悦读日记 (Media & Habit Tracker)

一个精致且多功能的个人媒体库和打卡管理应用。该应用提供轻量、极简而专业的视觉设计，帮助用户优雅地记录与追踪他们正在阅读的图书、观看的电影、聆听的音乐以及体验的游戏，并结合了日常打卡与月度心愿单管理，养成优秀的阅读与娱乐习惯。

---

## ✨ 核心功能 (Core Features)

1. **🎬 多维度媒体库管理 (Media Library)**
   - 支持 **图书**、**电影**、**剧集**、**音乐**、**游戏** 五大主流分类。
   - 包含详细的内容视图、添加/编辑窗口、标签、主创团队、状态（待阅、进行中、已完成、已搁置）。
   - 支持批量导入预览与管理，包含高级筛选。

2. **📅 优雅打卡日历 (Habit Check-In Calendar)**
   - 优雅、高对比度的卡片式打卡日历，清晰展示每日活动。
   - 记录完成进度并生成 **连续打卡天数 (Streaks)** 和习惯统计。
   - **完全取消打卡机制**：支持再次点击直接撤销选中状态并恢复，保障最简易的交互流程。

3. **📌 月度清单与心愿单 (Monthly Wishlist Board)**
   - 按月份分组管理待阅/待办心愿单。
   - **快捷一键录入**：包含流畅的下拉分类图标及极简输入，直接添加项目。
   - 提供顺延项目至下月、状态切换（待阅 ⇄ 进行中 ⇄ 已完成）以及撤销等操作。
   - 彻底优化工具提示（Tooltips），完全规避原生 `title` 属性样式限制。

4. **⚡ 全栈服务与部署支持 (Full-Stack Support)**
   - 配备基于 **Express + Vite** 的全栈服务端代理，保障敏感密钥安全。
   - 专门优化 **Vercel** 部署体验：已内置 `vercel.json` 路由规则、`api/index.ts` 服务器入口及完美的 SPA 单页路由劫持，彻底解决 Vercel 部署后的 `404: NOT_FOUND` 错误。

---

## 🛠️ 本地开发运行 (Local Development)

### 1. 安装依赖

确保你本地安装了 Node.js，然后运行：

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

该命令将同时启动本地 Express API 路由及前端 Vite 编译，通常可以在浏览器中打开 `http://localhost:3000` 进行预览。

### 3. 本地构建与生产环境运行

```bash
# 打包构建前端静态文件与服务端代码
npm run build

# 启动生产服务器
npm start
```

### 4. 环境变量

复制 `.env.example` 到 `.env` 后按需配置：

```bash
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
SILICONFLOW_API_KEY="..."
AI_DAILY_LIMIT="50"
ADMIN_TOKEN="..."
APP_URL="..."
```

`ADMIN_TOKEN` 用于保护管理员限额接口和公共 AI 解析的管理员豁免权限。正式部署前请设置为高强度随机字符串，并只通过服务器环境变量保存。

---

## 🚀 部署至 Vercel (Vercel Deployment)

本项目已对 Vercel 进行了原生适配。如果你的代码推送到 GitHub，直接在 Vercel 导入该仓库并选择默认设置即可。

我们已为你配置了以下关键项：
- `vercel.json` 路由配置，确保非静态资源（如单页应用前端路由）完美 fallback 到 `/index.html`，消除 Vercel `404: NOT_FOUND Code: NOT_FOUND`。
- `api/index.ts` 作为 Serverless 函数桥接 Express 路由服务。

---

## 🎨 视觉与交互规范 (Design Principles)

- **字体搭配**：采用经典的 `Inter` 无衬线字体，搭配高级的等宽字体用于技术数据和统计状态，带来平衡和现代的感官体验。
- **高对比度配色**：主调偏向温暖的象牙白与高级煤炭深色，暗色模式下拥有顶级的深邃视觉体验（Cosmic Slate Theme）。
- **动效微交互**：打卡和状态过渡加入了细致的 `motion/react` 微动效，每次点击打卡或切换状态都能得到自然的响应回馈。
