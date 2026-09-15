import { describe, it, expect, beforeEach } from 'vitest'
import { lockParagraphHighlight, clearSentenceHighlight } from '../src/stores/ttsStore'

describe('段落高亮死锁（方案A）与注释嗅探机制测试', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('lockParagraphHighlight 应当在各种属性缺失时强力补齐并锁定段落样式', () => {
    const p = document.createElement('p')
    p.textContent = '这是一个段落测试。'
    document.body.appendChild(p)

    // 初次死锁
    lockParagraphHighlight(p)
    expect(p.classList.contains('tts-hl')).toBe(true)
    expect(p.style.backgroundColor).toBe('rgba(59, 130, 246, 0.15)')
    expect(p.style.borderLeft).toContain('4px solid')

    // 模拟意外被外部清空
    p.classList.remove('tts-hl')
    p.style.backgroundColor = ''
    p.style.borderLeft = ''

    // 再次调用死锁
    lockParagraphHighlight(p)
    expect(p.classList.contains('tts-hl')).toBe(true)
    expect(p.style.backgroundColor).toBe('rgba(59, 130, 246, 0.15)')
    expect(p.style.borderLeft).toContain('4px solid')
  })

  it('clearSentenceHighlight 仅清除句子高亮，绝不触碰或破坏段落样式', () => {
    const p = document.createElement('p')
    p.innerHTML = '第一句内容。<span class="tts-sentence-hl" data-tts-sentence="1">第二句高亮内容。</span>第三句内容。'
    document.body.appendChild(p)

    lockParagraphHighlight(p)

    // 执行句子高亮清除
    clearSentenceHighlight(document)

    // 句子 span 应被解开还原为纯文本
    expect(p.querySelector('.tts-sentence-hl')).toBeNull()
    expect(p.textContent).toBe('第一句内容。第二句高亮内容。第三句内容。')

    // 段落自身的样式应完好无损
    expect(p.classList.contains('tts-hl')).toBe(true)
    expect(p.style.backgroundColor).toBe('rgba(59, 130, 246, 0.15)')
  })

  it('验证文中引用与注释嗅探算法（清洗 ↩ 等返回符号）', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <p id="p1">正文内容提及了某个历史事件<a id="ref-1" href="#fn-1"><sup>[1]</sup></a>继续阅读。</p>
      <div class="footnotes">
        <ol>
          <li id="fn-1" role="doc-footnote">
            <p>指公元1945年第二次世界大战结束。<a href="#ref-1" class="reversefootnote">↩</a></p>
          </li>
        </ol>
      </div>
    `
    document.body.appendChild(container)

    const link = container.querySelector('a[href="#fn-1"]') as HTMLAnchorElement
    const href = link.getAttribute('href')!
    const anchorId = href.substring(1)

    const target = container.querySelector(`#${anchorId}`) as HTMLElement
    expect(target).not.toBeNull()

    const noteContainer = target.closest('li, aside, dd, p, [role="doc-footnote"]') || target
    let noteContent = (noteContainer.textContent || '').trim()
    noteContent = noteContent.replace(/[\u21A9\u2191\u21E7\^]/g, '').trim()

    expect(noteContent).toBe('指公元1945年第二次世界大战结束。')
  })
})
