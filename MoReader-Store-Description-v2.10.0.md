# MoReader v2.10.0 - Chrome Web Store Submission Guide

> ⚠️ **English 文案以 `MoReader-v2.10.0-English-Listing.md`（同步落盘至 `store_description_en.txt` / `whats_new_en.txt`）为准**；下方 PART 1 的英文段落是初稿，粘贴时请用上述新文件，避免两版混用。

> 本版两大合规修复：
> 1. **Yellow Argon / Yellow Nickel（关键字垃圾内容）**：详细说明已彻底移除受众定向段落与重复关键词堆砌。
> 2. **数据安全（明文 HTTP 传输）**：语音节点全链路 HTTPS，明文权限已收窄，历史配置自动迁移。

## 基础信息

| 字段 | 值 |
|------|-----|
| 名称 | `MoReader - EPUB & PDF Reader`（28 字符，必须与 manifest 一致） |
| 摘要 | `Read EPUB and PDF books with read-aloud narration, sentence highlighting, bilingual view and chapter summaries.`（111 字符） |
| 版本 | `2.10.0` |
| 上传包 | `moreader-v2.10.0-chromestore-release.zip` |

---

# PART 1: English Detailed Description (Directly Copy Below)

MoReader is a clean, privacy-focused EPUB and PDF reader for Chrome. Open your books in a comfortable, customizable reading view with read-aloud narration, synchronized sentence highlighting, bilingual reading modes and chapter summaries. No account required.

READING
- Customizable typography: font family, size, line spacing, margins and letter spacing.
- Phonetic annotations: Pinyin and Furigana ruby text render aligned above the characters.
- Four reading themes: light, sepia, eye-care green and dark.
- Books, reading progress, bookmarks and notes are stored locally in your browser.

PDF
- Open PDFs in their original layout with zoom, fit-to-page and smooth scrolling.
- Image-based and scanned PDFs render correctly, including textbooks and older documents.
- Select any text to listen to it or translate it.
- Convert a PDF into a clean, reflowable EPUB for comfortable reading and listening.

READ ALOUD
- Highlights the current paragraph while illuminating the sentence being spoken.
- Choose from browser voices or neural cloud voices, with adjustable speed from 0.5x to 2.0x.
- Cleans phonetic ruby, brackets and citation notes before speaking.
- Works without a network using the browser's built-in speech engine.

READING TOOLS
- Chapter summaries at selectable depth.
- Bilingual, original-only or translation-only views.
- Character relationship maps and plot timelines.
- Chapter review questions with explanations.
- Export notes and summaries as EPUB or PDF.
- Generated content is cached locally for instant access.

CLOUD SYNC (OPTIONAL)
- Synchronize reading progress, bookmarks and highlights over WebDAV (Nextcloud, Nutstore or your own server).
- All network transfers use HTTPS. Your library and reading history stay under your control.

Install MoReader for a focused, comfortable reading and listening experience.

Note: narration uses your browser's built-in speech engine by default, which works offline. An optional cloud narration endpoint can be configured in settings.

---

## 中文详细说明（仅在「添加语言 → 中文(简体)」时填写，切勿与英文混填同一输入框）

MoReader（墨阅）是一款典雅、隐私优先的 EPUB 与 PDF 阅读器。打开书籍即可享受可自定义的舒适阅读界面，支持智能朗读、句子级声画同步高亮、双语阅读与章节精读。无需注册。

阅读
- 可自定义排版：字体、字号、行距、页边距与字距。
- 注音支持：拼音与振假名注音与文字上下对齐渲染。
- 四种阅读主题：浅色、羊皮纸、护眼绿与深色。
- 书籍、阅读进度、书签与笔记均保存在浏览器本地。

PDF
- 支持 PDF 原版排版阅读，可缩放、整页自适应与平滑滚动。
- 支持图片型与扫描版 PDF，教材与旧文档均可正常渲染。
- 选中任意文字即可朗读或翻译。
- 可将 PDF 转换为排版清爽、可重排的 EPUB，方便阅读与听书。

朗读
- 朗读时高亮当前段落，并逐句点亮正在朗读的句子。
- 可选浏览器内置音色或云端神经音色，速度可在 0.5x 至 2.0x 之间调节。
- 朗读前自动清洗注音标签、括号与脚注引用。
- 使用浏览器内置语音引擎时，断网也能朗读。

阅读工具
- 按需选择篇幅的章节摘要。
- 双语对照、仅原著语言、仅目标语言三种阅读模式。
- 人物关系图谱与情节时间线。
- 章节自测题并附解析。
- 笔记与摘要可导出为 EPUB 或 PDF。
- 生成内容本地缓存，再次查看无需等待。

云同步（可选）
- 通过 WebDAV 同步阅读进度、书签与高亮（坚果云、Nextcloud 或您自建的服务器）。
- 所有网络传输均使用 HTTPS 加密，书库与阅读记录完全由您掌控。

安装 MoReader，开启专注、舒适的阅读与听书体验。

说明：朗读默认使用浏览器内置语音引擎，可离线工作；如需云端朗读，可在设置中自行配置服务地址。

---

# PART 2: Version Notes (What's New Box)

【What's New in MoReader v2.10.0】
• Security upgrade: All cloud narration and cloud sync requests now use HTTPS encrypted transport.
• Existing configurations pointing to the previous plain-HTTP server are migrated automatically, no re-entry needed.
• Local network (LAN) addresses keep working unchanged for self-hosted setups.
• Minor stability and reliability fixes.

【墨阅 MoReader v2.10.0 更新说明】
• 安全升级：云端朗读与云同步请求全部改用 HTTPS 加密传输。
• 已保存的旧明文服务地址自动平滑迁移，无需手动重填。
• 局域网自建服务保持原样可用。
• 若干稳定性与可靠性修复。
