import { describe, it, expect, beforeEach } from 'vitest'
import {
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceInElement,
  highlightSentenceByText,
  getCleanText,
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

  it('应当正确处理对话引语闭合引号（如玫瑰与蜗牛案例），绝不把后引号单独成句', () => {
    const text =
      '花园中央是一株枝叶繁茂，绚丽怒放的玫瑰。玫瑰花底下一只蜗牛缩在自己的硬壳里。“我要作一番大事，不是开开花，产产奶的事，而是更惊天动地的事。”'
    const sents = splitIntoSentences(text)
    expect(sents.length).toBe(3)
    expect(sents[0].text).toBe('花园中央是一株枝叶繁茂，绚丽怒放的玫瑰。')
    expect(sents[1].text).toBe('玫瑰花底下一只蜗牛缩在自己的硬壳里。')
    expect(sents[2].text).toBe(
      '“我要作一番大事，不是开开花，产产奶的事，而是更惊天动地的事。”'
    )
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

    const sents = splitIntoSentences(getCleanText(p))
    expect(sents.length).toBe(2)
    expect(sents[0].text).toBe('床前明月光。')

    highlightSentenceByText(p, sents[0].text)
    expect(p.querySelector('span.tts-sentence-hl')).not.toBeNull()

    clearSentenceHighlight(document)
    expect(p.querySelector('span.tts-sentence-hl')).toBeNull()
    expect(p.querySelector('ruby rt')?.textContent).toBe('chuang')
  })

  it('在段首带大量空格和换行缩进的段落中，highlightSentenceByText 能够 100% 精确对齐句首与句末标点', () => {
    const p = document.createElement('p')
    // 典型中文小说排版：段首全角空格缩进、源码换行
    p.innerHTML = '\n  　　这是第一句话。 这是第二句话！\n'
    document.body.appendChild(p)

    // 1. 高亮第一句
    highlightSentenceByText(p, '这是第一句话。')
    const hl1 = p.querySelector('span.tts-sentence-hl')
    expect(hl1).not.toBeNull()
    // 必须精确等于句子文本，绝不能包含前面的空格缩进，句末标点必须闭合
    expect(hl1?.textContent).toBe('这是第一句话。')

    // 2. 切换高亮第二句
    highlightSentenceByText(p, '这是第二句话！')
    const hl2 = p.querySelector('span.tts-sentence-hl')
    expect(hl2).not.toBeNull()
    expect(hl2?.textContent).toBe('这是第二句话！')

    // 3. 清理后还原
    clearSentenceHighlight(document)
    expect(p.querySelectorAll('span.tts-sentence-hl').length).toBe(0)
    expect(p.textContent).toBe('\n  　　这是第一句话。 这是第二句话！\n')
  })

  it('验证句子第一个发音字符与Edge-TTS词边界时间戳的毫秒级对齐', () => {
    const text = '花园中央是一株玫瑰。玫瑰花底下一只蜗牛。“我要作一番大事。”'
    const sents = splitIntoSentences(text)
    expect(sents.length).toBe(3)

    // 模拟服务端真实返回的 WordBoundaries
    const mockBoundaries = [
      { o: 100, t: '花园', s: 0, e: 2 },
      { o: 800, t: '中央', s: 2, e: 4 },
      { o: 4200, t: '玫瑰', s: 10, e: 12 },
      { o: 8500, t: '我', s: 21, e: 22 },
    ]

    // 提取每个句子的发音起始时间
    const timings = sents.map((sent) => {
      const word = mockBoundaries.find((b) => b.s >= sent.start && b.s < sent.end)
      return word ? word.o : 0
    })

    // 句 1 (花园) -> 100ms
    expect(timings[0]).toBe(100)
    // 句 2 (玫瑰) -> 4200ms
    expect(timings[1]).toBe(4200)
    // 句 3 (我要... 前置引号跳过，首发音词'我') -> 8500ms
    expect(timings[2]).toBe(8500)
  })

  it('在带拼音注音和后引号的段落中，第3句高亮必须完整包裹至右引号，绝不落单', () => {
    const p = document.createElement('p')
    p.innerHTML =
      '<ruby>花<rt>huā</rt></ruby><ruby>园<rt>yuán</rt></ruby>中央是一株玫瑰。玫瑰花底下一只蜗牛。“我要作一番大事，不是更惊天动地的事。”'
    document.body.appendChild(p)

    const clean = getCleanText(p)
    const sents = splitIntoSentences(clean)
    expect(sents.length).toBe(3)

    // 高亮第 3 句对话
    highlightSentenceByText(p, sents[2].text)
    const hl = p.querySelector('span.tts-sentence-hl')
    expect(hl).not.toBeNull()
    expect(hl?.textContent).toBe('“我要作一番大事，不是更惊天动地的事。”')
  })
})
