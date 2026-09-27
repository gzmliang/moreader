# 墨阅 (MoReader) 逐句双语对照阅读与双语书籍导出系统技术规范 (v2.9.5)

## 1. 项目愿景与设计理念
在原著阅读中实现“心流零阻力”与“在阅读中精通外语”。
读者阅读外文书籍时，无需反复划词或离开当前视线，每句英文下方紧跟一句优雅的译文（形式 A：逐句紧贴对照），同时保持 TTS 声画同步朗读、无损恢复、零门槛免 Key 翻译，并支持一键将任何 EPUB 转换为随身携带的双语对照 EPUB 电子书。

---

## 2. 核心系统架构

### 2.1 模块职责划分
1. **翻译引擎层 (`src/stores/bilingualStore.ts` & `src/utils/freeTranslator.ts`)**:
   - 提供多源翻译适配器：Google 免 Key 公开 Web 接口（默认）、Bing 免 Key 接口、Chrome Built-in AI (Gemini Nano)、用户自定义 AI 大模型 (DeepSeek / Gemini / OpenAI)。
   - 句子级批量聚合翻译与重试机制（避免高频发散请求）。
   - 本地持久化缓存 (`bilingualCache` via `localforage`，书+章节+语言三元组唯一键，0 流量秒开）。
2. **DOM 双语渲染与样式层 (`src/components/Reader.vue` & `EpubWebView`)**:
   - 利用 `splitIntoSentences` 严格切分原始段落为句子单元。
   - 注入 `<span class="moreader-bilingual-pair"><span class="moreader-bilingual-orig">...</span><span class="moreader-bilingual-trans">...</span></span>`。
   - 动态 CSS 注入：自适应白天/暗黑模式字号、行距与透明度。
   - 一键还原机制：关闭双语模式时瞬时清空译文节点并 `normalize()` 恢复原始阅读 DOM。
3. **TTS 声画高亮免疫隔离层 (`src/stores/ttsStore.ts`)**:
   - `getCleanText(el)` 严格过滤 `.moreader-bilingual-trans`，朗读引擎 100% 只读原文。
   - 句子级高亮 `.tts-sentence-hl` 仅作用于原文节点，声画同步与发音时间轴丝毫不乱。
4. **全书双语重构与导出引擎 (`src/utils/bilingualExporter.ts`)**:
   - 读取全书 Spine 章节 XML。
   - 异步队列批量翻译章节内容并显示实时进度弹窗（包含取消机制）。
   - 注入 `moreader-bilingual.css` 与双语 HTML 结构，使用 `JSZip` 打包并触发浏览器下载。

---

## 3. 数据流与时序设计

### 3.1 章节双语渲染时序
```text
用户点击【🌐 双语】开关
  │
  ├──> 检查当前章节缓存 (bilingualDb)
  │      ├── 已缓存: 读取本地译文数组 (0ms)
  │      └── 未缓存: 提取可见段落文本 -> splitIntoSentences -> 批量请求免Key翻译接口 -> 写入缓存
  │
  ├──> 在当前 iframe DOM 中执行无损替换:
  │      将段落每个句子包装为 .moreader-bilingual-pair
  │      在句子下方挂载 .moreader-bilingual-trans 译文元素
  │
  └──> 记录偏好状态至 localStorage (当前书籍记忆)
```

### 3.2 双语 EPUB 导出时序
```text
点击【📦 制作双语书籍】
  │
  ├──> 呼出模态进度弹窗（显示章节数与进度条）
  ├──> 遍历 book.spine.items 章节列表
  │      ├── 读取章节原始 XHTML
  │      ├── 提取文本段落与句子
  │      ├── 批量翻译（带并发限制与降速保护）
  │      └── 替换为双语结构并重写 DOM
  ├──> 注入 bilingual.css 与 OPF manifest 项
  └──> JSZip 组装压缩包，触发下载 《[书名]_双语精读版.epub》
```

---

## 4. 健壮性与红线守则
1. **零硬编码中文**：所有 UI 文本（按钮、选项、提示、进度）统一提取至 `src/i18n/locales/*.ts`。
2. **零破坏既有逻辑**：TTS、书签、高亮、划词查词完全免疫并正常工作。
3. **网络故障兜底**：若免费接口发生频率限制或超时，自动切换备用接口或平滑提示，绝不导致页面白屏。
