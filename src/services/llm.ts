import type { LLMProvider, LLMConfig } from '@/types/book'

export interface TranslateResult {
  success: boolean
  text: string
  error?: string
}

export type TranslateMode = 'translate' | 'explain' | 'analyze'

const SYSTEM_PROMPTS: Record<TranslateMode, string> = {
  translate: 'You are a professional translator. Translate the given text to Chinese. Only return the translation, no explanations.',
  explain: `You are an expert language tutor helping a Chinese-speaking student understand English text.

For the given English text, provide:
1. **中文释义** — A clear Chinese translation/paraphrase of the meaning
2. **语境解析** — Explain the meaning in context: what is the speaker/writer really saying? What's the implied meaning?
3. **重点词汇** — List key words/phrases with Chinese explanations and example usage
4. **用法提示** — Usage tips, collocations, or common expressions related to the text

Be concise but thorough. Use Chinese as the primary explanation language.`,
  analyze: `You are a grammar analysis expert helping Chinese-speaking students understand English sentence structures.

For the given English text, provide a detailed grammatical analysis:
1. **句子结构分析** — Break down the sentence structure (主语/谓语/宾语/定语/状语/补语), identifying clauses and their relationships
2. **语法要点** — Explain the key grammar rules/patterns used (tense, mood, voice, etc.)
3. **核心词汇** — Analyze important vocabulary: part of speech, meaning, and grammatical function in context
4. **双语对照解释** — For each major structure, provide both the English grammar explanation AND the Chinese equivalent, so the student understands how the concept maps between languages
5. **易错提示** — Point out common mistakes Chinese learners make with similar structures

Use clear, structured formatting. Prioritize clarity over comprehensiveness.`,
}

// Provider-specific endpoint normalization
function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, '') // remove trailing slashes
}

async function callLLM(config: LLMConfig, text: string, mode: TranslateMode, onChunk?: (chunk: string) => void): Promise<TranslateResult> {
  if (!config.apiKey) {
    return { success: false, text: '', error: 'API Key not configured' }
  }

  const endpoint = normalizeEndpoint(config.endpoint)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Different providers may have different auth header names
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://moreader.app'
    headers['X-Title'] = 'Moreader'
  }
  headers['Authorization'] = `Bearer ${config.apiKey}`

  const prompt = SYSTEM_PROMPTS[mode]
  const userText = mode === 'translate'
    ? `Translate to Chinese: ${text}`
    : `Text: "${text}"`

  const body: Record<string, unknown> = {
    model: config.model,
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

    const response = await fetch(`${endpoint}/chat/completions`, {
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

export default { callLLM, testLLMConnection }
