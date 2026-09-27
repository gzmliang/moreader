/**
 * 【方案A 验收测试】「洗净文本 → 原始 DOM 坐标」映射表高亮
 *
 * 病根回顾：朗读用的是 getCleanText() 洗过的文本（删拼音/脚注/装饰符号、折叠换行、删汉字间空格），
 * 而高亮却拿「洗净文本的字符偏移」去数「原始 DOM 的字符」→ 绿条整体漂移，
 * 表现为「这一句没亮」或「绿条亮到上一句去了」。
 *
 * 本测试的核心不变量（对每一句都必须成立）：
 *     getCleanText(绿条实际包裹的 span) === 该句文本
 * 即「绿条的视觉范围」与「语音实际读的内容」严格等价。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCleanText,
  getCleanTextWithMap,
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

interface CheckResult {
  clean: string
  sents: { text: string; start: number; end: number }[]
  /** 每句高亮后：语音文本 => 绿条洗净后的文本 */
  rows: string[]
  /** 最后一句高亮留下的 span（未被清除） */
  lastSpan: HTMLElement | null
  /** 最后一句高亮后 span 里的原始 DOM 文本（含拼音等注释） */
  lastSpanRaw: string
}

/** 逐句高亮并校验核心不变量 */
function highlightAllSentencesAndCheck(p: HTMLElement, label: string): CheckResult {
  const clean = getCleanText(p)
  const sents = splitIntoSentences(clean)
  expect(sents.length, `${label}: 应能切出句子`).toBeGreaterThan(0)

  const rows: string[] = []
  let lastSpan: HTMLElement | null = null
  let lastSpanRaw = ''

  for (const s of sents) {
    clearSentenceHighlight(document)
    highlightSentenceInElement(p, s.start, s.end, s.text)

    const span = p.querySelector('span[data-tts-sentence="1"], span.tts-sentence-hl') as HTMLElement | null
    const got = span ? getCleanText(span) : '[未高亮]'
    rows.push(`${s.text}  =>  ${got}`)
    expect(
      got,
      `${label}\n  语音读的: ${JSON.stringify(s.text)}\n  绿条亮的: ${JSON.stringify(got)}`
    ).toBe(s.text)

    lastSpan = span
    lastSpanRaw = span ? span.textContent || '' : ''
  }
  return { clean, sents, rows, lastSpan, lastSpanRaw }
}

describe('方案A：映射表高亮（坐标对齐）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('【拼音】中文括号拼音被清洗后，绿条绝不吃掉前后文字（伊索寓言真实样本）', () => {
    const p = document.createElement('p')
    p.className = 'opt'
    p.innerHTML = 'D) 必须闭目（mù）静坐半小时'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '拼音括号样本')
    expect(r.clean).toBe('D) 必须闭目静坐半小时')
    expect(r.sents.length).toBe(1)
    // 绿条视觉上覆盖整句（含屏幕上的拼音注释），而不是像修复前那样只包到「（mù）静」
    expect(r.lastSpanRaw).toBe('D) 必须闭目（mù）静坐半小时')
  })

  it('【装饰符号】段中符号被清洗后，后一句不会吞掉符号与空格（Owls 真实样本）', () => {
    const p = document.createElement('p')
    p.className = 'CRT1'
    p.innerHTML = 'He closed the book. ★ Then he went home.'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '装饰符号样本')
    expect(r.clean).toBe('He closed the book. Then he went home.')
    expect(r.sents.length).toBe(2)
    // 修复前：第二句会吞掉「★ 」变成「★ Then he went home.」
    expect(r.lastSpanRaw).toBe('Then he went home.')
  })

  it('【真实样本回归】Owls 版权页原文（含 • 分隔）', () => {
    const p = document.createElement('p')
    p.className = 'CRT1'
    p.innerHTML = 'www.twitter.com/fsgbooks • www.facebook.com/fsgbooks'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, 'Owls 版权页')
    expect(r.clean).toBe('www.twitter.com/fsgbooks www.facebook.com/fsgbooks')
    expect(r.lastSpanRaw).toBe('www.twitter.com/fsgbooks • www.facebook.com/fsgbooks')
  })

  it('【多句段落】段内每一句都能精准高亮，且不互相污染', () => {
    const p = document.createElement('p')
    p.innerHTML =
      '花园中央是一株枝叶繁茂的玫瑰。玫瑰花底下一只蜗牛（wō niú）缩在自己的硬壳里。它做了一（yī）番大事。'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '多句段落')
    expect(r.sents.length).toBe(3)
    // 第二句的绿条在屏幕上也必须把拼音括号圈进去（视觉连贯）
    expect(r.rows[1]).toContain('玫瑰花底下一只蜗牛')
  })

  it('【ruby 注音】古诗词 ruby 结构：绿条跨多个 ruby 元素也不破坏注音排版', () => {
    const p = document.createElement('p')
    p.innerHTML =
      '<ruby>江<rt>jiāng</rt></ruby><ruby>南<rt>nán</rt></ruby>可采莲，<ruby>莲<rt>lián</rt></ruby>叶何田田。'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, 'ruby 注音')
    expect(r.clean).toBe('江南可采莲，莲叶何田田。')
    expect(r.sents.length).toBe(1)

    // 注音排版必须完好无损（rt 节点仍在，且没有被拆坏）
    const rts = p.querySelectorAll('rt')
    expect(rts.length).toBe(3)
    expect(Array.from(rts).map((x) => x.textContent).join(',')).toBe('jiāng,nán,lián')
    // 绿条跨多个 ruby 元素时，注音仍留在绿条内部（排版不破）；洗净后与语音文本一致
    expect(r.lastSpanRaw).toContain('可采莲')
    expect(r.lastSpanRaw).toContain('jiāng')
  })

  it('【脚注角标】中间夹着 sup 脚注时，下一句从正文首字开始高亮', () => {
    const p = document.createElement('p')
    p.innerHTML = '他说了一句话。<sup>1</sup>然后他就走了。'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '脚注角标')
    expect(r.sents.length).toBe(2)
    expect(r.sents[1].text).toBe('然后他就走了。')
    expect(r.lastSpanRaw).toBe('然后他就走了。')
  })

  it('【换行缩进】XHTML 排版换行导致空白折叠时，偏移依然对齐', () => {
    const p = document.createElement('p')
    p.innerHTML = 'First sentence here.\n      Second sentence follows.\n      Third one ends it.'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '换行缩进')
    expect(r.sents.length).toBe(3)
    expect(r.lastSpanRaw).toBe('Third one ends it.')
  })

  it('【映射表自检】map.text 必须与 getCleanText 完全一致，且逐字符落点有效', () => {
    const p = document.createElement('p')
    p.innerHTML =
      '<ruby>江<rt>jiāng</rt></ruby>南可采莲。<span class="note">[1]</span>此处（cǐ chù）有★符号。'
    document.body.appendChild(p)

    const map = getCleanTextWithMap(p)
    expect(map).not.toBeNull()
    expect(map!.text).toBe(getCleanText(p))

    // 每一个字符都必须能落到真实的文本节点上，且节点内偏移合法
    for (let i = 0; i < map!.text.length; i++) {
      const node = map!.nodes[i]
      expect(node, `第 ${i} 个字符无落点`).not.toBeNull()
      const off = map!.offsets[i]
      expect(off).toBeGreaterThanOrEqual(0)
      expect(off).toBeLessThan((node!.data || '').length)
    }
  })

  it('【回归】纯英文无清洗差异段落，行为与旧逻辑一致', () => {
    const p = document.createElement('p')
    p.innerHTML = 'This is the first sentence. And this is the second one. Done.'
    document.body.appendChild(p)

    const r = highlightAllSentencesAndCheck(p, '纯英文段落')
    expect(r.sents.length).toBe(3)
    expect(r.lastSpanRaw).toBe('Done.')
  })
})
