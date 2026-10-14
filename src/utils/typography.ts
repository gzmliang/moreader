import { ref } from 'vue'

export interface TypographySettings {
  fontSize: number // 14 ~ 28 (px)
  fontFamily: string
}

export interface FontFamilyOption {
  id: string
  labelKey: string
  cssFont: string
}

export const FONT_FAMILY_PRESETS: FontFamilyOption[] = [
  {
    id: 'system',
    labelKey: 'typography.fontSystem',
    cssFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important',
  },
  {
    id: 'serif',
    labelKey: 'typography.fontSerif',
    cssFont: 'Georgia, Cambria, "Times New Roman", "Songti SC", "SimSun", serif !important',
  },
  {
    id: 'sans',
    labelKey: 'typography.fontSans',
    cssFont: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif !important',
  },
  {
    id: 'round',
    labelKey: 'typography.fontRound',
    cssFont: '"STKaiti", "KaiTi", "BiauKai", "DFKai-SB", cursive, serif !important',
  },
]

const TYPOGRAPHY_STORAGE_KEY = 'moreader-typography-settings'

export function loadTypographySettings(): TypographySettings {
  try {
    const raw = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        fontSize: typeof parsed.fontSize === 'number' ? Math.max(12, Math.min(32, parsed.fontSize)) : 18,
        fontFamily: parsed.fontFamily || 'serif',
      }
    }
  } catch (e) {
    console.warn('Failed to load typography settings:', e)
  }
  return {
    fontSize: 18,
    fontFamily: 'serif',
  }
}

export function saveTypographySettings(settings: TypographySettings) {
  try {
    localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save typography settings:', e)
  }
}

export function useTypography() {
  const initial = loadTypographySettings()
  const fontSize = ref(initial.fontSize)
  const fontFamily = ref(initial.fontFamily)

  const setFontSize = (size: number) => {
    fontSize.value = Math.max(13, Math.min(30, size))
    saveTypographySettings({ fontSize: fontSize.value, fontFamily: fontFamily.value })
  }

  const setFontFamily = (familyId: string) => {
    fontFamily.value = familyId
    saveTypographySettings({ fontSize: fontSize.value, fontFamily: fontFamily.value })
  }

  const resetTypography = () => {
    fontSize.value = 18
    fontFamily.value = 'serif'
    saveTypographySettings({ fontSize: 18, fontFamily: 'serif' })
  }

  const getCurrentCssFont = (): string => {
    const found = FONT_FAMILY_PRESETS.find(f => f.id === fontFamily.value)
    return found ? found.cssFont : FONT_FAMILY_PRESETS[1].cssFont
  }

  return {
    fontSize,
    fontFamily,
    setFontSize,
    setFontFamily,
    resetTypography,
    getCurrentCssFont,
    fontPresets: FONT_FAMILY_PRESETS,
  }
}
