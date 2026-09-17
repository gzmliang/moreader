import JSZip from 'jszip'
import { splitIntoSentences } from '@/stores/ttsStore'
import { translateSentenceBatch } from '@/utils/freeTranslator'
import { translateSentenceBatchWithLLM } from '@/utils/aiTranslator'
import type { LLMConfig } from '@/types/book'

const BILINGUAL_CSS = `
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
`

const INLINE_PAIR_STYLE = 'display: block; margin-bottom: 0.65em; text-indent: 0 !important;'
const INLINE_ORIG_STYLE = 'display: block; line-height: 1.7;'
const INLINE_TRANS_STYLE = 'display: block; font-size: 0.88em; line-height: 1.55; opacity: 0.75; margin-top: 0.22em; color: #555555;'

export interface ExportProgress {
  currentChapter: number
  totalChapters: number
  chapterName: string
  percent: number
  statusMessage?: string
}

export interface BilingualExportResult {
  blob: Blob
  totalChapters: number
  totalSentences: number
}

/**
 * 提取文档中所有可翻译的段落（兼容 p, h1-h6, blockquote, li 以及某些排版中的文本 div，支持全球全语言）
 */
function extractTranslatableParas(doc: Document): HTMLElement[] {
  let paras = Array.from(
    doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li')
  ).filter((p) => {
    const text = p.textContent?.trim() || ''
    return text.length >= 2 && /\p{L}|\p{N}/u.test(text)
  }) as HTMLElement[]

  // 若常规段落标签过少，向下兼容扫描排版中直接包裹文本的 leaf div
  if (paras.length === 0) {
    const divs = Array.from(doc.body.querySelectorAll('div')).filter((d) => {
      const hasBlockChild = d.querySelector('p, div, h1, h2, h3, h4, h5, h6')
      const text = d.textContent?.trim() || ''
      return !hasBlockChild && text.length >= 2 && /\p{L}|\p{N}/u.test(text)
    }) as HTMLElement[]
    paras = divs
  }

  return paras
}

/**
 * 修复 XHTML 序列化后可能残留的 XML 声明注释或重复 xmlns 命名空间
 */
function cleanXhtmlOutput(raw: string): string {
  let res = raw
  // 恢复被 DOMParser 误变为注释的 XML 头
  res = res.replace(/<!--\?xml\s+version=['"][^'"]+['"]\s*(encoding=['"][^'"]+['"])?\s*\?-->/gi, '')
  // 去除重复的 xmlns
  res = res.replace(/(xmlns="http:\/\/www\.w3\.org\/1999\/xhtml")\s+xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/gi, '$1')
  // 去除可能已有的 xml 声明头
  res = res.replace(/^<\?xml[^>]*\?>\s*/i, '')
  // 规范化 DOCTYPE，避免重复
  if (!res.toLowerCase().startsWith('<!doctype html>')) {
    res = `<!DOCTYPE html>\n${res}`
  }
  return `<?xml version="1.0" encoding="utf-8"?>\n${res}`
}

/**
 * 将整本 EPUB 转换为并导出为中英逐句双语对照 EPUB 电子书
 */
export async function exportBilingualEpub(
  arrayBuffer: ArrayBuffer | Uint8Array,
  bookTitle: string,
  targetLang: string = 'zh-CN',
  engine: 'google_free' | 'ai' = 'google_free',
  llmConfig?: LLMConfig,
  onProgress?: (progress: ExportProgress) => void,
  isCancelled?: () => boolean
): Promise<BilingualExportResult | null> {
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. 查找 container.xml 定位 OPF
  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('Invalid EPUB: META-INF/container.xml missing')

  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml')
  const opfPath =
    containerDoc.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf'
  const opfDir = opfPath.includes('/') ? opfPath.replace(/[/][^/]+$/, '') : ''

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`)

  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml')

  // 获取 spine items 列表
  const itemMap = new Map<string, string>()
  const cssHrefs: string[] = []

  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    const mediaType = item.getAttribute('media-type')
    if (id && href) {
      itemMap.set(id, href)
      if (mediaType === 'text/css' || href.endsWith('.css')) {
        cssHrefs.push(href)
      }
    }
  })

  const spineHrefs: string[] = []
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref')
    if (idref && itemMap.has(idref)) {
      spineHrefs.push(itemMap.get(idref)!)
    }
  })

  const totalChapters = spineHrefs.length
  let totalSentencesCount = 0
  let totalFoundSentences = 0

  // 2. 将双语 CSS 样式追加写入已有的样式表文件中（增强跨阅读器兼容性）
  for (const cssRel of cssHrefs) {
    const fullCssPath = opfDir ? `${opfDir}/${cssRel}` : cssRel
    const cssFile = zip.file(fullCssPath)
    if (cssFile) {
      try {
        const oldCss = await cssFile.async('string')
        zip.file(fullCssPath, `${oldCss}\n\n/* Moreader Bilingual Styles */\n${BILINGUAL_CSS}`)
      } catch (e) {
        console.warn('Failed to append CSS to', fullCssPath, e)
      }
    }
  }

  // 3. 逐章翻译并重组 HTML
  for (let cIdx = 0; cIdx < spineHrefs.length; cIdx++) {
    if (isCancelled && isCancelled()) return null

    const rawHref = spineHrefs[cIdx]
    const fullPath = opfDir ? `${opfDir}/${rawHref}` : rawHref
    const chapterFile = zip.file(fullPath)
    if (!chapterFile) continue

    const chapterHtml = await chapterFile.async('string')
    const doc = new DOMParser().parseFromString(chapterHtml, 'text/html')

    const chapterShortName = rawHref.split('/').pop() || `Chapter ${cIdx + 1}`

    if (onProgress) {
      onProgress({
        currentChapter: cIdx + 1,
        totalChapters,
        chapterName: chapterShortName,
        percent: Math.round((cIdx / totalChapters) * 100),
      })
    }

    // 收集所有有效段落并切句
    const paras = extractTranslatableParas(doc)
    const chapterSentences: string[] = []
    const paraSentenceMapping: { para: HTMLElement; startIndex: number; count: number }[] = []

    for (const p of paras) {
      const text = p.textContent?.trim() || ''
      const sents = splitIntoSentences(text)
      if (sents.length === 0) continue

      paraSentenceMapping.push({
        para: p,
        startIndex: chapterSentences.length,
        count: sents.length,
      })

      for (const s of sents) {
        chapterSentences.push(s.text)
      }
    }

    totalFoundSentences += chapterSentences.length

    if (chapterSentences.length > 0) {
      let translations: string[] = []

      // 根据用户指定的引擎选择翻译通道
      if (engine === 'ai' && llmConfig && (llmConfig.apiKey || llmConfig.provider === 'custom')) {
        try {
          translations = await translateSentenceBatchWithLLM(
            chapterSentences,
            targetLang,
            llmConfig
          )
        } catch (aiErr) {
          console.warn('[BilingualExporter] AI batch failed, falling back to Google free:', aiErr)
        }
      }

      // 若未选 AI 或 AI 异常降级，使用带指数退避防限流的内置免费通道
      if (!translations || translations.length === 0 || translations.every((t) => !t)) {
        translations = await translateSentenceBatch(
          chapterSentences,
          targetLang,
          'auto',
          undefined,
          (attempt) => {
            if (onProgress) {
              onProgress({
                currentChapter: cIdx + 1,
                totalChapters,
                chapterName: chapterShortName,
                percent: Math.round((cIdx / totalChapters) * 100),
                statusMessage: `Retry ${attempt}...`,
              })
            }
          }
        )
      }

      // 重构段落为双语结构（附加行内样式双重保底）
      for (const mapping of paraSentenceMapping) {
        const p = mapping.para
        const sents = splitIntoSentences(p.textContent?.trim() || '')
        const frag = doc.createDocumentFragment()

        for (let i = 0; i < sents.length; i++) {
          const trans = (translations[mapping.startIndex + i] || '').trim()
          const pair = doc.createElement('span')
          pair.className = 'moreader-bilingual-pair'
          pair.setAttribute('style', INLINE_PAIR_STYLE)

          const orig = doc.createElement('span')
          orig.className = 'moreader-bilingual-orig'
          orig.setAttribute('style', INLINE_ORIG_STYLE)
          orig.textContent = sents[i].text
          pair.appendChild(orig)

          if (trans) {
            totalSentencesCount++
            const tr = doc.createElement('span')
            tr.className = 'moreader-bilingual-trans'
            tr.setAttribute('style', INLINE_TRANS_STYLE)
            tr.textContent = trans
            pair.appendChild(tr)
          }

          frag.appendChild(pair)
        }

        p.innerHTML = ''
        p.appendChild(frag)
      }
    }

    // 注入内置 CSS 样式
    const styleEl = doc.createElement('style')
    styleEl.textContent = BILINGUAL_CSS
    doc.head?.appendChild(styleEl)

    // 写回 zip
    const serialized = new XMLSerializer().serializeToString(doc)
    zip.file(fullPath, cleanXhtmlOutput(serialized))

    if (onProgress) {
      onProgress({
        currentChapter: cIdx + 1,
        totalChapters,
        chapterName: chapterShortName,
        percent: Math.round(((cIdx + 1) / totalChapters) * 100),
      })
    }
  }

  // 如果全书扫描出原文句子，但翻译成功句数为 0，说明翻译通道彻底受阻，绝不导出空书，阻断并抛错
  if (totalFoundSentences > 0 && totalSentencesCount === 0) {
    throw new Error('NO_TRANSLATIONS_PRODUCED')
  }

  // 4. 生成新的双语 EPUB 文件 Blob
  const resultBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return {
    blob: resultBlob,
    totalChapters,
    totalSentences: totalSentencesCount,
  }
}
