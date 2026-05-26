import { ref, computed } from 'vue'
import zhCN from './locales/zh-CN'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import ptBR from './locales/pt-BR'
import fr from './locales/fr'
import de from './locales/de'

export type SupportedLocale = 'zh-CN' | 'en' | 'ja' | 'ko' | 'pt-BR' | 'fr' | 'de'

export interface Locale {
  code: SupportedLocale
  name: string
  nativeName: string
  messages: Record<string, string>
}

const locales: Record<SupportedLocale, Locale> = {
  'zh-CN': { code: 'zh-CN', name: 'Chinese', nativeName: '中文', messages: zhCN },
  'en': { code: 'en', name: 'English', nativeName: 'English', messages: en },
  'ja': { code: 'ja', name: 'Japanese', nativeName: '日本語', messages: ja },
  'ko': { code: 'ko', name: 'Korean', nativeName: '한국어', messages: ko },
  'pt-BR': { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', messages: ptBR },
  'fr': { code: 'fr', name: 'French', nativeName: 'Français', messages: fr },
  'de': { code: 'de', name: 'German', nativeName: 'Deutsch', messages: de },
}

// Reactive current locale
const currentLocale = ref<SupportedLocale>(
  (localStorage.getItem('moreader-locale') as SupportedLocale) || 'zh-CN'
)

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = locales[currentLocale.value]
  if (!lang) return key
  let msg = lang.messages[key] || lang.messages[key.split('.').pop()!] || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return msg
}

export function setLocale(locale: SupportedLocale) {
  currentLocale.value = locale
  localStorage.setItem('moreader-locale', locale)
}

export function getLocaleName(code?: SupportedLocale): string {
  const c = code || currentLocale.value
  return locales[c]?.nativeName || c
}

export const availableLocales = computed(() =>
  Object.values(locales).map(l => ({ code: l.code, name: l.nativeName }))
)

export function useI18n() {
  return {
    t,
    locale: currentLocale,
    setLocale,
    getLocaleName,
    availableLocales,
  }
}
