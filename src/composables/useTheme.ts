import { ref, computed } from 'vue'
import type { Theme } from '@/types/book'

const themes: Theme[] = [
  { id: 'default', name: 'theme.default', previewBg: '#FFFFFF', containerBg: '#F7F7F7', textColor: '#1A1A1A', readerBg: '#FFFFFF', readerText: '#1A1A1A', isDark: false },
  { id: 'parchment', name: 'theme.parchment', previewBg: '#F4ECD8', containerBg: '#F0E8D4', textColor: '#332D22', readerBg: '#F4ECD8', readerText: '#332D22', isDark: false },
  { id: 'gray', name: 'theme.gray', previewBg: '#E5E5E5', containerBg: '#E8E8E8', textColor: '#222222', readerBg: '#E5E5E5', readerText: '#222222', isDark: false },
  { id: 'dark', name: 'theme.dark', previewBg: '#1A1A1A', containerBg: '#121212', textColor: '#CCCCCC', readerBg: '#1A1A1A', readerText: '#CCCCCC', isDark: true },
]

const STORAGE_KEY = 'moreader-theme'
const currentId = ref<string>(localStorage.getItem(STORAGE_KEY) || 'default')

export function useTheme() {
  const current = computed(() => themes.find(t => t.id === currentId.value) ?? themes[0])
  const isDark = computed(() => current.value.isDark)

  const setTheme = (id: string) => {
    if (themes.find(t => t.id === id)) {
      currentId.value = id
      localStorage.setItem(STORAGE_KEY, id)
    }
  }

  const themeClasses = computed(() => {
    const t = current.value
    const d = t.isDark
    return {
      containerClass: d ? 'bg-[#121212]' : t.id === 'parchment' ? 'bg-[#F0E8D4]' : t.id === 'gray' ? 'bg-[#E8E8E8]' : 'bg-[#F7F7F7]',
      headerClass: d ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white/80 border-gray-200 backdrop-blur',
      mainBgClass: d ? 'bg-[#121212]' : t.id === 'parchment' ? 'bg-[#F0E8D4]' : t.id === 'gray' ? 'bg-[#E8E8E8]' : 'bg-[#F7F7F7]',
      textColor: d ? 'text-gray-300' : t.id === 'parchment' ? 'text-[#332D22]' : 'text-gray-900',
      buttonHoverClass: d ? 'hover:bg-white/10' : 'hover:bg-black/5',
      activeButtonClass: d ? 'bg-white/20' : 'bg-black/10',
      uploadIconBgClass: d ? 'bg-white/10' : 'bg-black/5',
      uploadButtonClass: d ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-900 text-white hover:bg-gray-800',
      bookItemClass: d ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-200',
      bookItemHoverClass: d ? 'hover:border-gray-600' : 'hover:border-gray-400',
      coverBgClass: d ? 'bg-gray-800' : 'bg-gray-100',
      deleteButtonClass: d ? 'hover:bg-red-900/30' : 'hover:bg-red-50',
      tocBgClass: d ? 'bg-[#1A1A1A]' : 'bg-white',
      tocItemClass: d ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-black/5',
      tocActiveClass: d ? 'font-medium bg-white/20 text-white' : 'font-medium bg-black/10 text-gray-900',
      menuBgClass: d ? 'bg-[#1A1A1A]' : 'bg-white',
      bookInfoBgClass: d ? 'bg-[#1A1A1A]/50' : 'bg-white/50',
      progressBgClass: d ? 'bg-[#1A1A1A]' : 'bg-[#F7F7F7]',
      navArrowClass: d ? 'bg-white/10 hover:bg-white/20' : 'bg-white/80 hover:bg-white shadow-sm',
      sliderBgClass: d ? 'bg-gray-700' : 'bg-gray-300',
      borderColor: d ? 'border-gray-800' : 'border-gray-200',
      borderTopColor: d ? 'border-t-gray-500' : 'border-t-gray-900',
      readerTextColor: d ? '#FFFFFF' : '#000000',
      readerBorderColor: d ? '#444444' : '#dddddd',
      codeBg: d ? '#333333' : '#f5f5f5',
      figcaptionColor: d ? '#CCCCCC' : '#666666',
      linkColor: d ? '#66b3ff' : '#0066cc',
    }
  })

  return { themes, current, currentId, isDark, setTheme, themeClasses }
}
