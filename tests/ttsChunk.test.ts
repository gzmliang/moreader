/**
 * 【v2.10.1 验收测试】超长段落分块合成 + 动态超时
 *
 * 背景（真实现场）：
 *   1. Edge TTS 一次请求整段 2000~6000 字符时，合成本身要 10~50 秒，前端 15 秒硬超时
 *      会把「后台正在拼命合成」误判成失败 → 静默回退浏览器语音；
 *   2. 长段落的词时间戳响应头（X-Word-Boundaries）可达数十 KB，被 nginx 默认缓冲
 *      拦成 502 → 同样回退浏览器语音。
 *
 * 修复思路：把超长段落按句子边界切成 <=1200 字符的块，逐块合成、顺序连播，
 * 并且用「块内坐标 + offset」换算回段落洗净文本坐标 —— 高亮必须仍然 1:1 对齐。
 *
 * 本测试的核心不变量（分块后每一句都必须成立）：
 *   getCleanText(绿条 span) === 该句语音文本
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCleanText,
  splitIntoSentences,
  splitTextForTts,
  ttsTimeoutForText,
  TTS_CHUNK_MAX_CHARS,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

/** 造一段真实长度的英文长段落（约 2600 字符，必然分块） */
const LONG_EN = [
  'Shahrazad said to Shahriyar that in a city of Persia, on the borders of your majesty realms, there lived a merchant who had great wealth and many servants.',
  'He had a son named Ali, who was brave and handsome, and who loved to ride out at dawn to see the caravans come in from the desert roads.',
  'One day the merchant called his son to him and said, "My son, the time has come for you to learn the trade by which our family has lived for seven generations."',
  'Ali bowed and answered, "I am ready, father, and I will do whatever you ask of me, for I know that your wisdom has never failed us in the years of want."',
  'And so it was that the young man took charge of the ledger, the keys, and the long caravan route that led from the city gates to the far ports of the eastern sea.',
  'For many months he prospered, and the name of his house was spoken with respect in every market between the mountains and the shore.',
  'But fortune, as the old books tell us, turns like a wheel: one night a storm scattered the ships, and with them went the greater part of his inheritance.',
  'Still Ali did not despair, for he remembered the words of his father, "A patient man digs his well deeper than a hasty man digs his grave."',
].join(' ') + ' ' + [
  'The next morning the young merchant rose before the sun and walked down to the harbour, where the boats lay quiet and the fishermen mended their nets in silence.',
  'He counted the crates that remained, wrote the numbers in his book, and resolved that he would rebuild what the storm had taken, one honest bargain at a time.',
  'It is said that those who read these pages may learn from his patience, for patience is the treasure that no thief can carry away and no fire can burn.',
].join(' ')

/** 造一段中文长段落（约 1400 字，必然分块） */
const LONG_ZH = ([
  '相传在古代，有一位商人，家中十分富有，仆从成群，仓库里堆满了丝绸、香料和各地的奇珍。',
  '他有一个儿子，名叫阿里，生得眉清目秀，性情豪爽，最喜欢在黎明时分骑马出城，去看沙漠尽头驶来的驼队。',
  '有一天，商人把儿子叫到跟前，对他说道：“孩子，是时候让你学会我们家七代人赖以生存的手艺了。”',
  '阿里躬身答道：“父亲，我已准备好，您吩咐什么我就做什么，因为这些年来您的见识从未让我们失望过。”',
  '于是年轻人接管了账本、钥匙，以及那条从城门一直通到东方海港的漫长商道。',
  '许多个月里，他经营得十分顺利，他家商号的名字在山与海之间每一个集市上都被人们尊敬地提起。',
  '然而正如古书所说，命运像轮子一样转动：一天夜里，一场风暴吹散了船队，也带走了他大部分的家产。',
  '阿里并没有绝望，因为他记得父亲的话：“有耐心的人挖的井，比急躁的人挖的坟更深。”',
].join('') + [
  '从此以后，阿里每天天不亮就起身，走到港口去看那些静静停泊的船只，看渔夫一言不发地补网。',
  '他把剩下的箱子一一清点，把数目记在账本上，下定决心要用一桩又一桩公道的买卖重新挣回家业。',
  '据说读到这些故事的人都能从他的耐心里学到东西，因为耐心是盗贼搬不走、大火烧不掉的宝藏。',
].join('')).repeat(3)

describe('splitTextForTts —— 超长段落分块', () => {
  it('短段落原样返回单块（offset = 0），保证短段落路径零变化', () => {
    const short = 'Hello world. This is short.'
    const chunks = splitTextForTts(short)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(short)
    expect(chunks[0].offset).toBe(0)
  })

  it('空文本返回空数组', () => {
    expect(splitTextForTts('')).toEqual([])
  })

  it('英文长段落被切成多块，每块不超过上限', () => {
    const chunks = splitTextForTts(LONG_EN)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(TTS_CHUNK_MAX_CHARS)
      expect(c.text).toBe(c.text.trim())
      expect(c.text.length).toBeGreaterThan(0)
    }
  })

  it('中文长段落（无空格）同样按句子边界正确分块', () => {
    const chunks = splitTextForTts(LONG_ZH)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(TTS_CHUNK_MAX_CHARS)
  })

  it('块文本必须等于原文按 offset 切出来的片段（高亮坐标对齐的根基）', () => {
    for (const src of [LONG_EN, LONG_ZH]) {
      const chunks = splitTextForTts(src)
      for (const c of chunks) {
        expect(src.slice(c.offset, c.offset + c.text.length)).toBe(c.text)
      }
      // offset 必须严格递增且不重叠
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].offset).toBeGreaterThanOrEqual(chunks[i - 1].offset + chunks[i - 1].text.length)
      }
    }
  })

  it('块与块之间没有丢字：把块按 offset 放回原文，覆盖率 100%', () => {
    const src = LONG_EN
    const chunks = splitTextForTts(src)
    const covered = new Array(src.length).fill(false)
    for (const c of chunks) {
      for (let i = c.offset; i < c.offset + c.text.length; i++) covered[i] = true
    }
    // 只允许句间空白未被覆盖（trim 掉的空格）
    for (let i = 0; i < src.length; i++) {
      if (!covered[i]) expect(src[i]).toMatch(/\s/)
    }
  })

  it('单句本身超长时硬切（不得死循环、不得超上限）', () => {
    const monster = 'word '.repeat(600).trim() + '!' // 一个 3000 字符的“句子”
    const chunks = splitTextForTts(monster)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(TTS_CHUNK_MAX_CHARS)
    const joined = chunks.map(c => c.text).join(' ')
    expect(joined.replace(/\s+/g, ' ')).toContain('word word')
  })
})

describe('ttsTimeoutForText —— 动态超时', () => {
  it('短段落至少 20 秒（旧行为 15 秒太短）', () => {
    expect(ttsTimeoutForText('hi')).toBeGreaterThanOrEqual(20000)
    expect(ttsTimeoutForText('a'.repeat(2))).toBe(20016)
    expect(ttsTimeoutForText('a'.repeat(300))).toBeGreaterThanOrEqual(20000)
  })

  it('段落越长超时越宽松', () => {
    const small = ttsTimeoutForText('a'.repeat(500))
    const big = ttsTimeoutForText('a'.repeat(2000))
    expect(big).toBeGreaterThan(small)
  })

  it('封顶 120 秒，绝不无限等待', () => {
    expect(ttsTimeoutForText('a'.repeat(50000))).toBe(120000)
  })
})

describe('分块后高亮仍然 1:1 对齐（核心不变量）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const checkParagraph = (label: string, raw: string) => {
    const p = document.createElement('p')
    p.textContent = raw
    document.body.appendChild(p)

    const clean = getCleanText(p)
    const chunks = splitTextForTts(clean)
    expect(chunks.length, `${label}: 应被切成多块`).toBeGreaterThan(1)

    let sentenceCount = 0
    for (const chunk of chunks) {
      const sents = splitIntoSentences(chunk.text)
      expect(sents.length, `${label}: 每块都应能切出句子`).toBeGreaterThan(0)
      for (const s of sents) {
        // 完全模拟 playWithChunkedServerTTS 的高亮调用：块内坐标 + offset
        highlightSentenceInElement(p, s.start + chunk.offset, s.end + chunk.offset, s.text)
        const span = p.querySelector('span[data-tts-sentence="1"]') as HTMLElement | null
        expect(span, `${label}: 应产生绿条`).not.toBeNull()
        expect(getCleanText(span!), `${label}: 绿条文本必须等于语音读的这一句`).toBe(s.text)
        sentenceCount++
      }
    }
    clearSentenceHighlight(document)
    expect(sentenceCount).toBeGreaterThan(8)
  }

  it('英文长段落：每一句的绿条范围 = 该句文本', () => {
    checkParagraph('英文', LONG_EN)
  })

  it('中文长段落：每一句的绿条范围 = 该句文本', () => {
    checkParagraph('中文', LONG_ZH)
  })

  it('带拼音注音的长中文段落：分块后高亮依旧不漂移', () => {
    const raw = LONG_ZH.replace('阿里，生得眉清目秀', '<ruby>阿里<rt>ā lǐ</rt></ruby>，生得眉清目秀')
    checkParagraph('拼音', raw)
  })
})
