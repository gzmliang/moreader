/**
 * 语言与黄金音色智能匹配系统（移植自 ReadMate 成熟方案）
 */

export const GOLDEN_EDGE_VOICES: Record<string, { voice: string; name: string; lang: string }> = {
  'zh': { voice: 'zh-CN-XiaoxiaoNeural', name: '晓晓 (温婉女声)', lang: 'zh-CN' },
  'zh-CN': { voice: 'zh-CN-XiaoxiaoNeural', name: '晓晓 (温婉女声)', lang: 'zh-CN' },
  'zh-TW': { voice: 'zh-TW-HsiaoChenNeural', name: '曉臻 (台湾女声)', lang: 'zh-TW' },
  'en': { voice: 'en-US-JennyNeural', name: 'Jenny (Natural US)', lang: 'en-US' },
  'en-US': { voice: 'en-US-JennyNeural', name: 'Jenny (Natural US)', lang: 'en-US' },
  'en-GB': { voice: 'en-GB-SoniaNeural', name: 'Sonia (British)', lang: 'en-GB' },
  'ja': { voice: 'ja-JP-NanamiNeural', name: '七海 (自然日语)', lang: 'ja-JP' },
  'ko': { voice: 'ko-KR-SunHiNeural', name: '선희 (自然韩语)', lang: 'ko-KR' },
  'fr': { voice: 'fr-FR-DeniseNeural', name: 'Denise (Français)', lang: 'fr-FR' },
  'de': { voice: 'de-DE-KatjaNeural', name: 'Katja (Deutsch)', lang: 'de-DE' },
  'es': { voice: 'es-ES-ElviraNeural', name: 'Elvira (Español)', lang: 'es-ES' },
  'ru': { voice: 'ru-RU-SvetlanaNeural', name: 'Светлана (Русский)', lang: 'ru-RU' },
}

/** 快速检测文本语言 */
export function detectTextLang(text: string): string {
  if (!text) return 'zh'
  const sample = text.slice(0, 500)

  // 日文假名
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return 'ja'
  // 韩文谚文
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(sample)) return 'ko'
  // 俄文字母
  if (/[\u0400-\u04FF]/.test(sample)) return 'ru'

  // 中文字符统计
  const chineseChars = (sample.match(/[\u4E00-\u9FFF]/g) || []).length
  // 英文/拉丁字母统计
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length

  if (chineseChars > 20) return 'zh'
  if (latinChars > chineseChars * 2) return 'en'
  return chineseChars >= latinChars ? 'zh' : 'en'
}

/** 获取匹配的黄金 Edge 音色 */
export function getGoldenEdgeVoice(langCodeOrText: string): string {
  const code = langCodeOrText.length <= 10 ? langCodeOrText.toLowerCase() : detectTextLang(langCodeOrText)
  const shortCode = code.split(/[-_]/)[0]
  return GOLDEN_EDGE_VOICES[code]?.voice || GOLDEN_EDGE_VOICES[shortCode]?.voice || 'zh-CN-XiaoxiaoNeural'
}
