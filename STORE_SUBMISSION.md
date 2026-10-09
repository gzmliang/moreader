# MoReader — Chrome Web Store 上架物料 (v2.10.3)

> **本次（v2.10.3）为功能与稳定性正式版**，清单见第六节。
>
> 以下两大合规修复自 v2.10.0 起持续生效，提审时务必保持：
> 1. **Yellow Argon / Yellow Nickel（关键字垃圾内容）**：详细说明中彻底移除 "Who Is MoReader For?" 受众定向段落与重复关键词堆砌，改为纯功能描述。
> 2. **明文 HTTP 传输（Data transmitting over HTTP）**：语音节点全链路 HTTPS，`host_permissions` 收窄，历史明文配置自动迁移。

---

## 一、基础信息 (Store Metadata)

| 字段 | English Value（默认主语言 / Default） | 中文值（添加中文语言时填写） |
|------|--------------------------------------|------------------------------|
| **名称 (Name)** | **MoReader - EPUB & PDF Reader** *(28 字符，上限 45)* | **墨阅 MoReader — EPUB/PDF 智能阅读器** |
| **简称 (Short Name)** | **MoReader** | **MoReader** |
| **版本 (Version)** | **2.10.3** | **2.10.3** |
| **摘要说明 (Summary)** | **Read EPUB and PDF books with read-aloud narration, sentence highlighting, bilingual view and chapter summaries.** *(111 字符，上限 132)* | **支持朗读听书的 EPUB / PDF 阅读器：句子级声画同步、双语对照、章节精读与 WebDAV 云同步。** |
| **类别 (Category)** | Productivity（生产力） | 生产力 / 辅助工具 |
| **默认语言 (Default Language)** | **English (en)** | — |

> ⚠️ **名称一致性红线**：商店后台的「名称」字段必须与 `manifest.json` 中的 `name` 完全一致（**MoReader - EPUB & PDF Reader**）。旧版商店名称为 `MoReader - EPUB Reader`，本次必须同步修改，否则会被判定为元数据不一致。

---

## 二、详细说明 (Store Description)

> ⚠️ 商店后台默认语言为 **English (en)** 时，粘贴 `store_description_en.txt` 全文；中文版仅在「添加语言 → 中文(简体)」后单独填写，**切勿中英混填同一个输入框**。

- 🇺🇸 英文详细说明：见 `store_description_en.txt`（本目录）
- 🇨🇳 中文详细说明：见 `store_description_zh.txt`（本目录）

### 本次从描述中移除的违规内容（务必不要再加回来）

以下段落曾被判定为「关键字垃圾内容」，**永久删除，不得再出现**：

```
Who Is MoReader For?
• Language Learners & ESL Students: ...
• Literature Lovers & Students: ...
• Researchers & Avid Readers: ...
```

同时避免在详细说明、截图、宣传图中堆叠 `ESL`、`language learners`、`students`、`researchers` 等受众定向关键词。

---

## 三、版本更新说明 (What's New in v2.10.1)

- 🇺🇸 English：见 `whats_new_en.txt`
- 🇨🇳 中文：见 `whats_new_zh.txt`

---

## 四、提审自查清单 (Pre-submission Checklist)

### 元数据合规
- [ ] 商店后台「名称」= `MoReader - EPUB & PDF Reader`（与 manifest 完全一致）
- [ ] 商店后台「摘要」= `manifest_summary.txt` 内容（111 字符）
- [ ] 详细说明粘贴 `store_description_en.txt`，**不含** "Who Is MoReader For?" 段落
- [ ] 「新增内容 / What's New」粘贴 `whats_new_en.txt`
- [ ] 截图与宣传图中无受众定向关键词堆砌

### 安全合规
- [ ] 上传包 = `moreader-v2.10.2-chromestore-release.zip`
- [ ] `manifest.json` → `host_permissions` 无 `http://*/*`（仅 HTTPS + localhost/127.0.0.1）
- [ ] `manifest.json` → `version` = `2.10.2`
- [ ] 隐私权说明与 host_permissions 一致：仅在与用户配置的语音/同步服务器通信时传输数据，且全程 HTTPS

---

## 五、代码层合规修复明细 (v2.10.0)

| 位置 | 修复前 | 修复后 |
|------|--------|--------|
| `ext/manifest.json` | `host_permissions` 含 `http://*/*` | `https://*/*` + `http://localhost/*` + `http://127.0.0.1/*` |
| `src/stores/ttsStore.ts` | 默认节点 `http://p-plus.duckdns.org:5001` | `https://liang-studio.duckdns.org/edge-tts` |
| `src/stores/ttsStore.ts` | 3 组备用明文节点 | 仅官方 HTTPS 节点 |
| `src/stores/syncStore.ts` | AList 预设 `http://p-plus.duckdns.org:6355/dav` | 预设清空，由用户填写自建服务 |
| `src/components/*` | 占位符/默认值含明文地址 | 全部改为 HTTPS |
| `src/i18n/locales/*` | 提示文案含明文示例 | 改为 HTTPS 或内网示例 |
| `src/services/llm.ts` | 带端口即补 `http://` | 仅内网补 `http://`，公网一律 `https://` |
| **新增** `src/utils/secureUrl.ts` | — | 统一安全化：旧明文节点迁移 + 公网 http 强制升级 https + 内网地址放行 |

---

## 六、v2.10.1 本次上线明细（功能与稳定性正式版）

| 主题 | 修复前 | 修复后 |
|------|--------|--------|
| **句子高亮与语音不同尺** | 高亮拿「洗净文本偏移」去数「原始 DOM 字符」，两套坐标不等长 → 绿条漂移 / 某句不亮 | `getCleanTextWithMap()` 建立「清洗字符 → DOM 落点」地图，每句现算现用；回退路径保底不劣化（`tests/cleanTextMapHighlight.test.ts`、整本书体检工具 `tests/_audit-book-highlight.test.ts`） |
| **偶发两份声音** | 异步合成的音频回来时无人校验“这份还算不算”，取消/暂停后迟到音频照样开声；划词朗读甚至没有领号 | 播放入口统一领号（`currentPlaySessionId`），回来先对号，号不对即丢弃；所有朗读入口（播放键 / 点段落 / 划词朗读 / 全章）走同一道闸门 |
| **等待无提示** | 首次合成需 5~10 秒，界面一片安静，用户误以为卡住并反复点击 | 居中弹窗 **Generating audio, please wait…**（>0.6s 才显示、避免一闪而过）+ ⏹ 取消；`onplaying` 与 250ms 保底都收掉标志（`tests/ttsGeneratingFlag.test.ts`） |
| **超长段落等待久** | 一次请求整段 2000~6000 字，合成 10~50 秒，词时间戳响应头过大还会撞网关 | `TTS_CHUNK_MAX_CHARS` 分块流水线：边播边预取下一块，块内坐标 + offset 换算回段落坐标（`tests/ttsChunk.test.ts`） |
| **目录只列顶层** | epub.js `book.navigation` 只给顶层条目（一千零一夜 101 条 → 只显示 18 条） | 自研 `src/utils/epubToc.ts` 直读 NCX，拍平并带 `level` 缩进；条目更多才采用（只做加法） |
| **翻译面板遮挡原文** | 结果面板钉在屏幕底部，遮挡划词 | `src/utils/panelPlacement.ts` 计算：优先划词下方 12px，空间不足翻到上方，水平夹在视口内，且与划词零重叠 |
