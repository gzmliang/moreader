import { callCustomLLM } from '@/services/llm'
import type { LLMConfig } from '@/types/book'

/**
 * 使用用户配置的 AI 大模型批量翻译句子列表（带上下文意译与严格对齐）
 */
export async function translateSentenceBatchWithLLM(
  sentences: string[],
  targetLang: string = 'zh-CN',
  llmConfig: LLMConfig,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  if (!sentences || sentences.length === 0) return []

  const results: string[] = new Array(sentences.length).fill('')
  
  // 单批次 10 句，保证大模型能充分理解上下文同时维持严格对齐
  const CHUNK_SIZE = 10
  const chunks: { indices: number[]; texts: string[] }[] = []

  for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
    const indices: number[] = []
    const texts: string[] = []
    for (let j = i; j < Math.min(i + CHUNK_SIZE, sentences.length); j++) {
      indices.push(j)
      texts.push(sentences[j])
    }
    chunks.push({ indices, texts })
  }

  let completed = 0

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx]
    const promptLines = chunk.texts.map((t, idx) => `[${idx + 1}] ${t}`).join('\n')

    const systemPrompt = `You are a master literary translator. Translate the given numbered English sentences into natural, idiomatic, and elegant ${targetLang}.
CRITICAL RULES:
1. Return strictly one translated line per original sentence with the exact same number prefix, like:
[1] 译文内容
[2] 译文内容
2. Do not merge, skip, or add sentences. Output total exactly ${chunk.texts.length} lines.
3. No explanations, greetings, markdown headers or extra text.`

    const userPrompt = `Translate these ${chunk.texts.length} sentences:\n${promptLines}`

    try {
      const response = await callCustomLLM(llmConfig, {
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        max_tokens: 2000,
      })

      if (response.success && response.text) {
        const lines = response.text.split('\n').map(l => l.trim()).filter(Boolean)
        const translatedMap = new Map<number, string>()

        for (const line of lines) {
          const match = line.match(/^\[(\d+)\]\s*(.+)$/)
          if (match) {
            const num = parseInt(match[1], 10)
            translatedMap.set(num - 1, match[2].trim())
          }
        }

        // 填充结果
        for (let idx = 0; idx < chunk.texts.length; idx++) {
          const trans = translatedMap.get(idx) || (lines[idx] ? lines[idx].replace(/^\[\d+\]\s*/, '').trim() : '')
          results[chunk.indices[idx]] = trans
        }
      }
    } catch (err) {
      console.warn('[AITranslator] Chunk translation failed:', err)
    }

    completed++
    if (onProgress) {
      onProgress(Math.min(100, Math.round((completed / chunks.length) * 100)))
    }

    // 微小延时，平稳调用
    if (cIdx < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return results
}
