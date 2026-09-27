/**
 * 【临时审计工具 · 非发布代码】整本书高亮定位体检
 *
 * 目的：把整本 EPUB 的每个段落按 1:1 生产逻辑切句，再用生产函数
 *       highlightSentenceInElement() 去 DOM 里定位，统计：
 *        1) fail      —— 完全定位不到（绿条不出现）
 *        2) misplaced —— 定位到了但包错位置（绿条亮在别处）
 *        3) dirty     —— 该段落「干净文本 ≠ DOM 原文」，即段内有被清洗掉的字符
 *                        （拼音注音 / 脚注角标 / 上下标 / 装饰符号 / CJK 间空格）
 *
 * 用法：AUDIT_BOOK=/path/to/book.epub npx vitest run tests/_audit-book-highlight.test.ts
 */
import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import {
  getCleanText,
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

const BOOK_DIR = process.env.AUDIT_BOOK_DIR || '/root/tmp-books'
const REPORT = process.env.AUDIT_REPORT || path.join(BOOK_DIR, 'audit-report.json')

// 与 Reader.vue:2044 完全一致的候选段落选择器
const PARA_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, div[class*="para"], section'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * 【修复前旧算法·仅用于对比】直接把「洗净文本的偏移」拿去数原始 DOM 字符。
 * 这是修复前 highlightSentenceInElement 的真实行为（去掉方案A首选路径 + 去掉末尾文本兜底）。
 */
function highlightWithLegacyLogic(el: HTMLElement, startOffset: number, endOffset: number): boolean {
  const doc = el.ownerDocument || document
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if (parent) {
        const tag = parent.tagName
        if (
          tag === 'RT' ||
          tag === 'RP' ||
          parent.classList.contains('moreader-play-indicator') ||
          parent.classList.contains('moreader-bilingual-trans') ||
          parent.hasAttribute('data-bilingual-trans')
        ) {
          return NodeFilter.FILTER_REJECT
        }
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes: { node: Text; start: number; end: number }[] = []
  let charCount = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const len = node.textContent?.length || 0
    textNodes.push({ node, start: charCount, end: charCount + len })
    charCount += len
  }
  let sTN: Text | null = null
  let sOff = 0
  let eTN: Text | null = null
  let eOff = 0
  for (const tn of textNodes) {
    if (!sTN && tn.start <= startOffset && tn.end > startOffset) {
      sTN = tn.node
      sOff = startOffset - tn.start
    }
    if (tn.start < endOffset && tn.end >= endOffset) {
      eTN = tn.node
      eOff = endOffset - tn.start
    }
  }
  if (!sTN || !eTN) return false
  try {
    const range = doc.createRange()
    range.setStart(sTN, sOff)
    range.setEnd(eTN, eOff)
    const span = doc.createElement('span')
    span.className = 'tts-sentence-hl'
    span.setAttribute('data-tts-sentence', '1')
    try {
      range.surroundContents(span)
    } catch {
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)
    }
    return true
  } catch {
    return false
  }
}

interface Hit {
  chapter: string
  para: number
  sentIdx: number
  want: string
  got?: string
  raw: string
  tag?: string
  cls?: string
  nestedParas?: number
  cleanLen?: number
  domLen?: number
}

interface AlgoStat {
  fail: number
  misplaced: number
  samples: Hit[]
}

interface ChapterStat {
  chapter: string
  paragraphs: number
  sentences: number
  legacy: AlgoStat
  fixed: AlgoStat
  dirtyParagraphs: number
}

async function loadChapters(epubPath: string) {
  const zip = await JSZip.loadAsync(fs.readFileSync(epubPath))
  const names = Object.keys(zip.files)
    .filter((n) => /\.(x?html?)$/i.test(n) && !zip.files[n].dir)
    .sort()
  const out: { name: string; xml: string }[] = []
  for (const n of names) {
    out.push({ name: n, xml: await zip.files[n].async('string') })
  }
  return out
}

function parseChapter(xml: string): Document {
  const parser = new DOMParser()
  let doc = parser.parseFromString(xml, 'application/xhtml+xml')
  if (doc.querySelector('parsererror') || !doc.body) {
    doc = parser.parseFromString(xml, 'text/html')
  }
  return doc
}

function auditChapter(xml: string, chapter: string): ChapterStat {
  const stat: ChapterStat = {
    chapter,
    paragraphs: 0,
    sentences: 0,
    legacy: { fail: 0, misplaced: 0, samples: [] },
    fixed: { fail: 0, misplaced: 0, samples: [] },
    dirtyParagraphs: 0,
  }

  const doc = parseChapter(xml)
  if (!doc || !doc.body) return stat

  const nodes = Array.from(doc.body.querySelectorAll(PARA_SELECTOR)) as HTMLElement[]

  nodes.forEach((el, paraIdx) => {
    const raw = norm(el.textContent || '')
    const clean = getCleanText(el)
    if (clean.length < 2) return
    if (!/[\u4e00-\u9fff\u3040-\u309f\u30ffa-zA-Z0-9]/.test(clean)) return
    if (raw !== norm(clean)) stat.dirtyParagraphs++
    const meta = {
      tag: el.tagName,
      cls: typeof el.className === 'string' ? el.className : '',
      nestedParas: el.querySelectorAll(PARA_SELECTOR).length,
      cleanLen: clean.length,
      domLen: (el.textContent || '').length,
    }

    stat.paragraphs++
    const sents = splitIntoSentences(clean)
    stat.sentences += sents.length

    sents.forEach((sent, sentIdx) => {
      const runOne = (algo: 'legacy' | 'fixed') => {
        const host = document.createElement('div')
        const clone = el.cloneNode(true) as HTMLElement
        host.appendChild(clone)
        document.body.appendChild(host)

        try {
          if (algo === 'legacy') {
            highlightWithLegacyLogic(clone, sent.start, sent.end)
          } else {
            highlightSentenceInElement(clone, sent.start, sent.end, sent.text)
          }
        } catch {
          /* 忽略，按未高亮计 */
        }

        const span = clone.querySelector('span[data-tts-sentence="1"], span.tts-sentence-hl') as HTMLElement | null
        const bucket = stat[algo]
        if (!span) {
          bucket.fail++
          if (bucket.samples.length < 5) {
            bucket.samples.push({ chapter, para: paraIdx, sentIdx, want: sent.text, raw: raw.slice(0, 120), ...meta })
          }
        } else {
          const got = norm(getCleanText(span))
          if (got !== norm(sent.text)) {
            bucket.misplaced++
            if (bucket.samples.length < 5) {
              bucket.samples.push({ chapter, para: paraIdx, sentIdx, want: sent.text, got, raw: raw.slice(0, 120), ...meta })
            }
          }
        }

        clearSentenceHighlight(document)
        host.remove()
      }

      runOne('legacy')
      runOne('fixed')
    })
  })

  return stat
}

describe('偏移漂移来源统计（空白折叠 vs 内容剔除）', () => {
  const only = process.env.AUDIT_ONLY || ''
  const books = fs
    .readdirSync(BOOK_DIR)
    .filter((f) => f.toLowerCase().endsWith('.epub'))
    .filter((f) => !only || f.includes(only))

  it('统计两套坐标系的偏移来源', async () => {
    const rows: any[] = []
    for (const book of books) {
      const chapters = await loadChapters(path.join(BOOK_DIR, book)).catch(() => [])
      let paras = 0
      let wsAffected = 0
      let wsChars = 0
      let ctAffected = 0
      let ctChars = 0
      const samples: any[] = []

      for (const ch of chapters) {
        const doc = parseChapter(ch.xml)
        if (!doc?.body) continue
        const nodes = Array.from(doc.body.querySelectorAll(PARA_SELECTOR)) as HTMLElement[]
        for (const el of nodes) {
          const clean = getCleanText(el)
          if (clean.length < 2) continue
          if (!/[\u4e00-\u9fff\u3040-\u309f\u30ffa-zA-Z0-9]/.test(clean)) continue
          paras++
          const domText = el.textContent || ''
          const wsCollapsed = domText.replace(/\s+/g, ' ').trim()
          const dWs = domText.trim().length - wsCollapsed.length
          const dCt = wsCollapsed.length - clean.length
          if (dWs > 0) {
            wsAffected++
            wsChars += dWs
          }
          if (dCt > 0) {
            ctAffected++
            ctChars += dCt
            if (samples.length < 8) {
              samples.push({
                chapter: ch.name,
                tag: el.tagName,
                cls: typeof el.className === 'string' ? el.className : '',
                wsDelta: dWs,
                contentDelta: dCt,
                dom: domText.trim().slice(0, 120),
                clean: clean.slice(0, 120),
              })
            }
          }
        }
      }
      rows.push({
        book,
        paragraphs: paras,
        whitespaceDrift: { paragraphs: wsAffected, chars: wsChars },
        contentRemovalDrift: { paragraphs: ctAffected, chars: ctChars },
        samples,
      })
    }
    const out = process.env.AUDIT_REPORT2 || '/root/tmp-books/drift-report.json'
    fs.writeFileSync(out, JSON.stringify(rows, null, 2), 'utf8')
    console.log('drift report ->', out)
  }, 600000)
})

describe('整本书 TTS 高亮定位体检', () => {
  const only = process.env.AUDIT_ONLY || ''
  const books = fs
    .readdirSync(BOOK_DIR)
    .filter((f) => f.toLowerCase().endsWith('.epub'))
    .filter((f) => !only || f.includes(only))

  it('逐本体检并输出报告', async () => {
    const report: any = { generatedAt: new Date().toISOString(), books: [] }

    for (const book of books) {
      const epubPath = path.join(BOOK_DIR, book)
      const chapters = await loadChapters(epubPath).catch(() => [])
      const stats: ChapterStat[] = []
      for (const ch of chapters) {
        stats.push(auditChapter(ch.xml, ch.name))
      }

      const totalSentences = stats.reduce((a, s) => a + s.sentences, 0)
      const totalParagraphs = stats.reduce((a, s) => a + s.paragraphs, 0)
      const dirty = stats.reduce((a, s) => a + s.dirtyParagraphs, 0)
      const sum = (k: 'legacy' | 'fixed', f: keyof AlgoStat) =>
        stats.reduce((a, s) => a + (s[k][f] as number), 0)

      report.books.push({
        book,
        chapters: chapters.length,
        paragraphs: totalParagraphs,
        dirtyParagraphs: dirty,
        sentences: totalSentences,
        legacy: { fail: sum('legacy', 'fail'), misplaced: sum('legacy', 'misplaced') },
        fixed: { fail: sum('fixed', 'fail'), misplaced: sum('fixed', 'misplaced') },
        legacySamples: stats.flatMap((s) => s.legacy.samples).slice(0, 8),
        fixedSamples: stats.flatMap((s) => s.fixed.samples).slice(0, 8),
      })

      console.log(
        `\n📕 ${book}\n   章节 ${chapters.length} | 段落 ${totalParagraphs}（含被清洗字符的段落 ${dirty}）| 句子 ${totalSentences}` +
          `\n   修复前旧算法：错位 ${sum('legacy', 'misplaced')} 句 / 未高亮 ${sum('legacy', 'fail')} 句` +
          `\n   方案A修复后：错位 ${sum('fixed', 'misplaced')} 句 / 未高亮 ${sum('fixed', 'fail')} 句`
      )
    }

    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8')
    console.log(`\n📄 完整报告已写入: ${REPORT}`)
  }, 600000)
})
