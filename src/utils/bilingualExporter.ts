import JSZip from 'jszip'
import { splitIntoSentences } from '@/stores/ttsStore'
import { translateSentenceBatch } from '@/utils/freeTranslator'
import { downloadBlob } from '@/utils/aiExporter'

const BILINGUAL_CSS = `
.moreader-bilingual-pair {
  display: block;
  margin-bottom: 0.65em;
  text-indent: 0 !important;
}
.moreader-bilingual-orig {
  display: block;
  line-height: 1.7;
}
.moreader-bilingual-trans {
  display: block;
  font-size: 0.88em;
  line-height: 1.55;
  opacity: 0.72;
  margin-top: 0.22em;
  font-style: normal;
  color: #555555;
}
@media (prefers-color-scheme: dark) {
  .moreader-bilingual-trans {
    color: #aaaaaa;
  }
}
`

export interface ExportProgress {
  currentChapter: number
  totalChapters: number
  chapterName: string
  percent: number
}

/**
 * 将整本 EPUB 转换为并导出为中英逐句双语对照 EPUB 电子书
 */
export async function exportBilingualEpub(
  arrayBuffer: ArrayBuffer,
  bookTitle: string,
  targetLang: string = 'zh-CN',
  onProgress?: (progress: ExportProgress) => void,
  isCancelled?: () => boolean
): Promise<Blob | null> {
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. 查找 container.xml 定位 OPF
  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('Invalid EPUB: META-INF/container.xml missing')

  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml')
  const opfPath =
    containerDoc.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf'
  const opfDir = opfPath.replace(/[/][^/]+$/, '')

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`)

  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml')

  // 获取 spine items 列表
  const itemMap = new Map<string, string>()
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (id && href) itemMap.set(id, href)
  })

  const spineHrefs: string[] = []
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref')
    if (idref && itemMap.has(idref)) {
      spineHrefs.push(itemMap.get(idref)!)
    }
  })

  const totalChapters = spineHrefs.length

  // 2. 逐章翻译并重组 HTML
  for (let cIdx = 0; cIdx < spineHrefs.length; cIdx++) {
    if (isCancelled && isCancelled()) return null

    const rawHref = spineHrefs[cIdx]
    const fullPath = opfDir ? `${opfDir}/${rawHref}` : rawHref
    const chapterFile = zip.file(fullPath)
    if (!chapterFile) continue

    const chapterHtml = await chapterFile.async('string')
    const doc = new DOMParser().parseFromString(chapterHtml, 'text/html')

    if (onProgress) {
      onProgress({
        currentChapter: cIdx + 1,
        totalChapters,
        chapterName: rawHref.split('/').pop() || `Chapter ${cIdx + 1}`,
        percent: Math.round(((cIdx) / totalChapters) * 100),
      })
    }

    // 收集所有有效段落并切句
    const paras = Array.from(
      doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li')
    ).filter((p) => {
      const text = p.textContent?.trim() || ''
      return text.length >= 2 && /[a-zA-Z]/.test(text)
    }) as HTMLElement[]

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

    if (chapterSentences.length > 0) {
      // 批量获取翻译
      const translations = await translateSentenceBatch(chapterSentences, targetLang, 'auto')

      // 重构段落为双语结构
      for (const mapping of paraSentenceMapping) {
        const p = mapping.para
        const sents = splitIntoSentences(p.textContent?.trim() || '')
        const frag = doc.createDocumentFragment()

        for (let i = 0; i < sents.length; i++) {
          const trans = translations[mapping.startIndex + i] || ''
          const pair = doc.createElement('span')
          pair.className = 'moreader-bilingual-pair'

          const orig = doc.createElement('span')
          orig.className = 'moreader-bilingual-orig'
          orig.textContent = sents[i].text
          pair.appendChild(orig)

          if (trans) {
            const tr = doc.createElement('span')
            tr.className = 'moreader-bilingual-trans'
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
    doc.head.appendChild(styleEl)

    // 写回 zip
    const serialized = new XMLSerializer().serializeToString(doc)
    zip.file(fullPath, serialized)

    if (onProgress) {
      onProgress({
        currentChapter: cIdx + 1,
        totalChapters,
        chapterName: rawHref.split('/').pop() || `Chapter ${cIdx + 1}`,
        percent: Math.round(((cIdx + 1) / totalChapters) * 100),
      })
    }
  }

  // 3. 生成新的双语 EPUB 文件 Blob
  const resultBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return resultBlob
}
