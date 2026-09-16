import { ref } from 'vue'
import { defineStore } from 'pinia'
import { bilingualDb } from '@/utils/db'
import { translateSentenceBatch } from '@/utils/freeTranslator'
import { splitIntoSentences } from '@/stores/ttsStore'

export interface ParagraphSentenceInfo {
  para: HTMLElement
  sentences: { text: string; start: number; end: number }[]
  startIndex: number // 全局句子索引偏移量
}

export const useBilingualStore = defineStore('bilingual', () => {
  const isBilingualActive = ref(false)
  const isTranslating = ref(false)
  const targetLang = ref('zh-CN')
  const provider = ref<'google_free' | 'ai'>('google_free')

  // 初始化持久化设置
  if (typeof localStorage !== 'undefined') {
    const savedActive = localStorage.getItem('moreader_bilingual_active')
    if (savedActive === 'true') isBilingualActive.value = true
    const savedLang = localStorage.getItem('moreader_bilingual_target_lang')
    if (savedLang) targetLang.value = savedLang
  }

  const setTargetLang = (lang: string) => {
    targetLang.value = lang
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('moreader_bilingual_target_lang', lang)
    }
  }

  const setBilingualActive = (active: boolean) => {
    isBilingualActive.value = active
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('moreader_bilingual_active', active ? 'true' : 'false')
    }
  }

  const toggleBilingual = () => {
    setBilingualActive(!isBilingualActive.value)
  }

  /**
   * 生成缓存键
   */
  const getCacheKey = (bookId: string, chapterHref: string, lang: string): string => {
    const cleanChapter = chapterHref.split('#')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${bookId}__${cleanChapter}__${lang}`
  }

  /**
   * 获取或翻译指定章节的所有句子
   */
  const getOrTranslateChapter = async (
    bookId: string,
    chapterHref: string,
    allSentences: string[],
    onProgress?: (progress: number) => void
  ): Promise<string[]> => {
    if (allSentences.length === 0) return []

    const cacheKey = getCacheKey(bookId, chapterHref, targetLang.value)
    try {
      const cached = await bilingualDb.getItem<string[]>(cacheKey)
      if (cached && Array.isArray(cached) && cached.length === allSentences.length) {
        return cached
      }
    } catch (e) {
      console.warn('[Bilingual] Cache read error:', e)
    }

    isTranslating.value = true
    try {
      const translations = await translateSentenceBatch(
        allSentences,
        targetLang.value,
        'auto',
        onProgress
      )
      // 写入持久化数据库缓存
      try {
        await bilingualDb.setItem(cacheKey, translations)
      } catch (e) {
        console.warn('[Bilingual] Cache write error:', e)
      }
      return translations
    } finally {
      isTranslating.value = false
    }
  }

  /**
   * 将双语译文安全注入到 iframe 文档中（形式 A：逐句紧贴对照）
   */
  const applyBilingualToDoc = (
    doc: Document,
    paraInfos: ParagraphSentenceInfo[],
    allTranslations: string[]
  ) => {
    if (!doc?.body) return

    // 确保样式已注入
    const styleId = 'moreader-bilingual-style'
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement('style')
      style.id = styleId
      style.textContent = `
        .moreader-bilingual-pair {
          display: block;
          margin-bottom: 0.6em;
          text-indent: 0 !important;
        }
        .moreader-bilingual-orig {
          display: block;
          line-height: 1.75;
          text-align: justify;
        }
        .moreader-bilingual-trans {
          display: block;
          font-size: 0.88em;
          line-height: 1.55;
          opacity: 0.75;
          margin-top: 0.25em;
          color: inherit;
          font-style: normal;
          text-align: justify;
          user-select: text;
        }
      `
      doc.head.appendChild(style)
    }

    for (const info of paraInfos) {
      const p = info.para
      if (!p.hasAttribute('data-moreader-original-html')) {
        p.setAttribute('data-moreader-original-html', p.innerHTML)
      }

      const pSents = info.sentences
      if (pSents.length === 0) continue

      // 构建逐句对应的 DOM 结构
      const frag = doc.createDocumentFragment()
      for (let sIdx = 0; sIdx < pSents.length; sIdx++) {
        const sent = pSents[sIdx]
        const globalIdx = info.startIndex + sIdx
        const transText = allTranslations[globalIdx] || ''

        const pairSpan = doc.createElement('span')
        pairSpan.className = 'moreader-bilingual-pair'
        pairSpan.setAttribute('data-bilingual-pair', '1')

        const origSpan = doc.createElement('span')
        origSpan.className = 'moreader-bilingual-orig'
        origSpan.textContent = sent.text

        pairSpan.appendChild(origSpan)

        if (transText.trim().length > 0) {
          const transSpan = doc.createElement('span')
          transSpan.className = 'moreader-bilingual-trans'
          transSpan.setAttribute('data-bilingual-trans', '1')
          transSpan.textContent = transText
          pairSpan.appendChild(transSpan)
        }

        frag.appendChild(pairSpan)
      }

      p.innerHTML = ''
      p.appendChild(frag)
    }
  }

  /**
   * 瞬时还原 iframe 文档为 100% 原始 DOM
   */
  const removeBilingualFromDoc = (doc: Document) => {
    if (!doc?.body) return

    const paras = doc.body.querySelectorAll('[data-moreader-original-html]')
    paras.forEach((el) => {
      const origHtml = el.getAttribute('data-moreader-original-html')
      if (origHtml !== null) {
        el.innerHTML = origHtml
        el.removeAttribute('data-moreader-original-html')
      }
    })

    // 清理遗留标签
    doc.body.querySelectorAll('.moreader-bilingual-trans').forEach((t) => t.remove())
    doc.body.querySelectorAll('.moreader-bilingual-pair').forEach((p) => {
      const orig = p.querySelector('.moreader-bilingual-orig')
      if (orig) {
        p.replaceWith(doc.createTextNode(orig.textContent || ''))
      } else {
        p.remove()
      }
    })
    doc.body.normalize()
  }

  return {
    isBilingualActive,
    isTranslating,
    targetLang,
    provider,
    setTargetLang,
    setBilingualActive,
    toggleBilingual,
    getOrTranslateChapter,
    applyBilingualToDoc,
    removeBilingualFromDoc,
  }
})
