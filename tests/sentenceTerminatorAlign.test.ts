/**
 * 【回归测试】句末零碎标点合并 → 句子文本必须恒等于原文切片
 *
 * 病根（真实现场）：切句时若段末出现零碎标点（如 `.”’`、`。’` 且前面带空白），
 * 旧实现把它 trim 后拼到上一句的 text 上，却把 end 指向含空白的原文位置，
 * 造成「文本长度 ≠ 坐标区间长度」。高亮的映射表自检因此失败并回退到旧的
 * 字符计数逻辑，绿条便漂移到段落别处 —— 用户看到的就是「这句读了没亮/亮错位置」。
 *
 * 核心不变量（必须对所有句子成立）：
 *   clean.slice(start, end) === sentence.text
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCleanText,
  splitIntoSentences,
  clearSentenceHighlight,
  highlightSentenceInElement,
} from '../src/stores/ttsStore'

const CASES: { label: string; text: string }[] = [
  { label: '英文：段末落单的右引号', text: 'He said that he would come. ”’' },
  { label: '英文：句中标点碎片', text: 'He said that he would come. ”’ Then he left.' },
  { label: '英文：标点前带空格', text: 'The matter is settled. ’ Next chapter begins here.' },
  { label: '中文：段末落单标点', text: '他说完就走了。 ”’' },
  { label: '中文：句中标点碎片', text: '他说完就走了。 ”’ 接着他便离开了。' },
  { label: '混合：省略号 + 引号', text: 'She whispered… ” Then silence.' },
]

describe('splitIntoSentences 坐标自洽性（text === slice(start, end)）', () => {
  for (const c of CASES) {
    it(c.label, () => {
      const sents = splitIntoSentences(c.text)
      expect(sents.length).toBeGreaterThan(0)
      for (const s of sents) {
        expect(c.text.slice(s.start, s.end), `${c.label}: 「${s.text}」坐标不自洽`).toBe(s.text)
      }
      // 覆盖检查：所有非空白字符都必须属于某个句子区间
      const covered = new Array(c.text.length).fill(false)
      for (const s of sents) for (let i = s.start; i < s.end; i++) covered[i] = true
      for (let i = 0; i < c.text.length; i++) {
        if (!covered[i]) expect(c.text[i]).toMatch(/\s/)
      }
    })
  }
})

describe('句末标点碎片场景下的高亮对齐', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  for (const c of CASES) {
    it(`${c.label}：绿条文本 = 语音文本`, () => {
      const p = document.createElement('p')
      p.textContent = c.text
      document.body.appendChild(p)
      const clean = getCleanText(p)
      const sents = splitIntoSentences(clean)
      for (const s of sents) {
        highlightSentenceInElement(p, s.start, s.end, s.text)
        const span = p.querySelector('span[data-tts-sentence="1"]') as HTMLElement | null
        expect(span, `${c.label}: 应产生绿条`).not.toBeNull()
        expect(getCleanText(span!), `${c.label}: 绿条文本必须等于语音读的句子`).toBe(s.text)
      }
      clearSentenceHighlight(document)
    })
  }
})
