import { describe, it, expect, beforeEach } from 'vitest'

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

export function splitIntoSentencesOptimized(text: string): { text: string; start: number; end: number }[] {
  if (!text || text.length === 0) return []

  // 匹配强断句符号：中文句号/感叹号/问号/分号/省略号，英文问号/感叹号/分号/换行，以及英文句号
  // 句号必须排除数字小数点：前后不能紧贴数字
  const regex = /(?:[。！？…!?；;\n]|(?<!\d)\.(?!\d))[”’"'\)）』」]*/g

  const cuts: number[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const punctEnd = match.index + match[0].length

    // 如果是英文句号，执行缩写和域名/连词过滤
    if (match[0].includes('.')) {
      // 1. 句号后如果有文字，必须是空白字符，不能是直接连着字母（例如 domain.com）
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

  const sentences: { text: string; start: number; end: number }[] = []
  let prevPos = 0

  for (const cut of cuts) {
    const rawPart = text.slice(prevPos, cut)
    const trimmed = rawPart.trim()
    if (trimmed.length > 0) {
      // 如果这个碎片纯粹是多余的闭合符号，合并到上一句
      if (/^[”’"'\)）』」\s]+$/.test(trimmed) && sentences.length > 0) {
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
      if (/^[”’"'\)）』」\s]+$/.test(trimmed) && sentences.length > 0) {
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

describe('全量分句测试 (中英文兼容)', () => {
  it('应当正确切分标准中文句子', () => {
    const text = '这是第一句话。这是第二句话！还有第三句话吗？是的；结束了。'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(5)
    expect(sents[0].text).toBe('这是第一句话。')
    expect(sents[1].text).toBe('这是第二句话！')
    expect(sents[2].text).toBe('还有第三句话吗？')
    expect(sents[3].text).toBe('是的；')
    expect(sents[4].text).toBe('结束了。')
  })

  it('应当保护数字小数点不被误切', () => {
    const text = '最新数据显示增长率为 3.14%，而去年同期为 7.5。这是一个显著的变化。'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(2)
    expect(sents[0].text).toBe('最新数据显示增长率为 3.14%，而去年同期为 7.5。')
    expect(sents[1].text).toBe('这是一个显著的变化。')
  })

  it('应当正确处理对话引语闭合引号（如玫瑰与蜗牛案例），绝不把后引号单独成句', () => {
    const text =
      '花园中央是一株枝叶繁茂，绚丽怒放的玫瑰。玫瑰花底下一只蜗牛缩在自己的硬壳里。“我要作一番大事，不是开开花，产产奶的事，而是更惊天动地的事。”'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(3)
    expect(sents[0].text).toBe('花园中央是一株枝叶繁茂，绚丽怒放的玫瑰。')
    expect(sents[1].text).toBe('玫瑰花底下一只蜗牛缩在自己的硬壳里。')
    expect(sents[2].text).toBe(
      '“我要作一番大事，不是开开花，产产奶的事，而是更惊天动地的事。”'
    )
  })

  it('单句文本应当返回包含自身的单句数组', () => {
    const text = '这是一段没有任何句末标点的单行短文本'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(1)
    expect(sents[0].text).toBe(text)
  })

  it('应当正确切分英文书籍 (The English Patient) 的多句段落', () => {
    const text =
      'The man with bandaged hands had been in the military hospital in Rome for more than four months when by accident he heard about the burned patient and the nurse, heard her name. He turned from the doorway and walked back into the clutch of doctors he had just passed, to discover where she was. He had been recuperating there for a long time, and they knew him as an evasive man. But now he spoke to them, asking about the name, and startled them. During all that time he had never spoken, communicating by signals and grimaces, now and then a grin. He had revealed nothing, not even his name, just wrote out his serial number, which showed he was with the Allies.'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(6)
    expect(sents[0].text).toBe(
      'The man with bandaged hands had been in the military hospital in Rome for more than four months when by accident he heard about the burned patient and the nurse, heard her name.'
    )
    expect(sents[5].text).toBe(
      'He had revealed nothing, not even his name, just wrote out his serial number, which showed he was with the Allies.'
    )
  })

  it('应当保护英文常见缩写不被误切分', () => {
    const text = 'Dr. Smith and Mr. Brown went to Washington D.C. for a conference. It was very productive.'
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(2)
    expect(sents[0].text).toBe('Dr. Smith and Mr. Brown went to Washington D.C. for a conference.')
    expect(sents[1].text).toBe('It was very productive.')
  })

  it('应当正确切分英文带单双引号引语的句子', () => {
    const text = "‘Tell me what a tonsil is.’ Her eyes staring at him. ‘Is your patient in there? Can I go in?’ She shook her head."
    const sents = splitIntoSentencesOptimized(text)
    expect(sents.length).toBe(5)
    expect(sents[0].text).toBe('‘Tell me what a tonsil is.’')
    expect(sents[1].text).toBe('Her eyes staring at him.')
  })
})
