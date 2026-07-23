# 媒体管理 (Media Management)

媒体管理是一个专注于图书、电影、剧集、动漫、音乐与游戏的个人文化档案管理系统。系统结合多维度整理、月度归档、打卡追踪与智能解析能力，帮助用户构建清晰、可持续的个人数字书房与作品记录。

---

## 核心功能

### 1. 媒体档案 (Archive)
- 全类型支持：统一记录图书、电影、剧集、动漫、音乐与游戏。
- 详细元数据：支持标题、原名、作者/主创、评分、完成状态、封面图片、简介、标签、关联合集与私人笔记。
- 状态追踪：提供想读/想看、在读/在看、已完成、已放弃等状态归类。
- 灵活筛选：支持按类型、分类状态、自定义标签与关键字快速检索。

### 2. 月度清单 (Monthly Wishlist)
- 按月规划：按自然月度组织想读、想看、想听或想玩的项目。
- 进度顺延：对于未完成的项目，支持一键顺延至上月或下月。
- 快捷打卡：在月度清单中可直接勾选标记完成，系统会自动同步更新媒体档案状态。

### 3. 合集分组 (Collections)
- 多级层级：支持创建无限层级的主题合集（例如：父合集“2026年度必读”，子合集“哲学与思辨”）。
- 主题归档：将分散在不同类型的作品归入统一主题进行集中管理与回顾。

### 4. 标签管理 (Tag Library)
- 全局与专属标签：支持创建全局通用标签，亦可创建绑定至特定媒体类型（如仅限图书或仅限游戏）的专属标签。
- 多维归类：利用标签实现跨主题的多维度筛选与统计。

### 5. 打卡记录 (Habit Tracker)
- 习惯追踪：记录日常阅读、观影、听歌与游戏活动。
- 视觉热力图：提供连续打卡天数统计与打卡活动历程记录。

### 6. 智能链接解析 (AI & Link Parser)
- 一键解析：支持粘贴豆瓣、IMDb、Steam、Apple Music、网易云音乐、维基百科等平台详情页链接。
- 自动填充：系统自动抓取并解析作品标题、作者/主创、评分、封面图及简介信息，大幅降低手动录入成本。

### 7. 数据与备份 (Data Management)
- 本地优先：数据默认保存在浏览器本地，保障隐私与离线可用性。
- 标准 JSON 导出/导入：提供无损的数据备份与还原，方便跨设备迁移与归档。
- 批量处理：支持通过 CSV、TSV 或纯文本名单批量导入数据。

---

## 先行版数据策略

当前公开体验版默认按“本机优先”运行。普通用户不需要配置服务器也能使用。

### 本地数据保存

媒体档案、合集、打卡、标签和本地账号信息默认保存在当前浏览器的 `localStorage` 中。页面更新通常不会删除这些数据，因为代码更新和浏览器本地存储是分开的。

新用户首次登录后，页面会先提示查看“数据安全与同步”说明。普通使用只需要记住三件事：

- 数据会先保存在当前浏览器。
- 重要记录请在“数据相关”页面导出 JSON 备份。
- 如果要换浏览器、换设备或多端同步，需要先开启云同步。

需要注意：
- 清理浏览器站点数据、使用无痕模式、更换浏览器、更换设备或更换域名后，可能读不到原来的记录。
- 未配置云同步时，账号只是当前浏览器里的数据分区；配置云同步后，注册用户名会在云端保持唯一，并通过服务端快照实现多端同步。
- 重要记录请在“数据相关”页面定期导出 JSON 备份。

### 多用户与多设备

同一个浏览器里可以注册多个账号，账号之间会使用不同的数据分区。切换用户后，新用户会重新看到数据保存指引。

未配置云同步时，不同用户的数据不会上传到 GitHub Pages，也不会自动同步到其他设备。换浏览器或换设备时，需要使用 JSON 备份导入恢复。

同一台电脑同一浏览器中，懂技术的用户可以通过浏览器开发工具看到本地存储内容，因此当前版本不能作为严格隐私隔离或多人协作系统。

配置云同步后，注册用户名会在云端保持唯一，并通过服务端快照实现多端同步。

### Pages 与 Vercel 的分工

- GitHub Pages：托管公开前端页面，适合发给朋友体验基础流程。
- 浏览器本地存储：保存媒体库、合集、打卡和标签数据。
- Vercel API：可选后端，用于链接解析、AI 调用和公共解析次数限制。

如果 Pages 前端需要调用 Vercel API，请在公开仓库的 GitHub Actions Variables 中设置：

```env
VITE_API_BASE_URL="https://your-vercel-project.vercel.app"
```

同时在 Vercel 环境变量中设置允许跨域来源：

```env
CORS_ORIGINS="https://echoingstill-lab.github.io"
```

未配置 `VITE_API_BASE_URL` 时，前端会默认请求同域 `/api`。这适合 Vercel 自己部署前后端一体版本，但不适合 GitHub Pages。

### 云同步当前状态

代码层已经加入“云端快照同步”，用于满足多端登录、数据隔离和云端恢复。它需要部署者把 Vercel API 和 Supabase 数据库接好后才会生效：

- 前端继续部署在 GitHub Pages 或 Vercel。
- Vercel API 负责注册、登录、读取云端快照、上传云端快照。
- Supabase/Postgres 保存用户账号和每个用户的一份完整数据快照。
- 浏览器仍保留本地缓存和 JSON 导出备份，网络异常时不影响本机使用。
- 本机和云端都有数据时不会静默覆盖，需要用户在“数据相关”页手动选择。

### Supabase 云同步配置（部署者）

1. 新建 Supabase 项目。
2. 在 Supabase SQL Editor 中执行 `docs/cloud-sync-supabase.sql`。
3. 在 Vercel 环境变量中设置：

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SYNC_AUTH_SECRET="use-a-long-random-secret"
CORS_ORIGINS="https://echoingstill-lab.github.io"
```

4. 在公开 GitHub 仓库 Actions Variables 中设置：

```env
VITE_API_BASE_URL="https://your-vercel-project.vercel.app"
```

安全说明：
- `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 环境变量中，不能放进前端或 GitHub Pages。
- Supabase 表已启用 RLS，前端不直接访问数据库，只通过 Vercel API 访问。
- 第一版同步的是整份 JSON 快照，不做实时协同编辑。

---

## 推荐解析站点

进行作品录入时，粘贴以下平台链接可获得最佳解析效果：

- 豆瓣：图书、电影、剧集、动漫、音乐、游戏条目。
- IMDb：电影、剧集条目。
- Steam：游戏商店页面。
- Apple Music：音乐专辑页面。
- 网易云音乐：单曲与专辑页面。
- 维基百科：作品条目页面。

---

## 使用指南与流程

1. 启动体验：访问应用并登录后，系统会先提示查看数据保存说明，确认本机缓存、JSON 备份和云端同步的区别。
2. 建立月度计划：进入“月度清单”页面，添加本月计划阅读或观赏的作品。
3. 快速录入作品：点击导航栏“录入档案”，粘贴豆瓣或其他平台的作品链接，系统将自动补全元数据。
4. 归类与分组：为作品添加相应标签，并将其归入对应的“主题合集”中。
5. 日常打卡与归档：在完成作品后勾选打卡，在“打卡记录”中查看习惯热力图。
6. 定期备份：在“数据相关”页面导出 JSON 格式备份文件，妥善保管个人数据。

---

## 本地开发与运行

### 环境要求
- Node.js 20.0.0 或更高版本。

### 安装步骤

1. 克隆或下载项目源码。
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 在浏览器中访问 `http://localhost:3000`。

### 代码检查与构建

- 类型检查：
  ```bash
  npm run lint
  ```
- 编译生产构建：
  ```bash
  npm run build
  ```
- 启动生产服务：
  ```bash
  npm start
  ```

---

## 环境变量配置

复制 `.env.example` 文件并重命名为 `.env`，根据需要配置以下参数：

```env
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
SILICONFLOW_API_KEY="..."
AI_DAILY_LIMIT="50"
ADMIN_TOKEN="..."
APP_URL="..."
VITE_API_BASE_URL=""
CORS_ORIGINS="https://echoingstill-lab.github.io"
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SYNC_AUTH_SECRET=""
```

参数说明：
- `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `SILICONFLOW_API_KEY`：用于辅助链接解析与 AI 信息提取。若未配置，系统仍可通过平台基础元数据或手动输入进行录入。
- `AI_DAILY_LIMIT`：公共 AI 解析每日配额次数限制。
- `ADMIN_TOKEN`：管理员密钥，用于限额豁免与管理员接口保护。正式部署时请设置为高强度随机字符串。
- `APP_URL`：应用部署的域名地址。
- `VITE_API_BASE_URL`：GitHub Pages 前端调用 Vercel/API 服务时使用的后端地址。
- `CORS_ORIGINS`：允许调用 API 的前端来源，多个来源用英文逗号分隔。
- `SUPABASE_URL`：Supabase 项目地址，用于云同步。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 服务端密钥，只能配置在 Vercel 服务端环境变量中。
- `SYNC_AUTH_SECRET`：云同步登录 token 的签名密钥，请使用高强度随机字符串。

---

## 部署说明

项目已配置针对 Vercel 及 Cloud Run 等容器环境的适配文件（`vercel.json` 与 Express 服务端 `server.ts`）：

- 构建指令：`npm run build`
- 静态产物目录：`dist`
- 部署前请务必在服务器环境变量中设置必要的 API 密钥与 `ADMIN_TOKEN`。
- 如果使用 GitHub Pages 作为前端入口，并希望保留链接解析能力，请设置公开仓库变量 `VITE_API_BASE_URL` 指向 Vercel 部署地址。
