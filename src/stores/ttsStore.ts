import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TTSProvider, EdgeVoice, AIVoice, AIVoiceModel } from '@/types/book'
import { AI_VOICE_MODELS } from '@/types/book'

const CJK_CHAR = '[\\u4e00-\\u9fff\\u3040-\\u309f\\u30a0-\\u30ff]'
const P_CHAR = '[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]'
const TONE_CHAR = '[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]'

/**
 * Clean raw text string for TTS:
 * - strips bracketed pinyin
 * - strips tone-marked pinyin syllables
 * - strips isolated pinyin syllables adjacent to CJK
 * - strips footnote numbers, circled numbers, decoration marks
 * - collapses whitespace & removes spaces between CJK characters (critical for Edge TTS flow)
 */
export function cleanTtsString(raw: string): string {
  let text = raw
  const hasCJK = new RegExp(CJK_CHAR).test(raw)

  if (hasCJK) {
    // 仅在包含中文的上下文中处理拼音清洗（防止误删英文书籍中带声调的外来词及普通英文括号）
    // 1. 带声调的括号拼音 (e.g. (jiāng) or （cǎi lián）)
    text = text.replace(new RegExp(`[（(]${P_CHAR}*${TONE_CHAR}${P_CHAR}*[)）]`, 'g'), '')
    text = text.replace(/[（(]\s*[)）]/g, '')
    // 2. 独立的带声调拼音 token (100% 汉字拼音)
    text = text.replace(new RegExp(`(?<!${P_CHAR})${P_CHAR}*${TONE_CHAR}${P_CHAR}*(?!${P_CHAR})`, 'g'), '')
    // 3. 紧邻 CJK 的无声调拼音 (e.g. 江 jiang 南 nan)
    text = text.replace(new RegExp(`(?<=${CJK_CHAR})\\s*[a-zA-Z]{1,8}(?=\\s*[,，。！？；:!?;\n]|$|\\s*${CJK_CHAR})`, 'g'), '')
    // 4. 紧在 CJK 前面的无声调拼音 (e.g. jiang 江 nan 南)
    text = text.replace(new RegExp(`(?:^|\\s+)[a-zA-Z]{1,8}\\s*(?=${CJK_CHAR})`, 'g'), '')
  }

  // 5. Footnotes [1], [1,2], [1，2]
  text = text.replace(/\[\d+(?:[,，]\d+)*\]/g, '')
  text = text.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '')
  // 6. Residual formatting artifacts
  text = text.replace(/\/\*+\/\s*/g, '')
  text = text.replace(/[*]{2,}/g, '')
  text = text.replace(/[#]{2,}/g, '')
  text = text.replace(/[_]{2,}/g, '')
  text = text.replace(/[~]{2,}/g, '')
  text = text.replace(/[`]{2,}/g, '')
  text = text.replace(/[*＊·•●▶▷◀◁◆◇○◎●◉○□■△▲☆★❀✿❁🌸🌺]/g, '')
  text = text.replace(/\s+/g, ' ')
  // 7. Remove spaces between CJK characters (prevents Edge TTS reading character-by-character)
  if (hasCJK) {
    text = text.replace(new RegExp(`(${CJK_CHAR})\\s+(?=${CJK_CHAR})`, 'g'), '$1')
  }
  return text.trim()
}

/**
 * Extract clean text from an HTML element for TTS:
 * - clones node to ensure non-destructive read
 * - replaces <ruby> with its base text (removes rt, rp, rtc pinyin tags)
 * - removes sup, sub, .math-super, .footnote, etc.
 * - applies cleanTtsString regex filtering
 */
export function getCleanText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  // 1) For each <ruby>: first strip rt/rp/rtc (pinyin), then keep only base text
  clone.querySelectorAll('ruby').forEach(ruby => {
    ruby.querySelectorAll('rt, rp, rtc').forEach(n => n.remove())
    const baseText = document.createTextNode(ruby.textContent || '')
    ruby.replaceWith(baseText)
  })
  // 2) Remove annotation inline elements
  clone.querySelectorAll('sup, sub').forEach(n => n.remove())
  // 3) Remove annotation container elements and bilingual translation text (TTS only reads original)
  clone.querySelectorAll('.math-super, .footnote, .note, .annotation, [class*="note"], [class*="footnote"], .moreader-bilingual-trans, [data-bilingual-trans="1"]').forEach(n => n.remove())
  // 4) Remove <a> that only contain footnote reference text like [N] or href with #note
  clone.querySelectorAll('a').forEach(a => {
    if (/^\[\d+\]$/.test(a.textContent?.trim() || '')) a.remove()
    else {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('#note')) a.remove()
    }
  })
  // 5) Get plain text and clean
  const text = clone.textContent || ''
  return cleanTtsString(text)
}

export interface WordBoundary {
  o: number // offset in ms
  t?: string
  s: number
  e: number
}

export interface SentenceRange {
  text: string
  start: number
  end: number
}

export interface TTSAudioResult {
  blob: Blob
  boundaries?: WordBoundary[]
}

const COMMON_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc',
  'st', 'ave', 'rd', 'blvd', 'dept', 'approx', 'est',
  'gen', 'col', 'maj', 'capt', 'lt', 'sgt', 'corp',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
])

function isAbbreviation(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (COMMON_ABBREVIATIONS.has(clean)) return true
  // 单个大写字母缩写，如 J. K. Rowling
  if (/^[A-Z]\.?$/.test(word.trim())) return true
  // e.g. 或 i.e. 或 U.S. 等多点缩写
  if (/^[a-zA-Z](\.[a-zA-Z])+\.?$/.test(word.trim())) return true
  return false
}

export function splitIntoSentences(text: string): SentenceRange[] {
  if (!text || text.length === 0) return []

  // 1:1 严格对齐 Android 端墨阅成熟的 SENTENCE_REGEX：
  // 核心标点：[.!?。！？；;\n]，严格排除省略号 …（Android端不将省略号作为断句符，避免截断语气或造成孤立省略号碎片）
  // 紧随闭合后引号/括号：[”’"'\)）』」»]*（注意仅匹配右侧闭合引号，绝不误吃左前引号 “ ‘ 「 『）
  // 英文句号排除数字小数点与常见缩写
  const regex = /(?:[。！？!?；;\n]|(?<!\d)\.(?!\d))[”’"'\)）』」»]*/g

  const cuts: number[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const punctEnd = match.index + match[0].length

    // 如果是单个英文句号，执行缩写和域名/连词过滤
    if (match[0].includes('.')) {
      // 1. 句号后如果有文字，必须是空白字符，不能直接连着字母（例如 domain.com）
      const rest = text.slice(punctEnd)
      if (rest.length > 0 && !/^\s/.test(rest)) {
        continue
      }

      // 2. 检查句号前面的词是否是缩写 (如 Mr., Dr., etc.)
      const before = text.slice(0, match.index)
      const lastWordMatch = before.match(/([a-zA-Z.]+)\s*$/)
      if (lastWordMatch) {
        const word = lastWordMatch[1]
        if (isAbbreviation(word)) {
          continue
        }
      }
    }

    cuts.push(punctEnd)
  }

  // 1:1 严格对齐 Android 端的连续 sentenceEnds 字符映射体系
  const sentences: SentenceRange[] = []
  let prevPos = 0

  for (const cut of cuts) {
    const rawPart = text.slice(prevPos, cut)
    const trimmed = rawPart.trim()
    if (trimmed.length > 0) {
      // 如果这个碎片纯粹是多余的闭合符号或纯标点，合并到上一句，绝不产生孤立的省略号或标点句子
      if (/^[。！？!?；;\n.”’"'\)）』」\s]+$/.test(trimmed) && sentences.length > 0) {
        const prev = sentences[sentences.length - 1]
        prev.text += trimmed
        prev.end = text.indexOf(trimmed, prevPos) + trimmed.length
        prevPos = cut
        continue
      }

      const start = text.indexOf(trimmed, prevPos)
      if (start >= 0) {
        sentences.push({
          text: trimmed,
          start,
          end: start + trimmed.length,
        })
      }
    }
    prevPos = cut
  }

  if (prevPos < text.length) {
    const rawPart = text.slice(prevPos)
    const trimmed = rawPart.trim()
    if (trimmed.length > 0) {
      if (/^[。！？!?；;\n.”’"'\)）』」\s]+$/.test(trimmed) && sentences.length > 0) {
        const prev = sentences[sentences.length - 1]
        prev.text += trimmed
        prev.end = text.indexOf(trimmed, prevPos) + trimmed.length
      } else {
        const start = text.indexOf(trimmed, prevPos)
        if (start >= 0) {
          sentences.push({
            text: trimmed,
            start,
            end: start + trimmed.length,
          })
        }
      }
    }
  }

  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      text: text.trim(),
      start: 0,
      end: text.length,
    })
  }

  return sentences
}

export function clearSentenceHighlight(root?: Document | HTMLElement | null) {
  const container = root || document
  const spans = container.querySelectorAll('span[data-tts-sentence="1"], span.tts-sentence-hl')
  spans.forEach((s) => {
    const parent = s.parentNode
    if (parent) {
      while (s.firstChild) {
        parent.insertBefore(s.firstChild, s)
      }
      parent.removeChild(s)
      parent.normalize()
    }
  })
}

interface CharMapping {
  node: Text
  offset: number
}

function normalizeCharForMatching(ch: string): string {
  if (ch === '‘' || ch === '’' || ch === '`') return "'"
  if (ch === '“' || ch === '”' || ch === '«' || ch === '»') return '"'
  if (ch === '—' || ch === '–') return '-'
  if (ch === '\u00a0' || ch === '\u3000') return ' '
  return ch
}

function findSentenceRangeInElement(
  el: HTMLElement,
  targetText: string
): { startNode: Text; startOffset: number; endNode: Text; endOffset: number } | null {
  const target = targetText.trim()
  if (!target) return null

  const doc = el.ownerDocument || document
  const nf = typeof NodeFilter !== 'undefined' ? NodeFilter : (doc.defaultView as any)?.NodeFilter || { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }
  const mapping: CharMapping[] = []
  let domText = ''

  const walker = doc.createTreeWalker(el, nf.SHOW_TEXT, {
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
          return nf.FILTER_REJECT
        }
      }
      return nf.FILTER_ACCEPT
    },
  })

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const text = node.textContent || ''
    for (let i = 0; i < text.length; i++) {
      mapping.push({ node, offset: i })
      domText += text[i]
    }
  }

  if (mapping.length === 0) return null

  // 1. 精确子串匹配
  let startIdx = domText.indexOf(target)
  let endIdx = -1

  if (startIdx >= 0) {
    endIdx = startIdx + target.length
  } else {
    // 2. 忽略空白字符与标点归一化匹配（处理段首空格缩进、换行、不同引号等排版差异）
    const nonWsIndices: number[] = []
    let compactDom = ''
    for (let i = 0; i < domText.length; i++) {
      const c = domText[i]
      if (!/\s/.test(c)) {
        nonWsIndices.push(i)
        compactDom += normalizeCharForMatching(c)
      }
    }

    let compactTarget = ''
    for (let i = 0; i < target.length; i++) {
      const c = target[i]
      if (!/\s/.test(c)) {
        compactTarget += normalizeCharForMatching(c)
      }
    }

    if (compactTarget.length > 0) {
      const cIdx = compactDom.indexOf(compactTarget)
      if (cIdx >= 0) {
        startIdx = nonWsIndices[cIdx]
        endIdx = nonWsIndices[cIdx + compactTarget.length - 1] + 1
      }
    }

    // 3. 兜底模糊匹配：首部 6 字符与尾部 6 字符双向锚定
    if (startIdx < 0 && compactTarget.length >= 8) {
      const head = compactTarget.slice(0, Math.min(6, compactTarget.length))
      const tail = compactTarget.slice(-Math.min(6, compactTarget.length))
      const hIdx = compactDom.indexOf(head)
      if (hIdx >= 0) {
        const tIdx = compactDom.indexOf(tail, hIdx + head.length)
        if (tIdx >= 0) {
          startIdx = nonWsIndices[hIdx]
          endIdx = nonWsIndices[tIdx + tail.length - 1] + 1
        }
      }
    }
  }

  if (startIdx < 0 || endIdx <= startIdx || endIdx > mapping.length) {
    return null
  }

  const s = mapping[startIdx]
  const e = mapping[endIdx - 1]
  return {
    startNode: s.node,
    startOffset: s.offset,
    endNode: e.node,
    endOffset: e.offset + 1,
  }
}

export function lockParagraphHighlight(el: HTMLElement) {
  if (!el) return
  if (!el.classList.contains('tts-hl')) {
    el.classList.add('tts-hl')
  }
  if (el.style.backgroundColor !== 'rgba(59, 130, 246, 0.15)') {
    el.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
  }
  if (!el.style.borderLeft) {
    el.style.borderLeft = '4px solid #3b82f6'
  }
  if (!el.style.paddingLeft) {
    el.style.paddingLeft = '8px'
  }
}

export function highlightSentenceByText(el: HTMLElement, sentenceText: string) {
  const doc = el.ownerDocument || document
  clearSentenceHighlight(doc)

  // 方案 A 关键生命周期死锁：确保无论句子切分与切换如何进行，段落淡蓝底色绝不被洗掉
  lockParagraphHighlight(el)

  const rangeInfo = findSentenceRangeInElement(el, sentenceText)
  if (!rangeInfo) {
    return
  }

  const range = doc.createRange()
  try {
    range.setStart(rangeInfo.startNode, rangeInfo.startOffset)
    range.setEnd(rangeInfo.endNode, rangeInfo.endOffset)

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

    if (typeof span.scrollIntoView === 'function') {
      span.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  } catch (err) {
    console.warn('[TTS HL] Range error:', err)
  }
}

export function highlightSentenceInElement(
  el: HTMLElement,
  startOffset: number,
  endOffset: number,
  sentenceText?: string
) {
  const doc = el.ownerDocument || document
  clearSentenceHighlight(doc)
  lockParagraphHighlight(el)

  // 1:1 移植自 Android 端 EpubWebView.kt 的 TreeWalker 字符计数精准高亮算法
  const nf = typeof NodeFilter !== 'undefined' ? NodeFilter : (doc.defaultView as any)?.NodeFilter || { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }
  const walker = doc.createTreeWalker(el, nf.SHOW_TEXT, {
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
          return nf.FILTER_REJECT
        }
      }
      return nf.FILTER_ACCEPT
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

  for (let i = 0; i < textNodes.length; i++) {
    const tn = textNodes[i]
    if (!sTN && tn.start <= startOffset && tn.end > startOffset) {
      sTN = tn.node
      sOff = startOffset - tn.start
    }
    if (tn.start < endOffset && tn.end >= endOffset) {
      eTN = tn.node
      eOff = endOffset - tn.start
    }
  }

  if (sTN && eTN) {
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

      if (typeof span.scrollIntoView === 'function') {
        span.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      return
    } catch (err) {
      console.warn('[TTS HL] TreeWalker range error, falling back:', err)
    }
  }

  // 优雅降级兜底：若字符偏移量因特殊排版结构未命中，使用精确/模糊子串查找
  if (sentenceText) {
    highlightSentenceByText(el, sentenceText)
  }
}

const DEFAULT_EDGE_VOICES: EdgeVoice[] = [
  // 中文普通话 & 方言 (Chinese Mandarin & Dialects)
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-YunxiaNeural', name: '云霞', gender: 'male', locale: 'zh-CN', lang: '中文普通话' },
  { id: 'zh-CN-liaoning-XiaobeiNeural', name: '东北晓北', gender: 'female', locale: 'zh-CN', lang: '东北话' },
  { id: 'zh-CN-shaanxi-XiaoniNeural', name: '陕西晓妮', gender: 'female', locale: 'zh-CN', lang: '陕西话' },
  // 台湾 & 粤语 (Taiwan & Cantonese)
  { id: 'zh-TW-HsiaoChenNeural', name: '曉臻', gender: 'female', locale: 'zh-TW', lang: '台湾国语' },
  { id: 'zh-TW-HsiaoYuNeural', name: '曉雨', gender: 'female', locale: 'zh-TW', lang: '台湾国语' },
  { id: 'zh-TW-YunJheNeural', name: '雲哲', gender: 'male', locale: 'zh-TW', lang: '台湾国语' },
  { id: 'zh-HK-HiuMaanNeural', name: '曉曼', gender: 'female', locale: 'zh-HK', lang: '粤语' },
  { id: 'zh-HK-HiuGaaiNeural', name: '曉佳', gender: 'female', locale: 'zh-HK', lang: '粤语' },
  { id: 'zh-HK-WanLungNeural', name: '雲龍', gender: 'male', locale: 'zh-HK', lang: '粤语' },
  // 英语 - 美式 (English - US)
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-AvaNeural', name: 'Ava', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-BrianNeural', name: 'Brian', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-AnaNeural', name: 'Ana', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-DavisNeural', name: 'Davis', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-AshleyNeural', name: 'Ashley', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-CoraNeural', name: 'Cora', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-ElizabethNeural', name: 'Elizabeth', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-EricNeural', name: 'Eric', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-JacobNeural', name: 'Jacob', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-MonicaNeural', name: 'Monica', gender: 'female', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-RogerNeural', name: 'Roger', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', locale: 'en-US', lang: 'English (US)' },
  // 多语言通用 (Multilingual)
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava (Multi)', gender: 'female', locale: 'en-US', lang: 'Multilingual' },
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (Multi)', gender: 'male', locale: 'en-US', lang: 'Multilingual' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (Multi)', gender: 'female', locale: 'en-US', lang: 'Multilingual' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian (Multi)', gender: 'male', locale: 'en-US', lang: 'Multilingual' },
  // 英语 - 英式 (English - UK)
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-MaisieNeural', name: 'Maisie (Child)', gender: 'child', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-AlfieNeural', name: 'Alfie', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-BellaNeural', name: 'Bella', gender: 'female', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-ElliotNeural', name: 'Elliot', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-EthanNeural', name: 'Ethan', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-HollieNeural', name: 'Hollie', gender: 'female', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-NoahNeural', name: 'Noah', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-OliverNeural', name: 'Oliver', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-OliviaNeural', name: 'Olivia', gender: 'female', locale: 'en-GB', lang: 'English (UK)' },
  { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'male', locale: 'en-GB', lang: 'English (UK)' },
  // 日本語 (Japanese)
  { id: 'ja-JP-NanamiNeural', name: '七海', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-KeitaNeural', name: '圭太', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-AoiNeural', name: '葵', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-DaichiNeural', name: '大智', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-MayuNeural', name: '真由', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-NaokiNeural', name: '直樹', gender: 'male', locale: 'ja-JP', lang: '日本語' },
  { id: 'ja-JP-ShioriNeural', name: '詩織', gender: 'female', locale: 'ja-JP', lang: '日本語' },
  // 한국어 (Korean)
  { id: 'ko-KR-SunHiNeural', name: '선희', gender: 'female', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-InJoonNeural', name: '인준', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-HyunsuNeural', name: '현수', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-HyunsuMultilingualNeural', name: '현수 (Multi)', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-InJoonNeural', name: '인준', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'ko-KR-HyunsuNeural', name: '현수', gender: 'male', locale: 'ko-KR', lang: '한국어' },
  { id: 'de-DE-KatjaNeural', name: 'Katja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ConradNeural', name: 'Conrad', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-AmalaNeural', name: 'Amala', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-BerndNeural', name: 'Bernd', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ChristophNeural', name: 'Christoph', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-ElkeNeural', name: 'Elke', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-GiselaNeural', name: 'Gisela', gender: 'child', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KasperNeural', name: 'Kasper', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KillianNeural', name: 'Killian', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KlarissaNeural', name: 'Klarissa', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-KlausNeural', name: 'Klaus', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-LouisaNeural', name: 'Louisa', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-MajaNeural', name: 'Maja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-RalfNeural', name: 'Ralf', gender: 'male', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-SeraphinaNeural', name: 'Seraphina', gender: 'child', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'de-DE-TanjaNeural', name: 'Tanja', gender: 'female', locale: 'de-DE', lang: 'Deutsch' },
  { id: 'fr-FR-DeniseNeural', name: 'Denise', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-HenriNeural', name: 'Henri', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-EloiseNeural', name: 'Eloise', gender: 'child', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-AlainNeural', name: 'Alain', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-BrigitteNeural', name: 'Brigitte', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-CelesteNeural', name: 'Celeste', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-ClaudeNeural', name: 'Claude', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-CoralieNeural', name: 'Coralie', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JacquelineNeural', name: 'Jacqueline', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JeromeNeural', name: 'Jerome', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-JosephineNeural', name: 'Josephine', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-MauriceNeural', name: 'Maurice', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-YvesNeural', name: 'Yves', gender: 'male', locale: 'fr-FR', lang: 'Français' },
  { id: 'fr-FR-YvetteNeural', name: 'Yvette', gender: 'female', locale: 'fr-FR', lang: 'Français' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'female', locale: 'es-ES', lang: 'Español' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro', gender: 'male', locale: 'es-ES', lang: 'Español' },
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана', gender: 'female', locale: 'ru-RU', lang: 'Русский' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий', gender: 'male', locale: 'ru-RU', lang: 'Русский' },
  { id: 'it-IT-ElsaNeural', name: 'Elsa', gender: 'female', locale: 'it-IT', lang: 'Italiano' },
  { id: 'it-IT-DiegoNeural', name: 'Diego', gender: 'male', locale: 'it-IT', lang: 'Italiano' },
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'female', locale: 'pt-BR', lang: 'Português' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'male', locale: 'pt-BR', lang: 'Português' },
  { id: 'ar-SA-ZariyahNeural', name: 'زارية', gender: 'female', locale: 'ar-SA', lang: 'العربية' },
  { id: 'ar-SA-HamedNeural', name: 'حامد', gender: 'male', locale: 'ar-SA', lang: 'العربية' },
  { id: 'hi-IN-SwaraNeural', name: 'स्वरा', gender: 'female', locale: 'hi-IN', lang: 'हिन्दी' },
  { id: 'hi-IN-MadhurNeural', name: 'मधुर', gender: 'male', locale: 'hi-IN', lang: 'हिन्दी' },
  { id: 'th-TH-PremwadeeNeural', name: 'เปรมวดี', gender: 'female', locale: 'th-TH', lang: 'ไทย' },
  { id: 'th-TH-NiwatNeural', name: 'นิวัติ', gender: 'male', locale: 'th-TH', lang: 'ไทย' },
  { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My (女)', locale: 'vi-VN', lang: 'Tiếng Việt' },
  { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (男)', locale: 'vi-VN', lang: 'Tiếng Việt' },
]

// SiliconFlow AI Voice definitions (from official docs)
const AI_VOICES: AIVoice[] = [
  { id: 'fnlp/MOSS-TTSD-v0.5:alex', name: 'Alex (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:anna', name: 'Anna (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:bella', name: 'Bella (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:benjamin', name: 'Benjamin (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:charles', name: 'Charles (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:claire', name: 'Claire (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'fnlp/MOSS-TTSD-v0.5:david', name: 'David (男)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '男' },
  { id: 'fnlp/MOSS-TTSD-v0.5:diana', name: 'Diana (女)', model: 'fnlp/MOSS-TTSD-v0.5', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', name: 'Alex (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', name: 'Anna (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', name: 'Bella (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', name: 'Benjamin (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', name: 'Charles (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', name: 'Claire (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:david', name: 'David (男)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '男' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', name: 'Diana (女)', model: 'FunAudioLLM/CosyVoice2-0.5B', lang: '中英双语', gender: '女' },
]

interface PrefetchItem {
  index: number
  audioBlob?: Blob
  audioUrl?: string
  boundaries?: WordBoundary[]
  text?: string
  isReady: boolean
  isFetching: boolean
  error?: Error
}

const TTS_STORAGE_KEY = 'moreader-tts-settings'

// Per-provider AI Voice config — each provider remembers its own settings
export interface AIVoiceProviderConfig {
  endpoint: string
  apiKey: string
  model: string
  voiceId: string
}

interface TTSSettings {
  provider: TTSProvider
  edgeEndpoint: string
  edgeVoice: string
  edgeRate: string
  edgePitch: string
  edgeApiKey: string
  speechRate: number
  selectedVoiceURI: string
  // AI Voice — per-provider configs (new structure)
  aiVoiceProvider: string
  aiVoiceConfigs: Record<string, AIVoiceProviderConfig>
  // Legacy fields (for migration only)
  aiVoiceEndpoint?: string
  aiVoiceApiKey?: string
  aiVoiceModel?: string
  aiVoiceId?: string
}

// Default configs per AI Voice provider
const DEFAULT_AI_VOICE_CONFIGS: Record<string, AIVoiceProviderConfig> = {
  siliconflow: {
    endpoint: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'fnlp/MOSS-TTSD-v0.5',
    voiceId: 'fnlp/MOSS-TTSD-v0.5:anna',
  },
  openai: {
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'tts-1',
    voiceId: 'alloy',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'sesame/csm-1b',
    voiceId: 'default',
  },
  custom: {
    endpoint: '',
    apiKey: '',
    model: '',
    voiceId: '',
  },
}

const loadTTSSettings = (): TTSSettings => {
  try {
    const saved = localStorage.getItem(TTS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Migration: convert legacy flat fields to per-provider configs
      if (!parsed.aiVoiceConfigs) {
        parsed.aiVoiceConfigs = {}
        // Migrate from old flat fields
        if (parsed.aiVoiceEndpoint || parsed.aiVoiceModel) {
          const provider = parsed.aiVoiceProvider || 'siliconflow'
          parsed.aiVoiceConfigs[provider] = {
            endpoint: parsed.aiVoiceEndpoint || DEFAULT_AI_VOICE_CONFIGS[provider]?.endpoint || '',
            apiKey: parsed.aiVoiceApiKey || '',
            model: parsed.aiVoiceModel || DEFAULT_AI_VOICE_CONFIGS[provider]?.model || '',
            voiceId: parsed.aiVoiceId || DEFAULT_AI_VOICE_CONFIGS[provider]?.voiceId || '',
          }
        }
      }
      // Ensure all default providers have configs
      for (const key of Object.keys(DEFAULT_AI_VOICE_CONFIGS)) {
        if (!parsed.aiVoiceConfigs[key]) {
          parsed.aiVoiceConfigs[key] = { ...DEFAULT_AI_VOICE_CONFIGS[key] }
        }
      }
      return parsed
    }
  } catch (e) { console.warn('Failed to load TTS settings:', e) }
  return {
    provider: 'edge',
    edgeEndpoint: 'http://p-plus.duckdns.org:5001',
    edgeVoice: 'zh-CN-XiaoxiaoNeural',
    edgeRate: '+0%',
    edgePitch: '+0Hz',
    edgeApiKey: '',
    speechRate: 1.0,
    selectedVoiceURI: '',
    aiVoiceProvider: 'siliconflow',
    aiVoiceConfigs: JSON.parse(JSON.stringify(DEFAULT_AI_VOICE_CONFIGS)),
  }
}

const saveTTSSettings = (settings: Partial<TTSSettings>) => {
  try {
    const existing = loadTTSSettings()
    const merged = { ...existing, ...settings }
    localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(merged))
  } catch (e) { console.warn('Failed to save TTS settings:', e) }
}

export const useTTSStore = defineStore('tts', () => {
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const pausedIndex = ref(-1)
  const activeIndex = ref(-1)
  const paragraphNodes = ref<HTMLElement[]>([])
  const ttsProvider = ref<TTSProvider>(loadTTSSettings().provider)
  const edgeTTSEndpoint = ref(loadTTSSettings().edgeEndpoint)
  const edgeTTSVoice = ref(loadTTSSettings().edgeVoice)
  const edgeTTSRate = ref(loadTTSSettings().edgeRate)
  const edgeTTSPitch = ref(loadTTSSettings().edgePitch)
  const edgeTTSApiKey = ref(loadTTSSettings().edgeApiKey)
  const loadCachedEdgeVoices = (): EdgeVoice[] => {
    try {
      const cached = localStorage.getItem('moreader_cached_edge_voices')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, EdgeVoice>()
          DEFAULT_EDGE_VOICES.forEach(v => map.set(v.id, v))
          parsed.forEach((v: EdgeVoice) => { if (v && v.id) map.set(v.id, v) })
          return Array.from(map.values())
        }
      }
    } catch {}
    return DEFAULT_EDGE_VOICES
  }

  const edgeTTSAvailable = ref(false)
  const availableVoices = ref<SpeechSynthesisVoice[]>([])
  const voicesLoaded = ref(false)
  const edgeVoices = ref<EdgeVoice[]>(loadCachedEdgeVoices())
  const speechRate = ref(loadTTSSettings().speechRate)
  const selectedVoiceURI = ref(loadTTSSettings().selectedVoiceURI)
  const prefetchCache = ref<Map<number, PrefetchItem>>(new Map())

  // AI Voice - per-provider independent settings
  const aiVoiceProvider = ref(loadTTSSettings().aiVoiceProvider)
  const aiVoiceConfigs = ref<Record<string, AIVoiceProviderConfig>>(loadTTSSettings().aiVoiceConfigs)

  // Computed: current provider's config
  const currentAIVoiceConfig = computed<AIVoiceProviderConfig>(() => {
    const key = aiVoiceProvider.value
    if (!aiVoiceConfigs.value[key]) {
      aiVoiceConfigs.value[key] = { ...DEFAULT_AI_VOICE_CONFIGS[key] || { endpoint: '', apiKey: '', model: '', voiceId: '' } }
    }
    return aiVoiceConfigs.value[key]
  })

  // Convenience computed refs for current provider's fields
  const aiVoiceEndpoint = computed({
    get: () => currentAIVoiceConfig.value.endpoint,
    set: (v: string) => { currentAIVoiceConfig.value.endpoint = v },
  })
  const aiVoiceApiKey = computed({
    get: () => currentAIVoiceConfig.value.apiKey,
    set: (v: string) => { currentAIVoiceConfig.value.apiKey = v },
  })
  const aiVoiceModel = computed({
    get: () => currentAIVoiceConfig.value.model as AIVoiceModel,
    set: (v: AIVoiceModel) => { currentAIVoiceConfig.value.model = v },
  })
  const aiVoiceId = computed({
    get: () => currentAIVoiceConfig.value.voiceId,
    set: (v: string) => { currentAIVoiceConfig.value.voiceId = v },
  })

  const aiVoiceAvailable = ref(false)

  // Recording TTS output (not mic): collect audio blobs during playback
  const isRecordingTTS = ref(false)
  const recordingBlobs = ref<Blob[]>([])
  const recordingText = ref('')

  let currentAudio: HTMLAudioElement | null = null
  let currentAudioUrl: string | null = null
  let currentPlaySessionId = 0

  const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { voicesLoaded.value = true; availableVoices.value = voices }
    window.speechSynthesis.onvoiceschanged = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        availableVoices.value = window.speechSynthesis.getVoices()
        voicesLoaded.value = true
      }
    }
  }
  loadVoices()

  const getCacheItem = (index: number): PrefetchItem => {
    if (!prefetchCache.value.has(index)) {
      prefetchCache.value.set(index, { index, isReady: false, isFetching: false })
    }
    return prefetchCache.value.get(index)!
  }

  const clearPrefetchCache = () => {
    prefetchCache.value.forEach((item) => { if (item.audioUrl) URL.revokeObjectURL(item.audioUrl) })
    prefetchCache.value.clear()
  }

  const fetchEdgeTTSAudioWithBoundaries = async (text: string): Promise<TTSAudioResult> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (edgeTTSApiKey.value) headers['X-API-Key'] = edgeTTSApiKey.value

    const DEFAULT_SERVERS = [
      'http://p-plus.duckdns.org:5001',
      'http://powerplus.blogsyte.com:5001',
    ]
    let endpointsToTry = [edgeTTSEndpoint.value]
    for (const s of DEFAULT_SERVERS) {
      if (edgeTTSEndpoint.value && edgeTTSEndpoint.value.startsWith(s)) {
        endpointsToTry = [edgeTTSEndpoint.value, ...DEFAULT_SERVERS.filter(srv => srv !== edgeTTSEndpoint.value)]
        break
      }
    }

    let lastErr: any = null
    for (const ep of endpointsToTry) {
      try {
        let response = await fetch(`${ep}/tts_with_boundaries`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice: edgeTTSVoice.value, rate: edgeTTSRate.value, pitch: edgeTTSPitch.value }),
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok && response.status === 404) {
          response = await fetch(`${ep}/tts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text, voice: edgeTTSVoice.value, rate: edgeTTSRate.value, pitch: edgeTTSPitch.value }),
            signal: AbortSignal.timeout(15000),
          })
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        let boundaries: WordBoundary[] | undefined
        const boundsHeader = response.headers.get('x-word-boundaries') || response.headers.get('X-Word-Boundaries')
        if (boundsHeader) {
          try {
            boundaries = JSON.parse(boundsHeader)
            console.log(`[TTS] 收到 X-Word-Boundaries: ${boundaries.length} 个词时间戳`)
          } catch (e) {
            console.warn('[TTS] Failed to parse X-Word-Boundaries header:', e)
          }
        }

        const blob = await response.blob()
        if (!blob || blob.size === 0) throw new Error('Empty audio received')
        return { blob, boundaries }
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr || new Error('All Edge TTS endpoints failed')
  }

  const fetchEdgeTTSAudio = async (text: string): Promise<Blob> => {
    const res = await fetchEdgeTTSAudioWithBoundaries(text)
    return res.blob
  }

  // AI Voice: /audio/speech endpoint (self-hosted or cloud)
  const fetchAIVoiceAudio = async (text: string): Promise<Blob> => {
    if (!aiVoiceId.value) throw new Error('AI 语音：请先选择音色')

    const endpoint = aiVoiceEndpoint.value.replace(/\/+$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (aiVoiceApiKey.value) {
      headers['Authorization'] = `Bearer ${aiVoiceApiKey.value}`
    }

    const response = await fetch(`${endpoint}/audio/speech`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiVoiceModel.value,
        input: text,
        voice: aiVoiceId.value.trim(),
        response_format: 'mp3',
        stream: true,
      }),
      signal: AbortSignal.timeout(180000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMsg = `HTTP ${response.status}`
      try {
        const errJson = JSON.parse(errorText)
        if (errJson.error?.message) errorMsg += `: ${errJson.error.message}`
        else errorMsg += `: ${errorText.slice(0, 200)}`
      } catch {
        errorMsg += `: ${errorText.slice(0, 200)}`
      }
      throw new Error(errorMsg)
    }

    const blob = await response.blob()
    if (!blob || blob.size === 0) throw new Error('Empty audio received')
    return blob
  }

  const checkAIVoiceServer = async (): Promise<boolean> => {
    if (!aiVoiceEndpoint.value) {
      aiVoiceAvailable.value = false
      return false
    }
    try {
      const endpoint = aiVoiceEndpoint.value.replace(/\/+$/, '')
      // If no API key (self-hosted/local server), just check /health
      if (!aiVoiceApiKey.value) {
        const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(5000) })
        aiVoiceAvailable.value = response.ok
        return response.ok
      }
      // With API key: do a real TTS test request
      const response = await fetch(`${endpoint}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiVoiceApiKey.value}`,
        },
        body: JSON.stringify({
          model: aiVoiceModel.value,
          input: 'Hi',
          voice: aiVoiceId.value || `${aiVoiceModel.value}:anna`,
          response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(10000),
      })
      aiVoiceAvailable.value = response.ok
      return response.ok
    } catch {
      aiVoiceAvailable.value = false
      return false
    }
  }

  const prefetchEdgeTTS = async (startIndex: number) => {
    if (!isPlaying.value) return
    const endIndex = Math.min(startIndex + 3, paragraphNodes.value.length)
    for (let i = startIndex; i < endIndex; i++) {
      const cacheItem = getCacheItem(i)
      if (cacheItem.isFetching || cacheItem.isReady) continue
      const p = paragraphNodes.value[i]
      if (!p) continue
      const text = getCleanText(p)
      if (text.length < 2) { cacheItem.isReady = true; continue }
      cacheItem.isFetching = true
      cacheItem.text = text

      if (ttsProvider.value === 'ai_voice') {
        fetchAIVoiceAudio(text)
          .then((blob) => {
            if (!isPlaying.value) return
            cacheItem.audioBlob = blob
            cacheItem.audioUrl = URL.createObjectURL(blob)
            cacheItem.isReady = true
          })
          .catch((err) => { console.warn(`[TTS] Prefetch failed for paragraph ${i}:`, err); cacheItem.error = err; cacheItem.isReady = true })
          .finally(() => { cacheItem.isFetching = false })
      } else {
        fetchEdgeTTSAudioWithBoundaries(text)
          .then(({ blob, boundaries }) => {
            if (!isPlaying.value) return
            cacheItem.audioBlob = blob
            cacheItem.audioUrl = URL.createObjectURL(blob)
            cacheItem.boundaries = boundaries
            cacheItem.isReady = true
          })
          .catch((err) => { console.warn(`[TTS] Prefetch failed for paragraph ${i}:`, err); cacheItem.error = err; cacheItem.isReady = true })
          .finally(() => { cacheItem.isFetching = false })
      }
    }
  }

  const cleanupPrefetchCache = (currentIndex: number) => {
    const keysToDelete: number[] = []
    prefetchCache.value.forEach((item, index) => {
      if (index < currentIndex - 1) { if (item.audioUrl) URL.revokeObjectURL(item.audioUrl); keysToDelete.push(index) }
    })
    keysToDelete.forEach((key) => prefetchCache.value.delete(key))
  }

  const syncEdgeVoices = async (): Promise<EdgeVoice[]> => {
    const DEFAULT_SERVERS = [
      'http://p-plus.duckdns.org:5001',
      'http://powerplus.blogsyte.com:5001',
    ]
    let endpointsToTry = [edgeTTSEndpoint.value]
    for (const s of DEFAULT_SERVERS) {
      if (edgeTTSEndpoint.value && edgeTTSEndpoint.value.startsWith(s)) {
        endpointsToTry = [edgeTTSEndpoint.value, ...DEFAULT_SERVERS.filter(srv => srv !== edgeTTSEndpoint.value)]
        break
      }
    }

    for (const ep of endpointsToTry) {
      try {
        const cleanEp = ep.replace(/\/+$/, '')
        const response = await fetch(`${cleanEp}/voices`, { signal: AbortSignal.timeout(6000) })
        if (response.ok) {
          const data = await response.json()
          const list = Array.isArray(data) ? data : (data.voices || [])
          if (Array.isArray(list) && list.length > 0) {
            const map = new Map<string, EdgeVoice>()
            DEFAULT_EDGE_VOICES.forEach(v => map.set(v.id, v))
            list.forEach((v: any) => {
              const short = v.ShortName || v.name || v.id
              if (!short) return
              const friendly = v.FriendlyName || v.name || short
              const cleanName = friendly.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, '').replace(/ - .*$/, '')
              map.set(short, {
                id: short,
                name: map.get(short)?.name || cleanName,
                locale: v.Locale || map.get(short)?.locale || 'en-US',
                lang: v.LocaleName || v.Locale || map.get(short)?.lang || 'English',
                gender: (v.Gender || map.get(short)?.gender || 'female').toLowerCase() as any
              })
            })
            const merged = Array.from(map.values())
            edgeVoices.value = merged
            try {
              localStorage.setItem('moreader_cached_edge_voices', JSON.stringify(merged))
            } catch {}
            return merged
          }
        }
      } catch {}
    }
    return edgeVoices.value
  }

  const checkEdgeTTSServer = async (): Promise<boolean> => {
    const DEFAULT_SERVERS = [
      'http://p-plus.duckdns.org:5001',
      'http://powerplus.blogsyte.com:5001',
    ]
    let endpointsToTry = [edgeTTSEndpoint.value]
    for (const s of DEFAULT_SERVERS) {
      if (edgeTTSEndpoint.value && edgeTTSEndpoint.value.startsWith(s)) {
        endpointsToTry = [edgeTTSEndpoint.value, ...DEFAULT_SERVERS.filter(srv => srv !== edgeTTSEndpoint.value)]
        break
      }
    }

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(`${ep}/health`, { signal: AbortSignal.timeout(5000) })
        if (response.ok) {
          edgeTTSAvailable.value = true
          return true
        }
      } catch {}
    }
    edgeTTSAvailable.value = false
    return false
  }

  const findVoiceByURI = (voices: SpeechSynthesisVoice[], uri: string): SpeechSynthesisVoice | null => {
    if (!uri || voices.length === 0) return null
    let voice = voices.find(v => v.voiceURI === uri)
    if (voice) return voice
    const targetVoice = availableVoices.value.find(v => v.voiceURI === uri)
    if (targetVoice) { voice = voices.find(v => v.name === targetVoice.name); if (voice) return voice }
    return null
  }

  const getVoiceForText = (voices: SpeechSynthesisVoice[], text: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null
    if (selectedVoiceURI.value) { const selected = findVoiceByURI(voices, selectedVoiceURI.value); if (selected) return selected }
    const hasChinese = /[\u4e00-\u9fff]/.test(text)
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text)
    const hasKorean = /[\uac00-\ud7af]/.test(text)
    if (hasChinese) { const zhVoice = voices.find(v => v.lang?.startsWith('zh')); if (zhVoice) return zhVoice }
    if (hasJapanese) { const jaVoice = voices.find(v => v.lang?.startsWith('ja')); if (jaVoice) return jaVoice }
    if (hasKorean) { const koVoice = voices.find(v => v.lang?.startsWith('ko')); if (koVoice) return koVoice }
    const enVoice = voices.find(v => v.lang?.startsWith('en'))
    return enVoice || voices[0] || null
  }

  let boundaryCheckTimer: any = null
  const clearBoundaryTimer = () => {
    if (boundaryCheckTimer) {
      clearInterval(boundaryCheckTimer)
      boundaryCheckTimer = null
    }
  }

  const clearHighlight = () => {
    clearBoundaryTimer()
    paragraphNodes.value.forEach(p => {
      if (p) {
        p.classList.remove('tts-hl')
        p.style.backgroundColor = ''
        p.style.borderLeft = ''
        p.style.paddingLeft = ''
        p.style.transition = ''
        clearSentenceHighlight(p.ownerDocument || document)
      }
    })
    clearSentenceHighlight(document)
  }

  const highlightParagraph = (index: number) => {
    clearHighlight()
    const p = paragraphNodes.value[index]
    if (p) {
      p.classList.add('tts-hl')
      p.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
      p.style.borderLeft = '4px solid #3b82f6'
      p.style.paddingLeft = '8px'
      p.style.transition = 'all 0.2s ease'
      p.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const stop = () => {
    currentPlaySessionId++
    clearBoundaryTimer()
    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling speechSynthesis:', e) }
    if (currentAudio) {
      try {
        currentAudio.onplaying = null
        currentAudio.oncanplaythrough = null
        currentAudio.onended = null
        currentAudio.onerror = null
        currentAudio.pause()
        currentAudio.currentTime = 0
      } catch (e) { console.warn('Error stopping audio:', e) }
      currentAudio = null
    }
    if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null }
    clearPrefetchCache()
    isPlaying.value = false; isPaused.value = false; pausedIndex.value = -1; activeIndex.value = -1; clearHighlight()
  }

  const pause = () => {
    currentPlaySessionId++
    if (!isPlaying.value || isPaused.value) return
    isPaused.value = true; pausedIndex.value = activeIndex.value
    clearBoundaryTimer()
    try { window.speechSynthesis.cancel() } catch (e) { console.warn('Error canceling speechSynthesis:', e) }
    if (currentAudio) {
      currentAudio.onplaying = null
      currentAudio.oncanplaythrough = null
      currentAudio.onended = null
      currentAudio.onerror = null
      currentAudio.pause()
      currentAudio = null
    }
    if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null }
  }

  const playWithBrowserTTS = (index: number, sessionId: number) => {
    if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value || index >= paragraphNodes.value.length) {
      if (!isPaused.value && sessionId === currentPlaySessionId) stop()
      return
    }
    const p = paragraphNodes.value[index]
    if (!p) { playWithBrowserTTS(index + 1, sessionId); return }
    activeIndex.value = index
    highlightParagraph(index)
    const text = getCleanText(p)
    if (text.length < 2) { playWithBrowserTTS(index + 1, sessionId); return }

    const sentences = splitIntoSentences(text)
    if (sentences.length === 0) {
      playWithBrowserTTS(index + 1, sessionId)
      return
    }

    const ownerWindow = p.ownerDocument?.defaultView || window

    const playSentenceQueue = (sentIdx: number) => {
      if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value) return
      lockParagraphHighlight(p)
      if (sentIdx >= sentences.length) {
        clearSentenceHighlight(p.ownerDocument || document)
        playWithBrowserTTS(index + 1, sessionId)
        return
      }

      const sent = sentences[sentIdx]

      try {
        const utterance = new ownerWindow.SpeechSynthesisUtterance(sent.text)
        const voices = ownerWindow.speechSynthesis.getVoices()
        const voice = getVoiceForText(voices, sent.text)
        if (voice) { utterance.voice = voice; utterance.lang = voice.lang || 'zh-CN' }
        utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value))
        utterance.pitch = 1.0
        utterance.volume = 1.0

        // 声音真正响起时才高亮句子，彻底杜绝抢跑
        utterance.onstart = () => {
          if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
            highlightSentenceInElement(p, sent.start, sent.end, sent.text)
          }
        }

        utterance.onend = () => {
          if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
            playSentenceQueue(sentIdx + 1)
          }
        }
        utterance.onerror = (event) => {
          console.warn('[TTS] Browser utterance error on sentence', sentIdx, ':', event.error)
          if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
            playSentenceQueue(sentIdx + 1)
          }
        }

        ownerWindow.speechSynthesis.cancel()
        setTimeout(() => {
          if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
            ownerWindow.speechSynthesis.speak(utterance)
          }
        }, 40)
      } catch (e) {
        console.error('[TTS] Failed to create utterance for sentence:', e)
        if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) playSentenceQueue(sentIdx + 1)
      }
    }

    playSentenceQueue(0)
  }

  const playWithServerTTS = async (index: number, fetchFn: (text: string) => Promise<Blob>, sessionId: number) => {
    if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value || index >= paragraphNodes.value.length) {
      if (!isPaused.value && sessionId === currentPlaySessionId) stop()
      return
    }
    const p = paragraphNodes.value[index]
    if (!p) { await playWithServerTTS(index + 1, fetchFn, sessionId); return }
    activeIndex.value = index
    highlightParagraph(index)
    const text = getCleanText(p)
    if (text.length < 2) { await playWithServerTTS(index + 1, fetchFn, sessionId); return }
    clearBoundaryTimer()

    prefetchEdgeTTS(index + 1)
    try {
      let audioBlob: Blob
      let audioUrl: string
      let boundaries: WordBoundary[] | undefined

      const cacheItem = prefetchCache.value.get(index)
      if (cacheItem?.isReady && cacheItem.audioUrl && !cacheItem.error) {
        audioBlob = cacheItem.audioBlob!
        audioUrl = cacheItem.audioUrl
        boundaries = cacheItem.boundaries
        prefetchCache.value.delete(index)
      } else {
        if (ttsProvider.value === 'edge') {
          const res = await fetchEdgeTTSAudioWithBoundaries(text)
          audioBlob = res.blob
          audioUrl = URL.createObjectURL(audioBlob)
          boundaries = res.boundaries
        } else {
          audioBlob = await fetchFn(text)
          audioUrl = URL.createObjectURL(audioBlob)
        }
      }

      // 关键纪元检查：如果在异步获取音频期间，用户点击了停止或点击了其他段落，立即就地自毁抛弃！
      if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value) {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        return
      }

      // Capture blob if recording is active
      if (isRecordingTTS.value) {
        recordingBlobs.value.push(audioBlob)
        recordingText.value += text + '\n'
      }

      if (currentAudioUrl && currentAudioUrl !== audioUrl) URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = audioUrl
      currentAudio = new Audio(audioUrl)
      currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, speechRate.value))

      await new Promise<void>((resolve, reject) => {
        if (!currentAudio || sessionId !== currentPlaySessionId) { resolve(); return }
        currentAudio.oncanplaythrough = () => resolve()
        currentAudio.onerror = (e) => reject(new Error(`Audio load error: ${e}`))
        setTimeout(() => resolve(), 3000)
      })

      // 再次检查 Session ID
      if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value) {
        if (currentAudio) { currentAudio.pause(); currentAudio = null }
        if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null }
        return
      }

      // 拆分句子并准备声画时间轴
      const sentences = splitIntoSentences(text)
      if (sentences.length === 0 && text.trim().length > 0) {
        sentences.push({ text: text.trim(), start: 0, end: text.length })
      }

      // 基于同一套字符下标坐标系，精确对齐每个句子的毫秒发音时间戳
      let sentenceTimings: number[] = []

      if (boundaries && boundaries.length > 0) {
        sentenceTimings = sentences.map((sent, sIdx) => {
          // 查找第一个落在该句子字符区间 [sent.start, sent.end) 内的 WordBoundary
          const word = boundaries.find(b => b.s >= sent.start && b.s < sent.end)
          if (word && typeof word.o === 'number') {
            return Math.max(0, word.o)
          }
          // 若边界未落在区间内，取大于等于 sent.start 的最近词时间戳
          const nearest = boundaries.find(b => b.s >= sent.start)
          if (nearest && typeof nearest.o === 'number') {
            return Math.max(0, nearest.o)
          }
          return sIdx === 0 ? 0 : (sentenceTimings[sIdx - 1] ?? 0) + 1000
        })
      }

      // 校验时间轴是否有效递增
      const hasValidEdgeTimings =
        sentenceTimings.length === sentences.length &&
        (sentences.length === 1 || sentenceTimings.some((t, i) => i > 0 && t > sentenceTimings[i - 1]))

      let currentSentIdx = -1
      const setupTimer = () => {
        if (sentences.length === 0) return
        if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value) return

        if (!hasValidEdgeTimings) {
          const charCounts = sentences.map(s => s.text.replace(/\s/g, '').length || 1)
          const totalChars = charCounts.reduce((a, b) => a + b, 0)
          const durMs =
            currentAudio?.duration && !isNaN(currentAudio.duration) && currentAudio.duration > 0
              ? currentAudio.duration * 1000
              : (totalChars * 260) / Math.max(0.5, speechRate.value)

          let acc = 0
          sentenceTimings = [0]
          for (let i = 1; i < sentences.length; i++) {
            acc += (charCounts[i - 1] / totalChars) * durMs
            sentenceTimings.push(Math.round(acc))
          }
          console.log('[TTS HL ⚠️] 词时间戳未命中，启用自适应时长时间轴:', sentenceTimings, `总长: ${Math.round(durMs)}ms`)
        } else {
          console.log('[TTS HL 🎯] 精准命中 Edge 词边界毫秒时间轴:', sentenceTimings)
        }

        clearBoundaryTimer()
        const firstStart = sentenceTimings[0] ?? 0
        boundaryCheckTimer = setInterval(() => {
          if (sessionId !== currentPlaySessionId || !currentAudio || currentAudio.paused || currentAudio.ended) return
          const currentMs = currentAudio.currentTime * 1000

          // 方案 A 关键生命周期死锁：30ms 持续保底，确保整段播放期间段落淡蓝底色稳如泰山
          if (p) {
            lockParagraphHighlight(p)
          }

          // 首句防抢跑：播放进度未到达首句发音时刻前，暂缓点亮
          if (currentSentIdx < 0 && currentMs < firstStart) {
            return
          }

          let targetIdx = 0
          for (let i = sentenceTimings.length - 1; i >= 0; i--) {
            if (currentMs >= sentenceTimings[i]) {
              targetIdx = i
              break
            }
          }
          if (targetIdx !== currentSentIdx) {
            currentSentIdx = targetIdx
            const s = sentences[targetIdx]
            if (s) {
              console.log(`[TTS HL ⏱️] 毫秒级跳转到第 ${targetIdx + 1}/${sentences.length} 句: @${Math.round(currentMs)}ms (标记:${sentenceTimings[targetIdx]}ms) -> "${s.text.slice(0, 15)}..."`)
              highlightSentenceInElement(p, s.start, s.end, s.text)
            }
          }
        }, 30) // 30ms 极高灵敏度检测
      }

      // 等音频真正开始播放输出（onplaying 触发）才启动计时与高亮，彻底消除抢跑
      currentAudio.onplaying = () => {
        if (sessionId === currentPlaySessionId) {
          setupTimer()
        }
      }

      await currentAudio.play()
      // 保底触发（防止某些浏览器环境漏发 onplaying）
      setTimeout(() => {
        if (sessionId === currentPlaySessionId && currentSentIdx < 0 && currentAudio && !currentAudio.paused) {
          setupTimer()
        }
      }, 250)

      cleanupPrefetchCache(index)
      prefetchEdgeTTS(index + 1)

      currentAudio.onended = () => {
        clearBoundaryTimer()
        clearSentenceHighlight(p.ownerDocument || document)
        if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
          playWithServerTTS(index + 1, fetchFn, sessionId)
        }
      }
      currentAudio.onerror = (e) => {
        clearBoundaryTimer()
        clearSentenceHighlight(p.ownerDocument || document)
        console.error('[TTS] Audio playback error:', e)
        if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
          playWithBrowserTTS(index, sessionId)
        }
      }
    } catch (error) {
      clearBoundaryTimer()
      clearSentenceHighlight(p.ownerDocument || document)
      console.error('[TTS] Error:', error)
      if (sessionId === currentPlaySessionId && isPlaying.value && !isPaused.value) {
        playWithBrowserTTS(index, sessionId)
      }
    }
  }

  const playSequence = (index: number, sessionId: number) => {
    if (sessionId !== currentPlaySessionId || !isPlaying.value || isPaused.value) return
    if (ttsProvider.value === 'edge') {
      playWithServerTTS(index, fetchEdgeTTSAudio, sessionId)
    } else if (ttsProvider.value === 'ai_voice') {
      playWithServerTTS(index, fetchAIVoiceAudio, sessionId)
    } else {
      playWithBrowserTTS(index, sessionId)
    }
  }

  const start = (nodes: HTMLElement[], startIndex: number = 0) => {
    if (!isPaused.value) { stop(); clearPrefetchCache() }
    paragraphNodes.value = nodes.filter(p => {
      if (!p) return false
      const text = getCleanText(p)
      if (text.length <= 1) return false
      if (!/[\u4e00-\u9fff\u3040-\u309f\u30ffa-zA-Z0-9]/.test(text)) return false
      return true
    })
    if (paragraphNodes.value.length > 0) {
      const sessionId = ++currentPlaySessionId
      isPlaying.value = true; isPaused.value = false
      playSequence(startIndex, sessionId)
    }
  }

  const speakSelectionWithBrowserTTS = (text: string, element?: HTMLElement) => {
    const targetWindow = element?.ownerDocument?.defaultView || window
    try {
      const utterance = new targetWindow.SpeechSynthesisUtterance(text.trim())
      const voices = targetWindow.speechSynthesis.getVoices()
      const voice = getVoiceForText(voices, text)
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang || 'zh-CN' }
      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate.value)); utterance.pitch = 1.0; utterance.volume = 1.0
      utterance.onend = () => { isPlaying.value = false }
      utterance.onerror = () => { isPlaying.value = false }
      targetWindow.speechSynthesis.cancel()
      setTimeout(() => { targetWindow.speechSynthesis.speak(utterance) }, 50)
      isPlaying.value = true
    } catch (e) { console.error('[TTS] speakSelection error:', e) }
  }

  const speakSelectionWithServerTTS = async (text: string, fetchFn: (text: string) => Promise<Blob>) => {
    const sessionId = ++currentPlaySessionId
    try {
      const audioBlob = await fetchFn(text)
      if (sessionId !== currentPlaySessionId) return
      if (!audioBlob || audioBlob.size === 0) throw new Error('Empty audio')
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl)
      currentAudioUrl = URL.createObjectURL(audioBlob)
      currentAudio = new Audio(currentAudioUrl)
      currentAudio.playbackRate = Math.max(0.5, Math.min(2.0, speechRate.value))
      await currentAudio.play()
      currentAudio.onended = () => { if (sessionId === currentPlaySessionId) isPlaying.value = false }
      currentAudio.onerror = () => { if (sessionId === currentPlaySessionId) { isPlaying.value = false; speakSelectionWithBrowserTTS(text) } }
      isPlaying.value = true
    } catch (error) {
      if (sessionId === currentPlaySessionId) {
        console.error('[TTS] Selection error:', error)
        speakSelectionWithBrowserTTS(text)
      }
    }
  }

  const speakSelection = (text: string, element?: HTMLElement) => {
    stop()
    const cleaned = element ? getCleanText(element) : cleanTtsString(text)
    if (!cleaned || cleaned.length < 1) return
    if (ttsProvider.value === 'edge') {
      speakSelectionWithServerTTS(cleaned, fetchEdgeTTSAudio)
    } else if (ttsProvider.value === 'ai_voice') {
      speakSelectionWithServerTTS(cleaned, fetchAIVoiceAudio)
    } else {
      speakSelectionWithBrowserTTS(cleaned, element)
    }
  }

  // Full book TTS: generate audio for entire book text
  const generateBookAudio = async (texts: string[], onProgress?: (index: number, total: number) => void): Promise<Blob[]> => {
    const fetchFn = ttsProvider.value === 'ai_voice' ? fetchAIVoiceAudio : fetchEdgeTTSAudio
    const blobs: Blob[] = []
    const cleanedTexts = texts.map(t => cleanTtsString(t)).filter(t => t.length > 1)
    for (let i = 0; i < cleanedTexts.length; i++) {
      if (onProgress) onProgress(i + 1, cleanedTexts.length)
      try {
        const blob = await fetchFn(cleanedTexts[i])
        blobs.push(blob)
      } catch (e) {
        console.warn(`[Full TTS] Failed for segment ${i}:`, e)
      }
    }
    return blobs
  }

  // Recording TTS output: start/stop recording during playback
  const startRecordingTTS = () => {
    isRecordingTTS.value = true
    recordingBlobs.value = []
    recordingText.value = ''
  }

  const stopRecordingTTS = (): { blob: Blob | null; url: string; text: string } | null => {
    isRecordingTTS.value = false
    if (recordingBlobs.value.length === 0) return null
    const merged = new Blob(recordingBlobs.value, { type: 'audio/mpeg' })
    const url = URL.createObjectURL(merged)
    const text = recordingText.value
    recordingBlobs.value = []
    recordingText.value = ''
    return { blob: merged, url, text }
  }

  // Per-chapter book TTS: extract text per chapter, generate audio per chapter
  const generateChapterAudios = async (
    chapters: { title: string; texts: string[] }[],
    onProgress?: (chapterIndex: number, totalChapters: number, paragraphIndex: number, totalParagraphs: number) => void
  ): Promise<{ title: string; blob: Blob; url: string; paragraphCount: number }[]> => {
    const fetchFn = ttsProvider.value === 'ai_voice' ? fetchAIVoiceAudio : fetchEdgeTTSAudio
    const results: { title: string; blob: Blob; url: string; paragraphCount: number }[] = []

    for (let ci = 0; ci < chapters.length; ci++) {
      const chapter = chapters[ci]
      const chapterBlobs: Blob[] = []

      for (let pi = 0; pi < chapter.texts.length; pi++) {
        if (onProgress) onProgress(ci + 1, chapters.length, pi + 1, chapter.texts.length)
        try {
          const blob = await fetchFn(chapter.texts[pi])
          chapterBlobs.push(blob)
        } catch (e) {
          console.warn(`[Chapter TTS] Failed for chapter "${chapter.title}" paragraph ${pi}:`, e)
        }
      }

      if (chapterBlobs.length > 0) {
        const merged = new Blob(chapterBlobs, { type: 'audio/mpeg' })
        results.push({
          title: chapter.title || `Chapter ${ci + 1}`,
          blob: merged,
          url: URL.createObjectURL(merged),
          paragraphCount: chapterBlobs.length,
        })
      }
    }

    return results
  }

  const skipNext = () => {
    if (isPlaying.value && activeIndex.value < paragraphNodes.value.length - 1) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel(); clearPrefetchCache();
      const sessionId = ++currentPlaySessionId
      playSequence(activeIndex.value + 1, sessionId)
    }
  }

  const skipPrevious = () => {
    if (isPlaying.value && activeIndex.value > 0) {
      if (currentAudio) { currentAudio.onended = null; currentAudio.pause() }
      window.speechSynthesis.cancel(); clearPrefetchCache();
      const sessionId = ++currentPlaySessionId
      playSequence(activeIndex.value - 1, sessionId)
    }
  }

  // Persist settings
  const persistSettings = () => {
    saveTTSSettings({
      provider: ttsProvider.value,
      edgeEndpoint: edgeTTSEndpoint.value,
      edgeVoice: edgeTTSVoice.value,
      edgeRate: edgeTTSRate.value,
      edgePitch: edgeTTSPitch.value,
      edgeApiKey: edgeTTSApiKey.value,
      speechRate: speechRate.value,
      selectedVoiceURI: selectedVoiceURI.value,
      aiVoiceProvider: aiVoiceProvider.value,
      aiVoiceConfigs: aiVoiceConfigs.value,
    })
  }

  // AI Voice helper: get voices for selected model
  const getAIVoicesForModel = computed((): AIVoice[] => {
    return AI_VOICES.filter(v => v.model === aiVoiceModel.value)
  })

  return {
    isPlaying: computed(() => isPlaying.value),
    isPaused: computed(() => isPaused.value),
    pausedIndex: computed(() => pausedIndex.value),
    activeIndex: computed(() => activeIndex.value),
    speechRate, selectedVoiceURI,
    availableVoices: computed(() => availableVoices.value),
    voicesLoaded: computed(() => voicesLoaded.value),
    ttsProvider,
    edgeTTSEndpoint, edgeTTSVoice, edgeTTSRate, edgeTTSPitch, edgeTTSApiKey, edgeTTSAvailable,
    edgeVoices: computed(() => edgeVoices.value),
    edgeTTSVoices: computed(() => edgeVoices.value),
    // AI Voice (independent config)
    aiVoiceEndpoint, aiVoiceApiKey, aiVoiceModel, aiVoiceId, aiVoiceAvailable,
    aiVoices: computed(() => AI_VOICES),
    aiVoicesForModel: getAIVoicesForModel,
    start, stop, pause, speakSelection, skipNext, skipPrevious,
    clearHighlight, highlightParagraph,
    generateBookAudio,
    generateChapterAudios,
    startRecordingTTS, stopRecordingTTS,
    isRecordingTTS: computed(() => isRecordingTTS.value),
    checkEdgeTTSServer,
    syncEdgeVoices,
    checkAIVoiceServer,
    setRate: (rate: number) => { speechRate.value = rate; persistSettings() },
    setVoice: (uri: string | null) => { selectedVoiceURI.value = uri || ''; persistSettings() },
    setProvider: (p: TTSProvider) => { ttsProvider.value = p; persistSettings() },
    setTTSProvider: (p: TTSProvider) => { ttsProvider.value = p; persistSettings() },
    setEdgeTTSEndpoint: (url: string) => { edgeTTSEndpoint.value = url; persistSettings() },
    setEdgeTTSVoice: (voice: string) => { edgeTTSVoice.value = voice; persistSettings() },
    setEdgeVoice: (voice: string) => { edgeTTSVoice.value = voice; persistSettings() },
    setEdgeTTSRate: (rate: string) => { edgeTTSRate.value = rate; persistSettings() },
    setEdgeTTSPitch: (pitch: string) => { edgeTTSPitch.value = pitch; persistSettings() },
    setEdgeTTSApiKey: (k: string) => { edgeTTSApiKey.value = k; persistSettings() },
    setAIVoiceEndpoint: (url: string) => { aiVoiceEndpoint.value = url; persistSettings() },
    setAIVoiceApiKey: (k: string) => { aiVoiceApiKey.value = k; persistSettings() },
    setAIVoiceModel: (m: AIVoiceModel) => { aiVoiceModel.value = m; persistSettings() },
    setAIVoiceId: (id: string) => { aiVoiceId.value = id; persistSettings() },
    setAIVoiceProvider: (p: string) => { aiVoiceProvider.value = p; persistSettings() },
    aiVoiceProvider: computed(() => aiVoiceProvider.value),
    refreshVoices: loadVoices,
  }
})
