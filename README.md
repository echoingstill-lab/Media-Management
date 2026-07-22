# Media Management / 悦读日记

Media Management 是一个个人媒体记录工具，用来管理图书、电影、剧集、音乐和游戏。项目包含媒体档案、月度清单、合集分组、打卡记录、标签管理、数据备份和链接解析能力。

当前仓库用于开发版本。正式公开版本发布前，请先确认环境变量、解析接口和部署配置已经在目标环境中验证通过。

## 功能范围

- 媒体档案：记录标题、分类、作者或主创、评分、状态、封面、简介、标签、合集和个人笔记。
- 月度清单：按月份管理想读、想看、想听或想玩的项目，支持顺延到上月或下月。
- 合集分组：创建多级合集，并把媒体条目归入不同主题。
- 打卡记录：按日期记录阅读、观影、听歌、游戏等习惯，显示连续记录和当日活动。
- 标签管理：维护通用标签和分类专属标签，用于筛选和归档。
- 数据管理：导出 JSON 备份，导入备份，批量解析 CSV、TSV 或纯文本名单。
- 链接解析：录入媒体时可粘贴推荐站点链接，系统会尽量自动填充基础信息。

## 推荐解析链接

当前优先推荐使用以下站点链接：

- 豆瓣：图书、电影、剧集、音乐、游戏条目。
- IMDb：电影和剧集条目。
- Steam：游戏商店页。
- Apple Music：专辑页。
- 网易云音乐：歌曲页。
- 维基百科：作品条目页。

其他详情页可以尝试解析，但结果取决于页面元数据和 AI 配置；如果解析失败，请手动补全信息。

## 本地开发

要求 Node.js 20 或更高版本。

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问地址通常是 `http://localhost:3000`。

类型检查：

```bash
npm run lint
```

构建生产版本：

```bash
npm run build
```

启动生产服务：

```bash
npm start
```

## 环境变量

复制 `.env.example` 为 `.env`，按需配置：

```bash
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
SILICONFLOW_API_KEY="..."
AI_DAILY_LIMIT="50"
ADMIN_TOKEN="..."
APP_URL="..."
```

说明：

- `GEMINI_API_KEY`、`DEEPSEEK_API_KEY`、`SILICONFLOW_API_KEY` 用于 AI 链接解析。没有配置时，仍可使用部分站点的元数据解析和手动录入。
- `AI_DAILY_LIMIT` 控制公共 AI 解析的每日次数。
- `ADMIN_TOKEN` 用于保护管理员限额接口和管理员解析豁免。正式部署时必须使用高强度随机字符串，并只保存在服务器环境变量中。
- `APP_URL` 用于部署环境中的应用地址配置。

## Vercel 部署

项目已包含 `vercel.json` 和 `api/index.ts`，用于在 Vercel 上运行前端页面和 Express API。

部署前需要在 Vercel 项目环境变量中配置需要的 AI Key 和 `ADMIN_TOKEN`。如果只部署前端和手动录入功能，可以暂不配置 AI Key，但链接解析能力会受限。

当前 `vercel.json` 使用：

- `installCommand`: `npm install --no-package-lock`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`

## 数据说明

当前数据主要存储在浏览器本地存储中。跨设备迁移时，请先在“数据相关”页面导出 JSON 备份，再在目标设备导入。

这个仓库保留开发配置和内部迭代记录。后续公开版本建议另建公开仓库，并在发布前重新检查 README、环境变量示例和部署说明。
