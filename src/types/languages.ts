export interface TargetLanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
  group: 'popular' | 'more'
}

/**
 * 常用热门目标语言（置顶快捷选择）
 */
export const POPULAR_TARGET_LANGUAGES: TargetLanguageOption[] = [
  { code: 'zh-CN', name: '简体中文', nativeName: 'Simplified Chinese', flag: '🇨🇳', group: 'popular' },
  { code: 'zh-TW', name: '繁體中文', nativeName: 'Traditional Chinese', flag: '🇭🇰', group: 'popular' },
  { code: 'en', name: '英语', nativeName: 'English', flag: '🇺🇸', group: 'popular' },
  { code: 'ja', name: '日语', nativeName: '日本語', flag: '🇯🇵', group: 'popular' },
  { code: 'ko', name: '韩语', nativeName: '한국어', flag: '🇰🇷', group: 'popular' },
  { code: 'fr', name: '法语', nativeName: 'Français', flag: '🇫🇷', group: 'popular' },
  { code: 'de', name: '德语', nativeName: 'Deutsch', flag: '🇩🇪', group: 'popular' },
  { code: 'es', name: '西班牙语', nativeName: 'Español', flag: '🇪🇸', group: 'popular' },
  { code: 'ru', name: '俄语', nativeName: 'Русский', flag: '🇷🇺', group: 'popular' },
  { code: 'pt', name: '葡萄牙语', nativeName: 'Português', flag: '🇵🇹', group: 'popular' },
]

/**
 * 全球更多语言（方案 B 完整分类）
 */
export const MORE_TARGET_LANGUAGES: TargetLanguageOption[] = [
  { code: 'it', name: '意大利语', nativeName: 'Italiano', flag: '🇮🇹', group: 'more' },
  { code: 'nl', name: '荷兰语', nativeName: 'Nederlands', flag: '🇳🇱', group: 'more' },
  { code: 'ar', name: '阿拉伯语', nativeName: 'العربية', flag: '🇸🇦', group: 'more' },
  { code: 'vi', name: '越南语', nativeName: 'Tiếng Việt', flag: '🇻🇳', group: 'more' },
  { code: 'th', name: '泰语', nativeName: 'ไทย', flag: '🇹🇭', group: 'more' },
  { code: 'id', name: '印尼语', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', group: 'more' },
  { code: 'ms', name: '马来语', nativeName: 'Bahasa Melayu', flag: '🇲🇾', group: 'more' },
  { code: 'tr', name: '土耳其语', nativeName: 'Türkçe', flag: '🇹🇷', group: 'more' },
  { code: 'pl', name: '波兰语', nativeName: 'Polski', flag: '🇵🇱', group: 'more' },
  { code: 'uk', name: '乌克兰语', nativeName: 'Українська', flag: '🇺🇦', group: 'more' },
  { code: 'el', name: '希腊语', nativeName: 'Ελληνικά', flag: '🇬🇷', group: 'more' },
  { code: 'cs', name: '捷克语', nativeName: 'Čeština', flag: '🇨🇿', group: 'more' },
  { code: 'sv', name: '瑞典语', nativeName: 'Svenska', flag: '🇸🇪', group: 'more' },
  { code: 'da', name: '丹麦语', nativeName: 'Dansk', flag: '🇩🇰', group: 'more' },
  { code: 'fi', name: '芬兰语', nativeName: 'Suomi', flag: '🇫🇮', group: 'more' },
  { code: 'no', name: '挪威语', nativeName: 'Norsk', flag: '🇳🇴', group: 'more' },
  { code: 'hu', name: '匈牙利语', nativeName: 'Magyar', flag: '🇭🇺', group: 'more' },
  { code: 'ro', name: '罗马尼亚语', nativeName: 'Română', flag: '🇷🇴', group: 'more' },
  { code: 'hi', name: '印地语', nativeName: 'हिन्दी', flag: '🇮🇳', group: 'more' },
  { code: 'he', name: '希伯来语', nativeName: 'עברית', flag: '🇮🇱', group: 'more' },
]

export const ALL_TARGET_LANGUAGES: TargetLanguageOption[] = [
  ...POPULAR_TARGET_LANGUAGES,
  ...MORE_TARGET_LANGUAGES,
]
