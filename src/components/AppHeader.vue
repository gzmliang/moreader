<template>
  <header class="flex-none h-14 border-b transition-colors duration-300 z-50" :class="theme.headerClass">
    <div class="h-full max-w-5xl mx-auto px-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <BookOpen class="w-5 h-5 opacity-60" :class="theme.textColor" />
        <h1 class="text-base font-medium tracking-tight" :class="theme.textColor">{{ t('app.title') }}</h1>
      </div>
      <div class="flex items-center gap-1" v-if="hasBook">
        <!-- Layout Toggle -->
        <button @click="$emit('toggleLayout')" class="p-2 rounded transition-colors" :class="[isFullWidth ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="isFullWidth ? t('header.collapseLayout') : t('header.expandLayout')">
          <Maximize2 v-if="!isFullWidth" class="w-4 h-4" :class="theme.textColor" />
          <Minimize2 v-else class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- TOC -->
        <button @click="$emit('toggleToc')" class="p-2 rounded transition-colors" :class="[showToc ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('header.toc')">
          <List class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Back -->
        <button @click="$emit('goBack')" class="p-2 rounded transition-colors" :class="[canGoBack ? theme.buttonHoverClass : 'opacity-30 cursor-not-allowed']" :disabled="!canGoBack" :title="t('header.back')">
          <ArrowLeft class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Theme -->
        <button @click="$emit('toggleThemeMenu')" class="p-2 rounded transition-colors" :class="[showThemeMenu ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('header.theme')">
          <Palette class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- TTS Play/Pause -->
        <button @click="$emit('ttsPlayPause')" class="p-2 rounded transition-colors" :class="[ttsPlaying ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="ttsPaused ? t('header.resume') : (ttsPlaying ? t('header.pause') : t('header.play'))">
          <Volume2 v-if="!ttsPlaying && !ttsPaused" class="w-4 h-4" :class="theme.textColor" />
          <Play v-else-if="ttsPaused" class="w-4 h-4" :class="theme.textColor" />
          <Pause v-else class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- TTS Stop -->
        <button @click="$emit('ttsStop')" class="p-2 rounded transition-colors" :class="[(!ttsPlaying && !ttsPaused) ? 'opacity-30 cursor-not-allowed' : theme.buttonHoverClass]" :disabled="!ttsPlaying && !ttsPaused" :title="t('header.stop')">
          <Square v-if="ttsPlaying || ttsPaused" class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- TTS Settings -->
        <button @click="$emit('toggleTtsSettings')" class="p-2 rounded transition-colors" :class="[showTtsSettings ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('header.ttsSettings')">
          <Settings class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- AI Settings -->
        <button @click="$emit('toggleAiSettings')" class="p-2 rounded transition-colors" :class="[showAiSettings ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('header.aiSettings')">
          <Brain class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Bookmarks -->
        <button @click="$emit('toggleBookmarks')" class="p-2 rounded transition-colors" :class="[showBookmarks ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('bookmark.title')">
          <Bookmark class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Highlights -->
        <button @click="$emit('toggleHighlights')" class="p-2 rounded transition-colors" :class="[showHighlights ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('highlight.title')">
          <Highlighter class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Cloud Sync -->
        <button @click="$emit('toggleSync')" class="p-2 rounded transition-colors" :class="[showSync ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('sync.title')">
          <Cloud class="w-4 h-4" :class="theme.textColor" />
        </button>
        <!-- Language Selector -->
        <div class="relative" ref="langDropdownRef">
          <button @click="showLangMenu = !showLangMenu" class="p-2 rounded transition-colors" :class="[showLangMenu ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('header.language')">
            <Globe class="w-4 h-4" :class="theme.textColor" />
          </button>
          <div v-if="showLangMenu" class="absolute top-full right-0 mt-1 w-36 rounded-lg border shadow-lg overflow-hidden z-50" :class="[theme.menuBgClass, theme.borderColor]">
            <button v-for="loc in availableLocales" :key="loc.code"
              @click="setLocale(loc.code as any); showLangMenu = false"
              class="w-full text-left px-3 py-2 text-sm hover:bg-black/10 transition-colors"
              :class="[locale === loc.code ? 'bg-blue-500/20 font-medium' : '', theme.textColor]">
              {{ loc.name }}
            </button>
          </div>
        </div>
        <!-- Close -->
        <button @click="$emit('closeBook')" class="p-2 rounded transition-colors" :class="theme.buttonHoverClass" :title="t('header.close')">
          <X class="w-4 h-4" :class="theme.textColor" />
        </button>
      </div>
      <!-- Language button when no book open (in header right side) -->
      <div v-else class="flex items-center gap-1">
        <!-- Cloud Sync -->
        <button @click="$emit('toggleSync')" class="p-2 rounded transition-colors" :class="[showSync ? theme.activeButtonClass : '', theme.buttonHoverClass]" :title="t('sync.title')">
          <Cloud class="w-4 h-4" :class="theme.textColor" />
        </button>
        <div class="relative" ref="langDropdownRef">
          <button @click="showLangMenu = !showLangMenu" class="px-3 py-1.5 text-sm rounded border transition-colors" :class="[theme.borderColor, theme.textColor, 'hover:bg-black/5']">
            🌐 {{ getLocaleName() }}
          </button>
          <div v-if="showLangMenu" class="absolute top-full right-0 mt-1 w-36 rounded-lg border shadow-lg overflow-hidden z-50" :class="[theme.menuBgClass, theme.borderColor]">
            <button v-for="loc in availableLocales" :key="loc.code"
              @click="setLocale(loc.code as any); showLangMenu = false"
              class="w-full text-left px-3 py-2 text-sm hover:bg-black/10 transition-colors"
              :class="[locale === loc.code ? 'bg-blue-500/20 font-medium' : '', theme.textColor]">
              {{ loc.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen, Maximize2, Minimize2, List, ArrowLeft, Palette, Volume2, Play, Pause, Square, Settings, X, Globe, Brain, Bookmark, Highlighter, Cloud } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const { t, locale, setLocale, getLocaleName, availableLocales } = useI18n()

defineProps<{
  hasBook: boolean
  theme: Record<string, string>
  isFullWidth: boolean
  showToc: boolean
  showThemeMenu: boolean
  showTtsSettings: boolean
  showAiSettings: boolean
  showBookmarks: boolean
  showHighlights: boolean
  showSync: boolean
  ttsPlaying: boolean
  ttsPaused: boolean
  canGoBack: boolean
}>()

defineEmits(['toggleLayout', 'toggleToc', 'goBack', 'toggleThemeMenu', 'ttsPlayPause', 'ttsStop', 'toggleTtsSettings', 'toggleAiSettings', 'toggleBookmarks', 'toggleHighlights', 'toggleSync', 'closeBook'])

const showLangMenu = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)
</script>
