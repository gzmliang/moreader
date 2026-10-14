<template>
  <header class="flex-none h-14 border-b transition-colors duration-300 z-50 px-4 select-none" :class="theme.headerClass">
    <div class="h-full w-full flex items-center justify-between gap-2">
      <!-- 【左区】返回 + 品牌Logo + 书籍元信息 -->
      <div class="flex items-center gap-2 min-w-0">
        <!-- Back Button (有书且可回退时高亮) -->
        <button
          v-if="hasBook"
          @click="$emit('goBack')"
          class="p-1.5 rounded-lg border transition-colors flex items-center justify-center shrink-0"
          :class="[canGoBack ? [theme.buttonHoverClass, theme.borderColor] : 'opacity-30 cursor-not-allowed border-transparent']"
          :disabled="!canGoBack"
          :title="t('header.back')"
        >
          <ArrowLeft class="w-4 h-4" :class="theme.textColor" />
        </button>

        <!-- Brand Icon -->
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-indigo-950 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
          M
        </div>

        <!-- Title & Author (截断处理) -->
        <div class="flex flex-col min-w-0 pr-2">
          <h1 class="text-xs font-semibold tracking-tight truncate leading-tight" :class="theme.textColor">
            {{ hasBook ? (bookTitle || t('app.title')) : t('app.title') }}
          </h1>
          <p v-if="hasBook && bookAuthor" class="text-[10px] opacity-60 truncate leading-tight" :class="theme.textColor">
            {{ bookAuthor }}
          </p>
        </div>
      </div>

      <!-- 【中区】阅读与排版控制核心舱 (有书时常驻) -->
      <div v-if="hasBook" class="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shrink-0">
        <!-- 目录大纲 TOC -->
        <button
          @click="$emit('toggleToc')"
          class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          :class="[showToc ? 'bg-white dark:bg-gray-800 shadow-sm ' + theme.textColor : 'opacity-75 hover:opacity-100 ' + theme.textColor]"
          :title="t('header.toc')"
        >
          <List class="w-3.5 h-3.5" />
          <span class="hidden md:inline">{{ t('reader.toc') }}</span>
        </button>

        <div class="w-[1px] h-3.5 bg-black/10 dark:bg-white/10 mx-0.5"></div>

        <!-- 单双页切换 -->
        <div class="flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5">
          <button
            @click="$emit('setLayoutMode', 'double')"
            class="px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1"
            :class="[layoutMode === 'double' ? 'bg-white dark:bg-gray-800 shadow-sm ' + theme.textColor : 'opacity-60 hover:opacity-100 ' + theme.textColor]"
            :title="t('header.twoPageLayout')"
          >
            <BookOpen class="w-3 h-3" />
            <span class="hidden lg:inline">{{ t('header.twoPageLayout') }}</span>
          </button>
          <button
            @click="$emit('setLayoutMode', 'single')"
            class="px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1"
            :class="[layoutMode === 'single' ? 'bg-white dark:bg-gray-800 shadow-sm ' + theme.textColor : 'opacity-60 hover:opacity-100 ' + theme.textColor]"
            :title="t('header.singlePageLayout')"
          >
            <Columns2 class="w-3 h-3 rotate-90" />
            <span class="hidden lg:inline">{{ t('header.singlePageLayout') }}</span>
          </button>
        </div>

        <div class="w-[1px] h-3.5 bg-black/10 dark:bg-white/10 mx-0.5"></div>

        <!-- 字体与排版设置 -->
        <button
          @click="$emit('toggleUnifiedSettings')"
          class="px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
          :class="[showUnifiedSettings ? 'bg-white dark:bg-gray-800 shadow-sm ' + theme.textColor : theme.textColor]"
          :title="t('settings.unifiedTitle')"
        >
          <Type class="w-3.5 h-3.5" />
          <span class="text-[11px] font-semibold">Aa</span>
        </button>

        <!-- 快速主题调色圆点 (支持直接快捷切换) -->
        <div class="flex items-center gap-1 px-1">
          <button
            @click="$emit('setThemeDirect', 'default')"
            class="w-3.5 h-3.5 rounded-full bg-white border transition-transform hover:scale-110"
            :class="[currentThemeId === 'default' ? 'ring-2 ring-blue-500 scale-105' : 'border-gray-300 dark:border-gray-600']"
            :title="t('theme.default')"
          ></button>
          <button
            @click="$emit('setThemeDirect', 'parchment')"
            class="w-3.5 h-3.5 rounded-full bg-[#F4ECD8] border transition-transform hover:scale-110"
            :class="[currentThemeId === 'parchment' ? 'ring-2 ring-blue-500 scale-105' : 'border-amber-300']"
            :title="t('theme.parchment')"
          ></button>
          <button
            @click="$emit('setThemeDirect', 'dark')"
            class="w-3.5 h-3.5 rounded-full bg-[#1A1A1A] border transition-transform hover:scale-110"
            :class="[currentThemeId === 'dark' ? 'ring-2 ring-blue-500 scale-105' : 'border-gray-700']"
            :title="t('theme.dark')"
          ></button>
        </div>

        <div class="w-[1px] h-3.5 bg-black/10 dark:bg-white/10 mx-0.5"></div>

        <!-- TTS 朗读核心控制按钮 (醒目蓝) -->
        <button
          @click="$emit('ttsPlayPause')"
          class="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 text-white shadow-sm"
          :class="[(ttsPlaying || ttsGenerating) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700']"
          :title="ttsGenerating ? t('tts.preparing') : (ttsPaused ? t('header.resume') : (ttsPlaying ? t('header.pause') : t('header.play')))"
        >
          <Loader2 v-if="ttsGenerating" class="w-3.5 h-3.5 animate-spin" />
          <Volume2 v-else-if="!ttsPlaying && !ttsPaused" class="w-3.5 h-3.5" />
          <Play v-else-if="ttsPaused" class="w-3.5 h-3.5" />
          <Pause v-else class="w-3.5 h-3.5" />
          <span>{{ ttsGenerating ? t('tts.preparing') : (ttsPaused ? t('header.resume') : (ttsPlaying ? t('header.pause') : t('header.play'))) }}</span>
        </button>

        <button
          v-if="ttsPlaying || ttsPaused || ttsGenerating"
          @click="$emit('ttsStop')"
          class="p-1 rounded-lg text-xs transition-colors hover:bg-red-500/10 text-red-500"
          :title="t('header.stop')"
        >
          <Square class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- 【右区】学习与系统工具组 (轻量无边框微图标，通透自然) -->
      <div class="flex items-center gap-1 shrink-0" v-if="hasBook">
        <!-- ✨ AI 专属微光小胶囊 -->
        <button
          @click="$emit('toggleAiReading')"
          class="px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1 transition-all shadow-sm mr-1"
          :class="[showAiReading ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20']"
          :title="t('aiReading.title')"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>AI</span>
        </button>

        <!-- 双语翻译 Toggle -->
        <button
          @click="$emit('toggleBilingual')"
          class="p-1.5 rounded-lg transition-colors"
          :class="[showBilingual ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="t('header.bilingual')"
        >
          <Languages v-if="!isTranslatingBilingual" class="w-4 h-4" :class="showBilingual ? 'text-blue-500 font-bold' : theme.textColor" />
          <Loader2 v-else class="w-4 h-4 text-blue-500 animate-spin" />
        </button>

        <!-- 高亮与笔记 Highlights -->
        <button
          @click="$emit('toggleHighlights')"
          class="p-1.5 rounded-lg transition-colors"
          :class="[showHighlights ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="t('highlight.title')"
        >
          <Highlighter class="w-4 h-4" :class="theme.textColor" />
        </button>

        <!-- 书签 Bookmarks -->
        <button
          @click="$emit('toggleBookmarks')"
          class="p-1.5 rounded-lg transition-colors"
          :class="[showBookmarks ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="t('bookmark.title')"
        >
          <Bookmark class="w-4 h-4" :class="theme.textColor" />
        </button>

        <!-- 云同步 Sync -->
        <button
          @click="$emit('toggleSync')"
          class="p-1.5 rounded-lg transition-colors"
          :class="[showSync ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="t('sync.title')"
        >
          <Cloud class="w-4 h-4" :class="theme.textColor" />
        </button>

        <!-- 全屏 / 布局拉伸 -->
        <button
          @click="$emit('toggleLayout')"
          class="p-1.5 rounded-lg transition-colors"
          :class="[isFullWidth ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="isFullWidth ? t('header.collapseLayout') : t('header.expandLayout')"
        >
          <Maximize2 v-if="!isFullWidth" class="w-4 h-4" :class="theme.textColor" />
          <Minimize2 v-else class="w-4 h-4" :class="theme.textColor" />
        </button>

        <!-- 语言切换 -->
        <div class="relative" ref="langDropdownRef">
          <button
            @click="showLangMenu = !showLangMenu"
            class="p-1.5 rounded-lg transition-colors"
            :class="[showLangMenu ? theme.activeButtonClass : '', theme.buttonHoverClass]"
            :title="t('header.language')"
          >
            <Globe class="w-4 h-4" :class="theme.textColor" />
          </button>
          <div
            v-if="showLangMenu"
            class="absolute top-full right-0 mt-1 w-36 rounded-lg border shadow-lg overflow-hidden z-50"
            :class="[theme.menuBgClass, theme.borderColor]"
          >
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              @click="setLocale(loc.code as any); showLangMenu = false"
              class="w-full text-left px-3 py-2 text-sm hover:bg-black/10 transition-colors"
              :class="[locale === loc.code ? 'bg-blue-500/20 font-medium' : '', theme.textColor]"
            >
              {{ loc.name }}
            </button>
          </div>
        </div>

        <!-- 退出关闭 -->
        <button
          @click="$emit('closeBook')"
          class="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-gray-500 hover:text-red-600"
          :title="t('header.close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 无书打开时的书架顶栏 -->
      <div v-else class="flex items-center gap-2">
        <button
          @click="$emit('toggleSync')"
          class="p-2 rounded-lg transition-colors"
          :class="[showSync ? theme.activeButtonClass : '', theme.buttonHoverClass]"
          :title="t('sync.title')"
        >
          <Cloud class="w-4 h-4" :class="theme.textColor" />
        </button>

        <button
          @click="$emit('toggleDonate')"
          class="px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
        >
          <span>☕</span>
          <span>{{ t('donate.btn') }}</span>
        </button>

        <div class="relative" ref="langDropdownRef">
          <button
            @click="showLangMenu = !showLangMenu"
            class="px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1"
            :class="[theme.borderColor, theme.textColor, 'hover:bg-black/5']"
          >
            <Globe class="w-3.5 h-3.5" />
            <span>{{ getLocaleName() }}</span>
          </button>
          <div
            v-if="showLangMenu"
            class="absolute top-full right-0 mt-1 w-36 rounded-lg border shadow-lg overflow-hidden z-50"
            :class="[theme.menuBgClass, theme.borderColor]"
          >
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              @click="setLocale(loc.code as any); showLangMenu = false"
              class="w-full text-left px-3 py-2 text-sm hover:bg-black/10 transition-colors"
              :class="[locale === loc.code ? 'bg-blue-500/20 font-medium' : '', theme.textColor]"
            >
              {{ loc.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  BookOpen, Maximize2, Minimize2, List, ArrowLeft,
  Volume2, Play, Pause, Square, X, Globe, Bookmark, Highlighter,
  Cloud, Sparkles, Languages, Loader2, Type, Columns2
} from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const { t, locale, setLocale, getLocaleName, availableLocales } = useI18n()

defineProps<{
  hasBook: boolean
  bookTitle?: string
  bookAuthor?: string
  theme: Record<string, string>
  currentThemeId?: string
  layoutMode?: 'single' | 'double'
  isFullWidth: boolean
  showToc: boolean
  showThemeMenu: boolean
  showUnifiedSettings?: boolean
  showAiReading?: boolean
  showBookmarks: boolean
  showHighlights: boolean
  showSync: boolean
  showBilingual?: boolean
  isTranslatingBilingual?: boolean
  ttsPlaying: boolean
  ttsPaused: boolean
  ttsGenerating?: boolean
  canGoBack: boolean
}>()

defineEmits([
  'toggleLayout', 'setLayoutMode', 'toggleToc', 'goBack',
  'toggleThemeMenu', 'setThemeDirect', 'ttsPlayPause', 'ttsStop',
  'toggleUnifiedSettings', 'toggleAiReading', 'toggleBookmarks',
  'toggleHighlights', 'toggleSync', 'toggleDonate', 'toggleBilingual', 'closeBook'
])

const showLangMenu = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)

function handleGlobalClick(e: MouseEvent) {
  if (showLangMenu.value && langDropdownRef.value && !langDropdownRef.value.contains(e.target as Node)) {
    showLangMenu.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showLangMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick, true)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
