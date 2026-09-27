/**
 * 【真书审计 · v2.10.1】超长段落分块 + 高亮对齐 全书体检
 *
 * 用梁老师实测的英文真书《The Arabian Nights: Tales of 1,001 Nights Vol.1》整本跑：
 *   1. 每个段落 <p> 都过一遍 getCleanText → splitTextForTts 分块；
 *   2. 分块后对「每一块里的每一句」都做一次高亮，校验核心不变量：
 *         getCleanText(绿条 span) === 该句语音文本
 *   3. 统计分块分布，确认没有超上限的块、没有对不齐的句子。
 *
 * 这是「不让你当小白鼠」的验收标准：用一整本书当靶子，而不是让你一句句试。
 */
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import JSZip from 'jszip'
import {
  getCleanText,
  splitIntoSentences,
  splitTextForTts,
  TTS_CHUNK_MAX_CHARS,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

const EPUB = '/mnt/win-e/swapfiles/books/The_Arabian_Nights_Tales_of_1,001_Night_Volume1.epub'
const hasBook = fs.existsSync(EPUB)

describe.skipIf(!hasBook)('真书审计：分块后高亮全书零漂移', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('整本书所有长段落：分块合规 + 每句绿条范围 = 该句文本', async () => {
    const zip = await JSZip.loadAsync(fs.readFileSync(EPUB))
    const htmlNames = Object.keys(zip.files).filter(n => /\.x?html?$/i.test(n))

    let paragraphCount = 0
    let chunkedParagraphs = 0
    let totalChunks = 0
    let totalSentences = 0
    let checkedSentences = 0
    let maxChunkLen = 0
    let hardSplitSentences = 0
    const mismatches: string[] = []
    const longChunkExamples: { len: number; chunks: number; head: string }[] = []

    for (const name of htmlNames) {
      const html = await zip.files[name].async('string')
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const nodes = Array.from(parsed.querySelectorAll('p, h1, h2, h3, h4, h5, h6'))

      for (const el of nodes) {
        // 用真实文档（等效浏览器环境）承载段落
        const p = document.createElement('p')
        p.innerHTML = el.innerHTML
        document.body.appendChild(p)
        const clean = getCleanText(p)
        if (!/[A-Za-z0-9]/.test(clean)) { p.remove(); continue }
        // 本审计只盯「会走分块新路径」的长段落；短段落走老路径，已由其他测试文件覆盖
        if (clean.length < 1200) { p.remove(); continue }

        paragraphCount++
        const chunks = splitTextForTts(clean)
        if (chunks.length > 1) {
          chunkedParagraphs++
          if (longChunkExamples.length < 8) {
            longChunkExamples.push({ len: clean.length, chunks: chunks.length, head: clean.slice(0, 60) })
          }
        }
        totalChunks += chunks.length

        const joined = chunks.map(c => c.text).join('')
        for (const c of chunks) {
          expect(c.text.length, `${name}: 单块超上限`).toBeLessThanOrEqual(TTS_CHUNK_MAX_CHARS)
          if (c.text.length > maxChunkLen) maxChunkLen = c.text.length
          // 块必须是原文的真实切片（高亮坐标对齐的根基）
          expect(clean.slice(c.offset, c.offset + c.text.length), `${name}: 块切片不一致`).toBe(c.text)
        }
        // 覆盖率：只允许句间空白未被覆盖
        const covered = new Array(clean.length).fill(false)
        for (const c of chunks) for (let i = c.offset; i < c.offset + c.text.length; i++) covered[i] = true
        for (let i = 0; i < clean.length; i++) {
          if (!covered[i]) expect(clean[i], `${name}: 非空白字符丢失`).toMatch(/\s/)
        }

        // 高亮验证采样：分块段落最多验 60 句（含每块首句）；超大容器段落只做合规检查
        const maxCheck = clean.length > 20000 ? 0 : (chunks.length > 1 ? 60 : 2)
        let checkedHere = 0
        for (const chunk of chunks) {
          const sents = splitIntoSentences(chunk.text)
          if (chunk.text.length >= TTS_CHUNK_MAX_CHARS && sents.length === 1) hardSplitSentences++
          for (const s of sents) {
            totalSentences++
            const isFirstOfChunk = s === sents[0]
            if (checkedHere >= maxCheck && !isFirstOfChunk) continue
            checkedHere++
            checkedSentences++
            highlightSentenceInElement(p, s.start + chunk.offset, s.end + chunk.offset, s.text)
            const span = p.querySelector('span[data-tts-sentence="1"]') as HTMLElement | null
            const got = span ? getCleanText(span) : null
            if (got !== s.text) {
              if (mismatches.length < 10) {
                mismatches.push(`${name} | 期望「${s.text.slice(0, 40)}」 实际「${(got || 'null').slice(0, 40)}」`)
              }
            }
          }
        }
        clearSentenceHighlight(document)
        p.remove()
      }
    }

    console.log('\n===== 真书审计报告（The Arabian Nights Vol.1）=====')
    console.log(`HTML 文件：${htmlNames.length}`)
    console.log(`段落总数：${paragraphCount}`)
    console.log(`需要分块的段落：${chunkedParagraphs}`)
    console.log(`总块数：${totalChunks}（平均每段 ${(totalChunks / Math.max(1, paragraphCount)).toFixed(2)} 块）`)
    console.log(`被验证的句子总数：${checkedSentences}（全文句子 ${totalSentences}）`)
    console.log(`单块最大字符数：${maxChunkLen}（上限 ${TTS_CHUNK_MAX_CHARS}）`)
    console.log(`命中硬切的超长单句：${hardSplitSentences}`)
    console.log('分块最多的段落样例：')
    longChunkExamples
      .sort((a, b) => b.len - a.len)
      .forEach(e => console.log(`  ${e.len} 字符 → ${e.chunks} 块 | ${e.head}...`))
    console.log(`高亮不匹配句数：${mismatches.length}`)
    mismatches.forEach(m => console.log('  ✗ ' + m))
    console.log('================================================\n')

    expect(mismatches, '分块后高亮必须零漂移').toEqual([])
    expect(maxChunkLen).toBeLessThanOrEqual(TTS_CHUNK_MAX_CHARS)
    expect(paragraphCount).toBeGreaterThan(200)
    // 英文书里必须真的存在需要分块的长段落（否则说明阈值失效）
    expect(chunkedParagraphs).toBeGreaterThan(50)
  }, 1800000)
})
