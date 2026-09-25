import type { LLMProvider, LLMConfig } from '@/types/book'

export interface TranslateResult {
  success: boolean
  text: string
  error?: string
}

export type TranslateMode = 'translate' | 'explain' | 'analyze'

function getSystemPrompt(mode: TranslateMode, sourceLang = 'auto', targetLang = 'zh-CN'): string {
  const target = targetLang || 'zh-CN'
  const source = sourceLang === 'auto' ? 'the source language' : sourceLang

  if (mode === 'translate') {
    return `You are a professional literary and technical translator. Translate the given text from ${source} accurately, naturally, and idiomatically into ${target}. Output ONLY the translated text without explanations, greetings, quotes, or markdown notes.`
  }

  if (mode === 'explain') {
    return `You are an expert language and literature tutor helping a student understand text in ${source}.
Explain the text thoroughly in ${target}:
1. **释义 / Meaning** — Accurate paraphrase/translation and core takeaway in ${target}
2. **语境解析 / Contextual Analysis** — Subtext, nuances, tone, cultural background, and emotional intent
3. **重点词汇与短语 / Key Vocabulary & Phrases** — Break down notable words, idioms, or cultural terms with concise explanations and examples in ${target}
4. **用法提示 / Usage Notes** — Collocations, register (formal/casual), and practical usage hints

Use ${target} as the explanation language. Keep formatting clean and readable.`
  }

  if (mode === 'analyze') {
    return `You are a linguistics and grammar expert analyzing a sentence structure in ${source}.
Provide a structured analysis in ${target}:
1. **句子结构分析 / Structural Breakdown** — Clause breakdown (Subject, Predicate, Object, Modifiers, Subordinate clauses)
2. **语法要点 / Grammar Points** — Tense, voice, mood, connectors, or special grammatical patterns used
3. **核心词汇与功能 / Functional Vocabulary** — Parts of speech and syntactic role in this context
4. **对照解析 / Contrastive Notes** — How this structure maps to ${target}, highlighting subtleties
5. **易错与理解陷阱 / Common Pitfalls** — Common misinterpretations or translation false-friends

Use ${target} as the analysis language with clear structured bullet points.`
  }

  return `You are a helpful language assistant. Analyze or translate the text into ${target}.`
}

// Provider-specific endpoint normalization
function normalizeEndpoint(endpoint: string): string {
  let ep = (endpoint || '').trim().replace(/\/+$/, '')
  if (!ep) return ''

  // 1. Auto-prepend protocol if omitted（公网一律 HTTPS 加密，仅局域网红保留明文）
  if (!/^https?:\/\//i.test(ep)) {
    const isPrivateHost = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(ep)
    ep = (isPrivateHost ? 'http://' : 'https://') + ep
  }

  // 2. If user already supplied /chat/completions
  if (ep.endsWith('/chat/completions')) {
    return ep
  }

  // 3. If missing /v1 and doesn't have custom sub-path
  if (!ep.endsWith('/v1') && !ep.includes('/v1/')) {
    ep += '/v1'
  }

  return `${ep}/chat/completions`
}

async function callLLM(
  config: LLMConfig,
  text: string,
  mode: TranslateMode,
  onChunk?: (chunk: string) => void,
  sourceLang = 'auto',
  targetLang = 'zh-CN'
): Promise<TranslateResult> {
  const url = normalizeEndpoint(config.endpoint)
  if (!url) {
    return { success: false, text: '', error: '接口地址未配置 (Endpoint is required)' }
  }

  if (!config.model || !config.model.trim()) {
    return { success: false, text: '', error: '模型名称未指定 (Model name is required)' }
  }

  if (!config.apiKey && config.provider !== 'custom') {
    return { success: false, text: '', error: 'API Key not configured' }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Different providers may have different auth header names
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://moreader.app'
    headers['X-Title'] = 'Moreader'
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`
  }

  const prompt = getSystemPrompt(mode, sourceLang, targetLang)
  const userText = mode === 'translate'
    ? `Translate to ${targetLang}:\n${text}`
    : `Text:\n"${text}"`

  const body: Record<string, unknown> = {
    model: config.model.trim(),
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userText },
    ],
    temperature: 0.3,
    max_tokens: 2000, // increased from 1000 to handle longer sentences
  }

  // Enable streaming if callback provided
  if (onChunk) {
    body.stream = true
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout, increased from 30s

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMsg = `HTTP ${response.status}`
      try {
        const errJson = JSON.parse(errorText)
        if (errJson.error?.message) errorMsg += `: ${errJson.error.message}`
        else if (errJson.message) errorMsg += `: ${errJson.message}`
        else errorMsg += `: ${errorText.slice(0, 200)}`
      } catch {
        errorMsg += `: ${errorText.slice(0, 200)}`
      }
      throw new Error(errorMsg)
    }

    // Streaming mode
    if (onChunk && body.stream) {
      const reader = response.body?.getReader()
      if (!reader) {
        // Fallback to non-streaming if body reader not available
        const data = await response.json()
        const result = data.choices?.[0]?.message?.content?.trim()
        if (!result) throw new Error('Empty response from LLM')
        return { success: true, text: result }
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices?.[0]?.delta?.content
            if (delta) {
              fullText += delta
              onChunk(delta)
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      if (!fullText.trim()) throw new Error('Empty response from LLM')
      return { success: true, text: fullText.trim() }
    }

    // Non-streaming mode
    const data = await response.json()
    const result = data.choices?.[0]?.message?.content?.trim()
    if (!result) throw new Error('Empty response from LLM')

    return { success: true, text: result }
  } catch (error) {
    let errorMsg = 'Unknown error'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMsg = '请求超时（60秒），请检查网络或模型响应速度'
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMsg = '网络请求失败，可能是CORS限制或网络不通。请检查：1) 浏览器扩展是否有该域名权限 2) API地址是否正确'
      } else {
        errorMsg = error.message
      }
    }
    return {
      success: false,
      text: '',
      error: errorMsg,
    }
  }
}

export async function testLLMConnection(config: LLMConfig): Promise<{ success: boolean; error?: string }> {
  const result = await callLLM(config, 'Hello', 'translate')
  return { success: result.success, error: result.error }
}

export interface CustomLLMRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  max_tokens?: number
}

export async function callCustomLLM(
  config: LLMConfig,
  req: CustomLLMRequest,
  onChunk?: (chunk: string) => void
): Promise<TranslateResult> {
  const url = normalizeEndpoint(config.endpoint)
  if (!url) {
    return { success: false, text: '', error: '接口地址未配置 (Endpoint is required)' }
  }

  if (!config.model || !config.model.trim()) {
    return { success: false, text: '', error: '模型名称未指定 (Model name is required)' }
  }

  if (!config.apiKey && config.provider !== 'custom') {
    return { success: false, text: '', error: 'API Key not configured' }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://moreader.app'
    headers['X-Title'] = 'Moreader'
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`
  }

  const body: Record<string, unknown> = {
    model: config.model.trim(),
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userPrompt },
    ],
    temperature: typeof req.temperature === 'number' ? req.temperature : 0.3,
    max_tokens: typeof req.max_tokens === 'number' ? req.max_tokens : 3000,
  }

  if (onChunk) {
    body.stream = true
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90s timeout for long text

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMsg = `HTTP ${response.status}`
      try {
        const errJson = JSON.parse(errorText)
        if (errJson.error?.message) errorMsg += `: ${errJson.error.message}`
        else if (errJson.message) errorMsg += `: ${errJson.message}`
        else errorMsg += `: ${errorText.slice(0, 200)}`
      } catch {
        errorMsg += `: ${errorText.slice(0, 200)}`
      }
      throw new Error(errorMsg)
    }

    if (onChunk && body.stream) {
      const reader = response.body?.getReader()
      if (!reader) {
        const data = await response.json()
        const result = data.choices?.[0]?.message?.content?.trim()
        if (!result) throw new Error('Empty response from LLM')
        return { success: true, text: result }
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices?.[0]?.delta?.content
            if (delta) {
              fullText += delta
              onChunk(delta)
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      if (!fullText.trim()) throw new Error('Empty response from LLM')
      return { success: true, text: fullText.trim() }
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content?.trim()
    if (!result) throw new Error('Empty response from LLM')

    return { success: true, text: result }
  } catch (error) {
    let errorMsg = 'Unknown error'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMsg = '请求超时（90秒），请检查网络或模型响应速度'
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMsg = '网络请求失败，可能是CORS限制或网络不通'
      } else {
        errorMsg = error.message
      }
    }
    return {
      success: false,
      text: '',
      error: errorMsg,
    }
  }
}

export default { callLLM, testLLMConnection, callCustomLLM }
