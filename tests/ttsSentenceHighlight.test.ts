import { describe, it, expect, beforeEach } from 'vitest'
import {
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

describe('TTS 句子切分算法 (splitIntoSentences)', () => {
  it('应当正确切分标准中文句子', () => {
    const text = '这是第一句话。这是第二句话！还有第三句话吗？是的；结束了。'
    const sents = splitIntoSentences(text)
    expect(sents.length).toBe(5)
    expect(sents[0].text).toBe('这是第一句话。')
    expect(sents[1].text).toBe('这是第二句话！')
    expect(sents[2].text).toBe('还有第三句话吗？')
    expect(sents[3].text).toBe('是的；')
    expect(sents[4].text).toBe('结束了。')

    // 校验偏移量
    expect(text.substring(sents[0].start, sents[0].end)).toBe('这是第一句话。')
    expect(text.substring(sents[1].start, sents[1].end)).toBe('这是第二句话！')
  })

  it('应当保护数字小数点不被误切', () => {
    const text = '最新数据显示增长率为 3.14%，而去年同期为 7.5。这是一个显著的变化。'
    const sents = splitIntoSentences(text)
    expect(sents.length).toBe(2)
    expect(sents[0].text).toBe('最新数据显示增长率为 3.14%，而去年同期为 7.5。')
    expect(sents[1].text).toBe('这是一个显著的变化。')
  })

  it('单句文本应当返回包含自身的单句数组', () => {
    const text = '这是一段没有任何句末标点的单行短文本'
    const sents = splitIntoSentences(text)
    expect(sents.length).toBe(1)
    expect(sents[0].text).toBe(text)
    expect(sents[0].start).toBe(0)
    expect(sents[0].end).toBe(text.length)
  })
})

describe('DOM 句子高亮与无损恢复 (highlightSentenceInElement & clearSentenceHighlight)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('能够在含有内联子节点的段落中精准高亮句子，且换句时无损交替', () => {
    const p = document.createElement('p')
    p.innerHTML = '天地玄黄。<span>宇宙洪荒</span>。日月盈昃，辰宿列张。'
    document.body.appendChild(p)

    const rawText = p.textContent || ''
    const sents = splitIntoSentences(rawText)
    expect(sents.length).toBe(3)

    // 1. 高亮第一句
    highlightSentenceInElement(p, sents[0].start, sents[0].end)
    let hlSpan = p.querySelector('span.tts-sentence-hl')
    expect(hlSpan).not.toBeNull()
    expect(hlSpan?.textContent).toBe('天地玄黄。')
    expect(hlSpan?.getAttribute('data-tts-sentence')).toBe('1')

    // 2. 切换到第二句
    highlightSentenceInElement(p, sents[1].start, sents[1].end)
    const hlSpans = p.querySelectorAll('span.tts-sentence-hl')
    expect(hlSpans.length).toBe(1)
    expect(hlSpans[0].textContent).toBe('宇宙洪荒。')

    // 3. 清除高亮
    clearSentenceHighlight(document)
    expect(p.querySelectorAll('span.tts-sentence-hl').length).toBe(0)
    expect(p.textContent).toBe(rawText)
  })

  it('在古诗带注音标签下能够精准包裹高亮并无损还原', () => {
    const p = document.createElement('p')
    p.innerHTML = '<ruby>床<rt>chuang</rt></ruby><ruby>前<rt>qian</rt></ruby>明月光。疑是地上霜。'
    document.body.appendChild(p)

    // 清洗出的文本或者直接文本节点
    const textNodes: string[] = []
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode.textContent || '')
    }

    const sents = splitIntoSentences(p.textContent || '')
    expect(sents.length).toBe(2)

    highlightSentenceInElement(p, sents[0].start, sents[0].end)
    expect(p.querySelector('span.tts-sentence-hl')).not.toBeNull()

    clearSentenceHighlight(document)
    expect(p.querySelector('span.tts-sentence-hl')).toBeNull()
    expect(p.querySelector('ruby rt')?.textContent).toBe('chuang')
  })
})
