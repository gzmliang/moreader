# MoReader — Chrome Web Store 上架物料 (v2.10.6)

> **本次（v2.10.6）为「云同步设置保存」修复正式版**，核心解决：
> 用户关闭浏览器标签后，Cloud Sync 里填好的 WebDAV 地址 / 账号 / 密码 / 目录全部丢失，下次打开又得重填一次。
>
> 以下两大合规修复自 v2.10.0 起持续生效，提审时务必保持：
> 1. **Yellow Argon / Yellow Nickel（关键字垃圾内容）**：详细说明中彻底移除 "Who Is MoReader For?" 受众定向段落与重复关键词堆砌，改为纯功能描述。
> 2. **明文 HTTP 传输（Data transmitting over HTTP）**：语音节点全链路 HTTPS，`host_permissions` 收窄（`https://*/*` + `http://localhost/*` + `http://127.0.0.1/*`）。
>    ⚠️ WebDAV 用户自填地址不再被强制改写为 https，但默认/示例值仍为 HTTPS，`host_permissions` 也不含 `http://*/*`。

---

## 一、基础信息 (Store Metadata)

| 字段 | English Value（默认主语言 / Default） | 中文值（添加中文语言时填写） |
|------|--------------------------------------|------------------------------|
| **名称 (Name)** | **MoReader - EPUB & PDF Reader** *(28 字符，上限 45)* | **墨阅 MoReader — EPUB/PDF 智能阅读器** |
| **简称 (Short Name)** | **MoReader** | **MoReader** |
| **版本 (Version)** | **2.10.6** | **2.10.6** |
| **摘要说明 (Summary)** | **Read EPUB and PDF books with read-aloud narration, sentence highlighting, bilingual view and chapter summaries.** *(111 字符，上限 132)* | **支持朗读听书的 EPUB / PDF 阅读器：句子级声画同步、双语对照、章节精读与 WebDAV 云同步。** |
| **类别 (Category)** | Productivity（生产力） | 生产力 / 辅助工具 |
| **默认语言 (Default Language)** | **English (en)** | — |

> ⚠️ **名称一致性红线**：商店后台的「名称」字段必须与 `manifest.json` 中的 `name` 完全一致（**MoReader - Epub & PDF Reader** 按 manifest 原样：`MoReader - EPUB & PDF Reader`）。
> ⚠️ **版本一致性红线**：商店后台版本号必须等于 `manifest.json` 的 `2.10.6`。

---

## 二、详细说明 (Store Description)

> ⚠️ 商店后台默认语言为 **English (en)** 时，粘贴 `store_description_en.txt` 全文；中文版仅在「添加语言 → 中文(简体)」后单独填写，**切勿中英混填同一个输入框**。

- 🇺🇸 英文详细说明：见 `store_description_en.txt`（本目录）
- 🇨🇳 中文详细说明：见 `store_description_zh.txt`（本目录）

### 描述中永久不得再出现的内容

```
Who Is MoReader For?
• Language Learners & ESL Students: ...
• Literature Learners & Students: ...
• Researchers & Avid Readers: ...
```

同时避免在详细说明、截图、宣传图中堆叠 `ESL`、`language learners`、`students`、`researchers` 等受众定向关键词；
格式名枚举（txt / Markdown / EPUB / PDF）在同一段内出现 ≥3 次即会被机检判为关键词堆砌。

---

## 三、版本更新说明 (What's New in v2.10.6)

- 🇺🇸 English：见 `whats_new_en.txt`
- 🇨🇳 中文：见 `whats_new_zh.txt`

---

## 四、提审自查清单 (Pre-submission Checklist)

### 元数据合规
- [ ] 商店后台「名称」= `MoReader - EPUB & PDF Reader`（与 manifest 完全一致）
- [ ] 商店后台「摘要」= `manifest_summary.txt` 内容（111 字符）
- [ ] 详细说明粘贴 `store_description_en.txt`，**不含** "Who Is MoReader For?" 段落与格式名堆砌
- [ ] 「新增内容 / What's New」粘贴 `whats_new_en.txt`（**不要再写进商品说明正文**，否则构成冗余元数据）
- [ ] 截图与宣传图中无受众定向关键词堆砌

### 包与代码合规
- [ ] 上传包 = `moreader-v2.10.6-chromestore-release.zip`（1,090,322 字节）
- [ ] `manifest.json` → `version` = `2.10.6`
- [ ] `manifest.json` → `host_permissions` 无 `http://*/*`（仅 `https://*/*` + `http://localhost/*` + `http://127.0.0.1/*`）
- [ ] `manifest.json` → `name` 与商店后台名称一致
- [ ] 源码扫描 `grep -rn "http://" src/` 无自家明文域名残留（仅 `secureUrl.ts` 内的历史旧主机名常量，纯字符串比对不产生请求）
- [ ] 隐私权说明与 host_permissions 一致

---

## 五、交付路径

| 用途 | 地址 |
|------|------|
| 🏪 Chrome 商店上传包 | `/root/projects/moreader-web-ext/moreader-v2.10.6-chromestore-release.zip` |
| 📦 本地加载解压目录 | `/root/projects/moreader-web-ext/dist-ext/` |
| 🔗 内网下载 | http://192.168.199.166:5244/media/swapfiles/moreader-v2.10.6-chromestore-release.zip |
| 🔗 外网下载 | http://p-plus.duckdns.org:6355/media/swapfiles/moreader-v2.10.6-chromestore-release.zip |
| 🔗 商店链接 | https://chromewebstore.google.com/detail/gkhkkojmgcobdlpijepiigecpglmnedh |

---

## 六、v2.10.6 本次上线明细

| 主题 | 修复前 | 修复后 |
|------|--------|--------|
| **云同步设置保存后丢失（本次核心）** | `loadConfig()` 里有一段历史合规迁移逻辑，只要 URL 含 `p-plus.duckdns.org` / `powerplus.blogsyte.com` 就强制把 url 抹空、`verified=false` → 用户自建 AList（6355 端口）每次重新打开都被清空，又要重填一遍 | 彻底删除该误杀逻辑，用户自定义 WebDAV 配置（地址 / 账号 / 密码 / 目录）一律原样加载 |
| **输入不落盘** | 只有「连接探测成功」才保存；输入过程中关标签页内容全丢 | `watch` 监听 `url/username/password/dir/preset`，任一变动即刻写入 `localStorage`，关标签、刷新浏览器都不丢 |
| **自建 HTTP 服务被改成 HTTPS** | `getRootUrl()` 调 `secureUrl()`，公网 `http://` 被强制升级为 `https://` → 自建 AList 6355 端口的 HTTP 服务 SSL 握手失败 | WebDAV 地址按用户填写原样使用，尊重用户自建部署；TTS 语音节点仍保持官方 HTTPS 不变 |
| **已验证状态掉失** | `resetVerifyState()` 与 `verified` 落盘各写一套，易出现状态与配置不一致 | 统一走 `saveConfig()`，重新打开标签页后「已就绪」状态与云端书库列表均正确恢复 |

### 相关回归测试（已全绿）
- `tests/sync-verify.test.ts` ④b：修改配置字段即刻自动保存，模拟关闭标签重新打开后 url / username / password / dir 全部还原
- `tests/secureTransport.test.ts` ⑩：用户自定义 WebDAV 配置与 `verified` 完整持久化，重新加载不被清空
- 全量 134 个用例通过（25 个测试文件）
