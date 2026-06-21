# 墨阅 Moreader — Chrome Web Store 上架资料

---

## 一、基础信息

| 字段 | 中文值 | English Value |
|------|--------|---------------|
| 名称 | 墨阅 Moreader — EPUB 阅读器 | Moreader — EPUB Reader |
| 简称 | Moreader | Moreader |
| 版本 | 2.3.3 | 2.3.3 |
| 说明 | 沉浸式 EPUB 电子书阅读器。支持目录导航、书签与高亮标注、划词翻译（AI / 有道 / Google / DeepL）、多引擎听书（Edge TTS / AI Voice） | Immersive EPUB ebook reader with table of contents, bookmarks, highlights, text translation (AI / Youdao / Google / DeepL), and multi-engine TTS (Edge TTS / AI Voice) |
| 类别 | 生产力 | Productivity |
| 语言 | 中文 (简体), English, 日本語, 한국어, Deutsch, Français, Português (Brasil) | — |

---

## 二、详细描述

### 中文

**墨阅 Moreader** 是一款专注于阅读体验的 EPUB 电子书阅读器浏览器扩展。打开即用，无需注册，不收集任何数据。

**核心功能：**

📖 **沉浸阅读**
- 完整的 EPUB 支持，保留原书排版
- 自定义字体大小、行距、主题（浅色/深色/羊皮纸）
- 全屏阅读模式
- 目录导航快速跳转

🔖 **笔记与标注**
- 书签管理：添加、查看、跳转
- 文本高亮：选中文字标注高亮，支持颜色选择
- 生词本：阅读中收集单词，方便复习

🌐 **划词翻译**
- 选中文字一键翻译
- 支持 AI 翻译（OpenAI 兼容接口，可自定义端点）
- 支持多模式：翻译 / 语境解析 / 语法分析
- 无 API Key 时也可使用有道 / Google / DeepL

🔊 **多引擎听书**
- Edge TTS（微软神经语音）：中英日韩德法，100+ 高品质语音
- AI Voice：对接任意 TTS API
- 语速调节，逐段高亮跟读
- 章节连续朗读

📂 **文件管理**
- 拖拽导入 EPUB 文件
- 阅读进度自动保存
- 最近阅读列表

**隐私说明：**
- 零数据收集，不请求任何用户数据
- 所有书籍数据存储在浏览器的 IndexedDB 中，不上传任何服务器
- 翻译和 TTS 使用您自行配置的 API 端点，扩展本身不维护任何后端服务
- 本扩展不需要 "storage" 权限——所有数据存储使用浏览器内置的 IndexedDB
- 本扩展不需要 "activeTab" 或 "tabs" 权限——仅在您点击图标时打开自身页面
- 本扩展不需要 "tts" 权限——听书功能通过您配置的 HTTP 服务实现

---

### English

**Moreader** is a Chrome extension EPUB reader designed for immersive reading. Open and read instantly — no registration, no data collection.

**Features:**

📖 **Immersive Reading**
- Full EPUB support with original formatting preserved
- Customizable font size, line spacing, and themes (Light / Dark / Sepia)
- Fullscreen reading mode
- Table of contents for quick navigation

🔖 **Notes & Annotations**
- Bookmark management: add, view, and jump to bookmarks
- Text highlighting with color options
- Vocabulary collector for word review

🌐 **Selection Translation**
- One-click translation of selected text
- AI translation via OpenAI-compatible APIs
- Multiple modes: Translate / Context Explanation / Grammar Analysis
- Fallback to Youdao / Google / DeepL

🔊 **Multi-Engine Text-to-Speech**
- Edge TTS (Microsoft Neural): 100+ high-quality voices across Chinese, English, Japanese, Korean, German, French, and more
- AI Voice: connect to any TTS API
- Adjustable reading speed with paragraph-level highlight tracking
- Continuous chapter reading

📂 **File Management**
- Drag & drop EPUB import
- Reading progress auto-saved
- Recent books list

**Privacy:**
- Zero data collection. No user data requested.
- All book data is stored locally in IndexedDB. Nothing is uploaded.
- Translation and TTS use your own API endpoints. No backend servers required.
- This extension requires zero Chrome permissions:
  - No `storage` permission — uses browser's built-in IndexedDB
  - No `activeTab` or `tabs` — opens only its own page
  - No `tts` permission — TTS via your configured HTTP service

---

## 三、截图方案

需提供至少 1 张 1280×800 或 640×400 截图。

建议 4 张截图（无需文字标注，用实际功能界面）：

| # | 中文说明 | English Description |
|---|---------|-------------------|
| 1 | 阅读界面：EPUB 书籍全屏阅读 | Reading view: full EPUB page |
| 2 | 翻译功能：选中文字显示翻译结果 | Translation: selected text with translation result |
| 3 | TTS 设置：选择语音和语速 | TTS settings: voice selection and speed control |
| 4 | 书库管理：书籍列表页面 | Library: book collection view |

生成方法：在电脑打开扩展页面 → Chrome DevTools 的「截取完整节点」功能 → 裁剪到 1280×800。

---

## 四、Promotional Tiles

不需要额外设计，Chrome 网上应用店会自动从 128px 图标生成小图。

---

## 五、隐私政策 URL

由于本扩展**不收集任何用户数据**，可以使用以下简化声明：

> 本扩展不收集、不存储、不传输任何个人数据。所有书籍文件、书签、高亮和设置数据仅存储在您浏览器的 IndexedDB 和 localStorage 中，完全离线运行。翻译和 TTS 功能需要外部 API 服务，您自行配置的 API Key 仅存储在您的浏览器中。

或者直接提供一个指向 GitHub 仓库的链接。

建议：在 GitHub 仓库根目录创建 `PRIVACY.md`，内容就是上面的声明。然后在这里填写 URL：
`https://github.com/gzmliang/moreader/blob/main/PRIVACY.md`

---

## 六、Chrome Web Store 上架步骤

1. 访问 https://chrome.google.com/webstore/devconsole
2. 使用 Google 账号登录 → 点击 "Publish" 旁的 "+ New item"
3. 上传 ZIP 包
4. 填写上述信息
5. 上传截图（最小 1280×800，最大 1280×800）
6. 支付一次性注册费 $5（如未注册过开发者账号）
7. 提交审核（通常 1-3 个工作日）

---

## 七、需要准备的素材清单

- [ ] 打包好的 ZIP（manifest 已改为零权限，版本号 2.3.3）
- [ ] 1280×800 截图 × 4 张
- [ ] 128×128 图标（已有）
- [ ] 隐私政策页面（PRIVACY.md 在 GitHub 上）
- [ ] 开发者账号（一次性 $5）
