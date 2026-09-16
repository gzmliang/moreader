/**
 * 墨阅免 Key 极速免费翻译引擎 (Google GTX Web Adapter)
 * 具备多句批量聚合、智能并发控制与零配置开箱即用特性
 */

const GOOGLE_GTX_URL = 'https://translate.googleapis.com/translate_a/single'

/**
 * 转换语言代码到 Google 识别的标准代码
 */
export function normalizeLanguageCode(lang: string): string {
  const l = (lang || '').toLowerCase().trim()
  if (l.startsWith('zh-cn') || l === 'zh' || l.includes('hans')) return 'zh-CN'
  if (l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.includes('hant')) return 'zh-TW'
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('ko')) return 'ko'
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('de')) return 'de'
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('ru')) return 'ru'
  if (l.startsWith('pt')) return 'pt'
  return lang || 'zh-CN'
}

/**
 * 单批次请求 Google GTX 翻译接口
 */
async function fetchGtxChunk(
  sentences: string[],
  targetLang: string,
  fromLang: string = 'auto'
): Promise<string[]> {
  if (sentences.length === 0) return []

  const textToTranslate = sentences.join('\n')
  const params = new URLSearchParams({
    client: 'gtx',
    dt: 't',
    dj: '1',
    ie: 'UTF-8',
    sl: fromLang,
    tl: normalizeLanguageCode(targetLang),
    q: textToTranslate,
  })

  const url = `${GOOGLE_GTX_URL}?${params.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Google GTX HTTP error: ${response.status}`)
    }

    const data = await response.json()
    const returnedSentences: { orig?: string; trans?: string }[] = data?.sentences || []

    // 智能对齐：如果 Google 返回的结果按 \n 分段，提取对应翻译
    const translations: string[] = []
    let currentTrans = ''

    for (const item of returnedSentences) {
      const orig = item.orig || ''
      const trans = item.trans || ''
      currentTrans += trans
      if (orig.includes('\n')) {
        const parts = currentTrans.split('\n')
        while (parts.length > 1) {
          translations.push(parts.shift()!.trim())
        }
        currentTrans = parts[0] || ''
      }
    }
    if (currentTrans.trim().length > 0 || translations.length < sentences.length) {
      translations.push(currentTrans.trim())
    }

    // 长度保底对齐：确保返回结果与输入 sentences 严格等长
    const result: string[] = []
    for (let i = 0; i < sentences.length; i++) {
      result.push(translations[i] || '')
    }
    return result
  } catch (err) {
    console.warn('[FreeTranslator] Batch fetch failed, falling back to individual:', err)
    // 降级兜底：若批量遇到特殊字符失败，尝试逐条容错请求
    const fallbacks: string[] = []
    for (const s of sentences) {
      try {
        const singleParams = new URLSearchParams({
          client: 'gtx',
          dt: 't',
          dj: '1',
          ie: 'UTF-8',
          sl: fromLang,
          tl: normalizeLanguageCode(targetLang),
          q: s,
        })
        const res = await fetch(`${GOOGLE_GTX_URL}?${singleParams.toString()}`)
        if (res.ok) {
          const singleData = await res.json()
          const trans = (singleData?.sentences || []).map((x: any) => x.trans || '').join('')
          fallbacks.push(trans.trim())
        } else {
          fallbacks.push('')
        }
      } catch {
        fallbacks.push('')
      }
    }
    return fallbacks
  }
}

/**
 * 批量翻译句子列表（带智能分块与并发控制）
 * @param sentences 原始句子列表
 * @param targetLang 目标语言代码，默认 'zh-CN'
 * @param fromLang 源语言代码，默认 'auto'
 * @param onProgress 进度回调 (0-100)
 */
export async function translateSentenceBatch(
  sentences: string[],
  targetLang: string = 'zh-CN',
  fromLang: string = 'auto',
  onProgress?: (progress: number) => void
): Promise<string[]> {
  if (!sentences || sentences.length === 0) return []

  const finalResults: string[] = new Array(sentences.length).fill('')
  const chunks: { indices: number[]; texts: string[] }[] = []

  let currentChunkIndices: number[] = []
  let currentChunkTexts: string[] = []
  let currentChunkCharCount = 0

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim()
    if (!s) {
      finalResults[i] = ''
      continue
    }

    // 单批次控制在 12 句或 1200 字符内，避免 URL 超长
    if (currentChunkTexts.length >= 12 || currentChunkCharCount + s.length > 1200) {
      if (currentChunkTexts.length > 0) {
        chunks.push({ indices: currentChunkIndices, texts: currentChunkTexts })
        currentChunkIndices = []
        currentChunkTexts = []
        currentChunkCharCount = 0
      }
    }

    currentChunkIndices.push(i)
    currentChunkTexts.push(s)
    currentChunkCharCount += s.length
  }

  if (currentChunkTexts.length > 0) {
    chunks.push({ indices: currentChunkIndices, texts: currentChunkTexts })
  }

  // 限制最大并发数为 3，避免触发 IP 频率限制
  const CONCURRENCY = 3
  let completedChunks = 0

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const slice = chunks.slice(i, i + CONCURRENCY)
    await Promise.all(
      slice.map(async (chunk) => {
        const transList = await fetchGtxChunk(chunk.texts, targetLang, fromLang)
        chunk.indices.forEach((origIdx, localIdx) => {
          finalResults[origIdx] = transList[localIdx] || ''
        })
        completedChunks++
        if (onProgress) {
          onProgress(Math.min(100, Math.round((completedChunks / chunks.length) * 100)))
        }
      })
    )
    // 微小批次休眠（50ms），确保请求节奏平滑
    if (i + CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  return finalResults
}
