import { describe, it, expect, beforeEach } from 'vitest'
import {
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceByText,
  getCleanText,
} from '../src/stores/ttsStore'

describe('英文书籍 (The English Patient) TTS 句子切分与高亮测试', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('测试英文段落分句', () => {
    const text = 'The man with bandaged hands had been in the military hospital in Rome for more than four months when by accident he heard about the burned patient and the nurse, heard her name. He turned from the doorway and walked back into the clutch of doctors he had just passed, to discover where she was. He had been recuperating there for a long time, and they knew him as an evasive man. But now he spoke to them, asking about the name, and startled them. During all that time he had never spoken, communicating by signals and grimaces, now and then a grin. He had revealed nothing, not even his name, just wrote out his serial number, which showed he was with the Allies.'
    const sents = splitIntoSentences(text)
    console.log('Split English sentences count:', sents.length)
    sents.forEach((s, i) => console.log(`  [${i}]: ${s.text}`))
    expect(sents.length).toBeGreaterThan(1)
  })

  it('测试带 <a> 锚点标签的段落分句与高亮', () => {
    const p = document.createElement('p')
    p.className = 'noindent'
    p.innerHTML = '<a id="page_28"/><a id="page_29"/>The man with bandaged hands had been in the military hospital in Rome for more than four months when by accident he heard about the burned patient and the nurse, heard her name. He turned from the doorway and walked back into the clutch of doctors he had just passed, to discover where she was.'
    document.body.appendChild(p)

    const clean = getCleanText(p)
    console.log('Clean text:', clean)
    const sents = splitIntoSentences(clean)
    console.log('Sentences from clean text:', sents.length)

    // 尝试高亮每一个句子
    sents.forEach((s, idx) => {
      highlightSentenceByText(p, s.text)
      const hl = p.querySelector('span.tts-sentence-hl')
      console.log(`Sentence ${idx} highlight result:`, hl ? 'SUCCESS' : 'FAILED', hl?.textContent?.slice(0, 30))
      expect(hl).not.toBeNull()
    })
  })

  it('测试带 <em> 斜体标签的跨标签句子高亮', () => {
    const p = document.createElement('p')
    p.className = 'indent'
    p.innerHTML = 'First, he thought, I need shoes with rubber on the bottom. I need <em>gelato</em>.'
    document.body.appendChild(p)

    const clean = getCleanText(p)
    const sents = splitIntoSentences(clean)
    console.log('em tag sentences:', sents.map(s => s.text))

    sents.forEach((s, idx) => {
      highlightSentenceByText(p, s.text)
      const hl = p.querySelector('span.tts-sentence-hl')
      console.log(`em test sent ${idx} highlight:`, hl ? 'SUCCESS' : 'FAILED', hl?.textContent)
      expect(hl).not.toBeNull()
    })
  })

  it('测试带单引号对话的句子高亮', () => {
    const p = document.createElement('p')
    p.className = 'indent'
    p.innerHTML = '‘Tell me what a tonsil is.’'
    document.body.appendChild(p)

    const clean = getCleanText(p)
    const sents = splitIntoSentences(clean)
    console.log('Quote test sentences:', sents.map(s => s.text))

    sents.forEach((s, idx) => {
      highlightSentenceByText(p, s.text)
      const hl = p.querySelector('span.tts-sentence-hl')
      console.log(`quote test sent ${idx} highlight:`, hl ? 'SUCCESS' : 'FAILED', hl?.textContent)
      expect(hl).not.toBeNull()
    })
  })
})
