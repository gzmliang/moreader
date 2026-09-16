import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FootnoteModal from '../src/components/FootnoteModal.vue'
import { lockParagraphHighlight, clearSentenceHighlight } from '../src/stores/ttsStore'

describe('段落高亮死锁（方案A）与注释嗅探机制测试', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('FootnoteModal 组件应当能够无错误正常渲染，并能触发 close 与 goTo 事件', async () => {
    const wrapper = mount(FootnoteModal, {
      props: {
        visible: true,
        text: '“无是非之心”：语见《孟子·公孙丑》：“无是非之心，非人也。”',
        targetHref: '#normal-notef1',
        theme: {
          menuBgClass: 'bg-white',
          borderColor: 'border-zinc-200',
          textColor: 'text-zinc-900',
        },
      },
    })

    expect(wrapper.text()).toContain('无是非之心')
    expect(wrapper.text()).toContain('孟子·公孙丑')

    // 触发 goTo 事件
    const goToBtn = wrapper.findAll('button').find(b => b.text().includes('前往查看') || b.text().includes('Go to'))
    expect(goToBtn).toBeDefined()
    await goToBtn!.trigger('click')
    expect(wrapper.emitted('goTo')).toBeTruthy()
    expect(wrapper.emitted('goTo')![0]).toEqual(['#normal-notef1'])

    // 触发 close 事件
    const closeBtn = wrapper.findAll('button').find(b => b.text().includes('关闭') || b.text().includes('Close'))
    expect(closeBtn).toBeDefined()
    await closeBtn!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('验证鲁迅《呐喊·端午节》真实 DOM 结构注释嗅探与跳转判定', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <p class="bodytext">他这样想着的时候，有时也疑心是因为自己没有和恶社会奋斗的勇气，所以瞒心昧己的故意造出来的一条逃路，很近于“无是非之心”<a href="#normal-notef1" id="normal-note1"><sup>[1]</sup></a>，远不如改正了好。</p>
      <hr/>
      <p class="note">  <a href="#normal-note1" id="normal-notef1">[1]</a> “无是非之心”：语见《孟子·公孙丑》：“无是非之心，非人也。” </p>
    `
    document.body.appendChild(container)

    // 1. 正文中点击角标 [1]
    const textRefLink = container.querySelector('a[href="#normal-notef1"]') as HTMLAnchorElement
    expect(textRefLink).not.toBeNull()
    const isInsideNote = !!textRefLink.closest('li, aside, dd, [role="doc-footnote"], .footnote, .note, [class*="footnote"], [class*="note"]')
    expect(isInsideNote).toBe(false) // 在正文中，非注释区

    const href = textRefLink.getAttribute('href')!
    const anchorId = href.substring(href.indexOf('#') + 1)
    const noteTarget = container.querySelector(`#${anchorId}`) as HTMLElement
    expect(noteTarget).not.toBeNull()

    const noteContainer = (noteTarget.closest('li, aside, dd, p, [role="doc-footnote"], .footnote, .note') || noteTarget) as HTMLElement
    let noteContent = (noteContainer.textContent || '').trim()
    noteContent = noteContent.replace(/[\u21A9\u2191\u21E7\^]/g, '').trim()

    expect(noteContent).toContain('无是非之心')
    expect(noteContent).toContain('孟子·公孙丑')

    // 2. 文末注释区点击返回正文链接 [1]
    const backLink = container.querySelector('a[href="#normal-note1"]') as HTMLAnchorElement
    const backIsInsideNote = !!backLink.closest('li, aside, dd, [role="doc-footnote"], .footnote, .note, [class*="footnote"], [class*="note"]')
    expect(backIsInsideNote).toBe(true) // 在注释区内部，应直接接管跳转回正文
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

  it('验证跨章节尾注嗅探与路径标准化解析', () => {
    // 模拟不同相对路径跨章节链接
    const spineItems = [
      { href: 'Text/chapter01.xhtml' },
      { href: 'Text/chapter02.xhtml' },
      { href: 'Text/notes.xhtml' },
    ]

    const resolveHref = (href: string, curChapter: string) => {
      const parts = href.split('#')
      const pathPart = parts[0] ? decodeURI(parts[0]) : ''
      const anchorId = parts[1] ? parts[1].trim() : ''

      if (!pathPart) return { sectionHref: curChapter, anchorId }

      let item = spineItems.find(s => s.href === pathPart)
      if (item) return { sectionHref: item.href, anchorId }

      if (curChapter) {
        const lastSlash = curChapter.lastIndexOf('/')
        const baseDir = lastSlash >= 0 ? curChapter.substring(0, lastSlash) : ''
        const rawCombined = baseDir ? `${baseDir}/${pathPart}` : pathPart
        const segs = rawCombined.split('/')
        const normalized: string[] = []
        for (const s of segs) {
          if (s === '.' || s === '') continue
          if (s === '..') {
            if (normalized.length > 0) normalized.pop()
          } else {
            normalized.push(s)
          }
        }
        const resolvedPath = normalized.join('/')
        item = spineItems.find(s => s.href === resolvedPath)
        if (item) return { sectionHref: item.href, anchorId }
      }

      const targetFilename = pathPart.split('/').pop() || pathPart
      item = spineItems.find(s => s.href.split('/').pop() === targetFilename)
      if (item) return { sectionHref: item.href, anchorId }

      return { sectionHref: pathPart, anchorId }
    }

    // 1. 同章节纯锚点
    expect(resolveHref('#fn1', 'Text/chapter01.xhtml')).toEqual({
      sectionHref: 'Text/chapter01.xhtml',
      anchorId: 'fn1',
    })

    // 2. 相对路径同目录 notes.xhtml#note-2
    expect(resolveHref('notes.xhtml#note-2', 'Text/chapter01.xhtml')).toEqual({
      sectionHref: 'Text/notes.xhtml',
      anchorId: 'note-2',
    })

    // 3. 相对路径 ../Text/notes.xhtml#fn-99
    expect(resolveHref('../Text/notes.xhtml#fn-99', 'Text/chapter01.xhtml')).toEqual({
      sectionHref: 'Text/notes.xhtml',
      anchorId: 'fn-99',
    })

    // 4. 模拟跨章节目标文档解析
    const noteDoc = document.createElement('div')
    noteDoc.innerHTML = `
      <div id="notes-page">
        <h2>注释列表</h2>
        <p><a id="note-2"></a>[2] 见司马迁《史记·项羽本纪》。<a href="chapter01.xhtml#ref-2">↩</a></p>
      </div>
    `
    const targetEl = noteDoc.querySelector('#note-2') as HTMLElement
    expect(targetEl).not.toBeNull()
    const container = (targetEl.closest('li, aside, dd, p, blockquote') || targetEl.parentElement || targetEl) as HTMLElement
    let text = (container.textContent || '').replace(/[\u21A9\u2191\u21E7\u23CE\^]/g, '').trim()
    expect(text).toBe('[2] 见司马迁《史记·项羽本纪》。')
  })
})
