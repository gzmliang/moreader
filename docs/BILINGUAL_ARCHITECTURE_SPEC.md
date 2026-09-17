# 墨阅 (MoReader) & 读伴 (ReadMate) 逐句双语对照与全书双语导出架构设计手册

> **文档定位**：记录 MoReader v2.9.5 逐句双语阅读、免 Key 免费翻译源通道、多语言体系与双语 EPUB 导出的核心架构方案，作为后续 **读伴 (ReadMate) 升级双语网页阅读与有声对照** 的标准技术指引。

---

## 🌟 一、核心架构与技术全景

本系统基于 **“学习精读优先、0门槛开箱即用、视听双绝联动、无损还原排版”** 四大核心设计原则：

```
                    ┌───────────────────────────────┐
                    │      原著正文 (DOM / EPUB)     │
                    └──────────────┬────────────────┘
                                   │
                           [ 逐句智能切分 ]
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
    ┌──────────────────────┐                ┌──────────────────────┐
    │  通道 A: 免 Key 免费源 │                │ 通道 B: 自定义 AI LLM │
    │  (Google/Bing 双通道) │                │ (DeepSeek/OpenAI等)  │
    │  熔断降级 + 指数退避   │                │ 上下文文学意境润色    │
    └──────────┬───────────┘                └──────────┬───────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   │ 拿到等长译文数组
                                   ▼
                      ┌─────────────────────────┐
                      │    双语结构重构 (形式 A)   │
                      │ 英文在上(大) · 中文在下(小)│
                      └────────────┬────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
 ┌─────────────────────┐                       ┌─────────────────────┐
 │  前端即时渲染与朗读 │                       │ 一键导出双语 EPUB   │
 │ • 声画同步只读原文  │                       │ • 全书 / 按需选章   │
 │ • 译文标签自动过滤  │                       │ • 写入行内+CSS样式  │
 │ • 本地数据库秒开缓存│                       │ • 兼容微信读书/Kindle│
 └─────────────────────┘                       └─────────────────────┘
```

---

## 🛠️ 二、核心模块实现细节 (ReadMate 移植指南)

### 1. 免 Key 免费翻译引擎与熔断防线 (`freeTranslator.ts`)

#### 核心防坑经验：
* **千万不要用 `client=gtx`**：Google 目前对 `client=gtx` 实施严格的风控拦截（极易返回 429 或验证码）。
* **必须使用官方词典客户端标识**：`client=dict-chrome-ex`，实测稳定不触发 429 拦截。
* **智能熔断（Circuit Breaker）**：遇到网络超时后立即标记为不可用（60 秒熔断），避免后续章节/段落反复傻等。

#### 核心代码实现：
```typescript
const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single'
let isGoogleReachable: boolean | null = null
let lastGoogleCheckTime = 0

export async function translateSentenceBatch(
  sentences: string[],
  targetLang: string = 'zh-CN',
  fromLang: string = 'auto'
): Promise<string[]> {
  if (!sentences || sentences.length === 0) return []
  
  // 1. 分块（单批次控制在 10 句或 1000 字符内，并发控制为 2）
  // 2. 构造查询：
  const textToTranslate = sentences.join('\n')
  const params = new URLSearchParams({
    client: 'dict-chrome-ex',
    dt: 't',
    dj: '1',
    ie: 'UTF-8',
    sl: fromLang,
    tl: targetLang,
    q: textToTranslate,
  })

  // 3. 解析返回结果并按 \n 严格对齐等长数组
  const response = await fetchWithTimeout(`${GOOGLE_URL}?${params.toString()}`, { method: 'GET' }, 3500)
  const data = await response.json()
  const returnedSentences = data?.sentences || []
  
  const translations: string[] = []
  let currentTrans = ''
  for (const item of returnedSentences) {
    const orig = item.orig || ''
    const trans = item.trans || ''
    currentTrans += trans
    if (orig.includes('\n')) {
      const parts = currentTrans.split('\n')
      while (parts.length > 1) {
        translations.push(parts.shift()!.trim())
      }
      currentTrans = parts[0] || ''
    }
  }
  if (currentTrans.trim().length > 0 || translations.length < sentences.length) {
    translations.push(currentTrans.trim())
  }
  return translations
}
```

---

### 2. 形式 A 逐句紧贴排版规范 (HTML + CSS)

#### 视觉呈现规范：
* **原文**：保留原字号、原粗细、正常行高 (`line-height: 1.7`)；
* **译文**：紧贴在正下方，字号缩小为 `0.88em`，透明度 `0.75`，微灰低调颜色（暗色模式自适应），行高 `1.55`。

#### DOM 注入结构（导出时行内样式 + class 双重保底）：
```html
<p>
  <span class="moreader-bilingual-pair" style="display: block; margin-bottom: 0.65em; text-indent: 0 !important;">
    <span class="moreader-bilingual-orig" style="display: block; line-height: 1.7;">It was the best of times, it was the worst of times.</span>
    <span class="moreader-bilingual-trans" style="display: block; font-size: 0.88em; line-height: 1.55; opacity: 0.75; margin-top: 0.22em; color: #555555;">那是最好的时代，也是最坏的时代。</span>
  </span>
</p>
```

#### 关键 CSS 样式：
```css
.moreader-bilingual-pair {
  display: block !important;
  margin-bottom: 0.65em !important;
  text-indent: 0 !important;
}
.moreader-bilingual-orig {
  display: block !important;
  line-height: 1.7 !important;
}
.moreader-bilingual-trans {
  display: block !important;
  font-size: 0.88em !important;
  line-height: 1.55 !important;
  opacity: 0.75 !important;
  margin-top: 0.22em !important;
  font-style: normal !important;
  color: #555555 !important;
}
@media (prefers-color-scheme: dark) {
  .moreader-bilingual-trans {
    color: #aaaaaa !important;
  }
}
```

---

### 3. TTS 声画同步兼容技巧（视听双绝）

在 ReadMate 与 MoReader 中，当开启双语对照时，**语音朗读引擎绝不能朗读中文译文**：
1. **TTS 提取文本过滤**：
   ```typescript
   // 朗读时克隆段落节点，剔除所有的译文元素
   const clone = element.cloneNode(true) as HTMLElement
   clone.querySelectorAll('.moreader-bilingual-trans').forEach(el => el.remove())
   const textToSpeak = clone.textContent || ''
   ```
2. **声画高亮同步**：
   TTS 高亮聚焦在 `.moreader-bilingual-orig` 或其父级 `.moreader-bilingual-pair`，读到哪一句，哪一句大字高亮，下方的译文安静跟随。

---

### 4. 全球语言分类与智能记忆偏好

* **常用热门语言 (Popular)**：置顶快捷选择（简中、繁中、英、日、韩、法、德、西、俄、葡）；
* **全球更多语言 (More)**：30+ 全球小语种标准映射；
* **持久化**：用户选择后写入本地存储（`localStorage`），后续操作自动预设，无需重复选择。

---

### 5. 按需选章极速导出 EPUB

* **痛点**：全书 100 章转换很慢（需几分钟）。
* **解法**：通过 `JSZip` 扫描 `content.opf` 的 `spine` 列表，提供 **全书 / 当前正在阅读的章节 / 自定义多选** 三种范围。
* **极速效果**：单章转换仅需 **1~3 秒**，直接产出 `书名_[Ch.1_Bilingual].epub`。

---

## 🚀 三、后续 ReadMate 升级双语功能路线图

1. **沉浸净读模式下注入双语胶囊**：点击顶栏【🌐 双语】，自动将提取出来的网页文章段落逐句翻译并紧贴渲染；
2. **划词弹窗新增双语对照复制**：一键复制「英文原句 + 中文译句」；
3. **网页离线导出双语 EPUB / Markdown**：将长篇深度文章一键保存为双语对照 EPUB 放入墨阅或阅读器。
