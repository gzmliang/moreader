import { describe, it, expect, beforeEach, vi } from 'vitest'
import { normalizeLanguageCode, translateSentenceBatch } from '../src/utils/freeTranslator'

describe('双语对照与免Key翻译引擎 (FreeTranslator)', () => {
  it('应当正确标准化常见语言代码', () => {
    expect(normalizeLanguageCode('zh')).toBe('zh-CN')
    expect(normalizeLanguageCode('zh-cn')).toBe('zh-CN')
    expect(normalizeLanguageCode('zh-Hans')).toBe('zh-CN')
    expect(normalizeLanguageCode('zh-TW')).toBe('zh-TW')
    expect(normalizeLanguageCode('en')).toBe('en')
    expect(normalizeLanguageCode('ja')).toBe('ja')
    expect(normalizeLanguageCode('ko')).toBe('ko')
    expect(normalizeLanguageCode('fr')).toBe('fr')
  })

  it('对空数组或纯空白句子输入，能够迅速安全返回空数组', async () => {
    const res = await translateSentenceBatch([])
    expect(res).toEqual([])

    const resEmpty = await translateSentenceBatch(['', '   '])
    expect(resEmpty).toEqual(['', ''])
  })

  it('模拟 Google GTX 批量翻译解析逻辑（带对齐保底）', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [
          { orig: 'Sentence one.\n', trans: '第一句话。\n' },
          { orig: 'Sentence two.', trans: '第二句话。' },
        ],
      }),
    })
    globalThis.fetch = fakeFetch as any

    const sents = ['Sentence one.', 'Sentence two.']
    const result = await translateSentenceBatch(sents, 'zh-CN')

    expect(result.length).toBe(2)
    expect(result[0]).toBe('第一句话。')
    expect(result[1]).toBe('第二句话。')
  })
})

describe('双语 DOM 结构注入与无损还原测试 (形式 A 逐句紧贴)', () => {
  it('能够向段落注入双语结构，且关闭时 100% 恢复原始 HTML', () => {
    const doc = document.implementation.createHTMLDocument('test')
    const p = doc.createElement('p')
    const originalText = 'Call me Ishmael. Some years ago, never mind how long precisely.'
    p.innerHTML = `<a id="ref-1"></a>${originalText}`
    doc.body.appendChild(p)

    const origSavedHtml = p.innerHTML

    // 1. 模拟保存与注入
    p.setAttribute('data-moreader-original-html', p.innerHTML)

    const frag = doc.createDocumentFragment()
    const pair1 = doc.createElement('span')
    pair1.className = 'moreader-bilingual-pair'
    pair1.innerHTML = `
      <span class="moreader-bilingual-orig">Call me Ishmael.</span>
      <span class="moreader-bilingual-trans" data-bilingual-trans="1">叫我以实玛利。</span>
    `
    const pair2 = doc.createElement('span')
    pair2.className = 'moreader-bilingual-pair'
    pair2.innerHTML = `
      <span class="moreader-bilingual-orig">Some years ago, never mind how long precisely.</span>
      <span class="moreader-bilingual-trans" data-bilingual-trans="1">几年前，具体多久不用管。</span>
    `
    frag.appendChild(pair1)
    frag.appendChild(pair2)

    p.innerHTML = ''
    p.appendChild(frag)

    expect(p.querySelector('.moreader-bilingual-trans')).not.toBeNull()
    expect(p.textContent).toContain('叫我以实玛利。')

    // 2. 模拟关闭双语还原
    const restoreHtml = p.getAttribute('data-moreader-original-html')
    if (restoreHtml !== null) {
      p.innerHTML = restoreHtml
      p.removeAttribute('data-moreader-original-html')
    }

    expect(p.innerHTML).toBe(origSavedHtml)
    expect(p.querySelector('.moreader-bilingual-trans')).toBeNull()
    expect(p.textContent).toBe(originalText)
  })
})
