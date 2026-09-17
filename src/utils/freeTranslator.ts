/**
 * 墨阅免 Key 极速免费翻译引擎
 * 具备双通道智能容灾（Google GTX 主通道 + 国内直连免翻墙备用通道）、智能并发与超时防挂死
 */

const GOOGLE_GTX_URL = 'https://translate.googleapis.com/translate_a/single'
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'

/**
 * 转换语言代码到标准代码
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
 * 带超时的 fetch 请求封装，避免在国内直连被墙时长时间挂起
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * 备用免翻墙通道：通过开放翻译 API 单句/分批获取译文（国内直连畅通）
 */
async function fetchFallbackSingle(text: string, targetLang: string, fromLang = 'autodetect'): Promise<string> {
  const t = text.trim()
  if (!t) return ''
  const tLang = normalizeLanguageCode(targetLang)
  const sLang = fromLang === 'auto' ? 'autodetect' : fromLang

  const params = new URLSearchParams({
    q: t,
    langpair: `${sLang}|${tLang}`,
  })

  try {
    const res = await fetchWithTimeout(`${MYMEMORY_URL}?${params.toString()}`, { method: 'GET' }, 4000)
    if (res.ok) {
      const data = await res.json()
      const trans = data?.responseData?.translatedText || ''
      // 若返回错误标记或原样返回
      if (trans && !trans.startsWith('MYMEMORY WARNING:')) {
        return trans.trim()
      }
    }
  } catch (err) {
    // 忽略备用源单句异常
  }
  return ''
}

let isGoogleReachable: boolean | null = null
let lastGoogleCheckTime = 0

/**
 * 重置 Google 连通性状态（供测试或新任务触发）
 */
export function resetGoogleReachableState(): void {
  isGoogleReachable = null
  lastGoogleCheckTime = 0
}

/**
 * 单批次请求 Google 翻译接口（优先使用稳定的 dict-chrome-ex 客户端标识）
 */
async function fetchGtxChunk(
  sentences: string[],
  targetLang: string,
  fromLang: string = 'auto',
  onRetry?: (attempt: number) => void
): Promise<string[]> {
  if (sentences.length === 0) return []

  // 若近期已知 Google 接口受阻（熔断机制），直接跳过死等，秒切备用通道
  const now = Date.now()
  if (isGoogleReachable === false && now - lastGoogleCheckTime < 60000) {
    return fetchFallbackChunk(sentences, targetLang, fromLang)
  }

  const textToTranslate = sentences.join('\n')
  const targetCode = normalizeLanguageCode(targetLang)

  // 优先尝试 dict-chrome-ex 客户端（防 429 拦截），备用 gtx
  const clients = ['dict-chrome-ex', 'gtx']

  for (const client of clients) {
    const params = new URLSearchParams({
      client,
      dt: 't',
      dj: '1',
      ie: 'UTF-8',
      sl: fromLang,
      tl: targetCode,
      q: textToTranslate,
    })

    const url = `${GOOGLE_GTX_URL}?${params.toString()}`

    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, 3500)

      if (response.ok) {
        const data = await response.json()
        const returnedSentences: { orig?: string; trans?: string }[] = data?.sentences || []

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

        const result: string[] = []
        for (let i = 0; i < sentences.length; i++) {
          result.push(translations[i] || '')
        }

        if (result.some((r) => r.length > 0)) {
          isGoogleReachable = true
          lastGoogleCheckTime = Date.now()
          return result
        }
      }
    } catch (err) {
      // 当前 client 尝试失败，继续或降级
    }
  }

  // 标记 Google 暂不可用（熔断），避免后续批次反复傻等超时
  isGoogleReachable = false
  lastGoogleCheckTime = Date.now()

  // 降级兜底：无缝切换为国内免翻墙备用通道
  return fetchFallbackChunk(sentences, targetLang, fromLang)
}

/**
 * 备用国内免翻墙通道并发处理
 */
async function fetchFallbackChunk(
  sentences: string[],
  targetLang: string,
  fromLang: string = 'auto'
): Promise<string[]> {
  const fallbacks: string[] = new Array(sentences.length).fill('')
  const FALLBACK_CONCURRENCY = 3
  for (let idx = 0; idx < sentences.length; idx += FALLBACK_CONCURRENCY) {
    const slice = sentences.slice(idx, idx + FALLBACK_CONCURRENCY)
    await Promise.all(
      slice.map(async (sent, subIdx) => {
        const realIdx = idx + subIdx
        const trans = await fetchFallbackSingle(sent, targetLang, fromLang)
        fallbacks[realIdx] = trans
      })
    )
  }
  return fallbacks
}

/**
 * 批量翻译句子列表（带智能分块与并发控制）
 */
export async function translateSentenceBatch(
  sentences: string[],
  targetLang: string = 'zh-CN',
  fromLang: string = 'auto',
  onProgress?: (progress: number) => void,
  onRetry?: (attempt: number) => void
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

    // 单批次控制在 10 句或 1000 字符内，降低单次负荷
    if (currentChunkTexts.length >= 10 || currentChunkCharCount + s.length > 1000) {
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

  // 限制最大并发数为 2，批次之间平稳缓冲
  const CONCURRENCY = 2
  let completedChunks = 0

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const slice = chunks.slice(i, i + CONCURRENCY)
    await Promise.all(
      slice.map(async (chunk) => {
        const transList = await fetchGtxChunk(chunk.texts, targetLang, fromLang, onRetry)
        chunk.indices.forEach((origIdx, localIdx) => {
          finalResults[origIdx] = transList[localIdx] || ''
        })
        completedChunks++
        if (onProgress) {
          onProgress(Math.min(100, Math.round((completedChunks / chunks.length) * 100)))
        }
      })
    )
    if (i + CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  return finalResults
}
