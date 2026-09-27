<template>
  <div class="h-screen flex flex-col overflow-hidden transition-colors duration-300" :class="themeClasses.containerClass">
    <!-- Loading Overlay -->
    <div v-if="bookStore.isLoadingBook" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl min-w-[300px]">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-full border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 animate-spin"></div>
          <p class="text-gray-700 dark:text-gray-200 font-medium">{{ loadingMessage }}</p>
          <div v-if="bookStore.loadingProgress > 0" class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: bookStore.loadingProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ★ v2.10.4：语音生成中提示（居中浮层 + 可随时取消；生成期间播放键会被闸门拦住，不会出现两份声音） -->
    <div v-if="ttsStore.isPreparingAudio" class="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      <div class="flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl bg-black/80 text-white backdrop-blur-sm">
        <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
        <span class="text-sm font-medium">{{ t('tts.preparing') }}</span>
        <span v-if="ttsStore.preparingTotal > 1" class="text-xs opacity-75 tabular-nums">{{ ttsStore.preparingCurrent }}/{{ ttsStore.preparingTotal }}</span>
        <button
          @click="ttsStore.cancelGenerating()"
          class="pointer-events-auto ml-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors"
          :title="t('tts.cancelGenerating')"
        >⏹ {{ t('tts.cancelGenerating') }}</button>
      </div>
    </div>

    <!-- Unified Translation / Result Panel -->
    <transition name="fade">
      <div v-if="showResultPanel" class="fixed z-[100] p-4 rounded-lg shadow-xl border overflow-y-auto moreader-result-panel" :class="[themeClasses.menuBgClass, themeClasses.borderColor]" :style="resultPanelStyle">
        <!-- Panel header -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold" :class="themeClasses.textColor">{{ resultPanelTitle }}</span>
          <button @click="closeResultPanel" class="p-1 rounded hover:bg-black/10" :class="themeClasses.textColor">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- AI / Free translation result -->
        <div v-if="resultPanelType === 'ai'" class="flex flex-col gap-2">
          <p class="text-xs opacity-60 p-2 rounded" :class="[isDark ? 'bg-white/5' : 'bg-black/5', themeClasses.textColor]">📝 {{ selectedText }}</p>
          <div v-if="llmStore.isTranslating || freeTranslating" class="flex items-center gap-2 py-4">
            <div class="w-4 h-4 border-2 rounded-full animate-spin" :class="[themeClasses.borderColor, themeClasses.borderTopColor]"></div>
            <span class="text-sm" :class="themeClasses.textColor">{{ t('llm.translating') }}</span>
          </div>
          <!-- Free translation text -->
          <p v-else-if="freeTranslateResult" class="text-sm whitespace-pre-wrap leading-relaxed" :class="themeClasses.textColor">{{ freeTranslateResult }}</p>
          <!-- Streaming text -->
          <p v-else-if="llmStore.streamingText" class="text-sm whitespace-pre-wrap leading-relaxed" :class="themeClasses.textColor">{{ llmStore.streamingText }}</p>
          <!-- Final result -->
          <p v-else-if="llmStore.lastResult" class="text-sm whitespace-pre-wrap leading-relaxed" :class="themeClasses.textColor">{{ llmStore.lastResult }}</p>
          <!-- Error with details -->
          <div v-else-if="llmStore.lastError && llmStore.lastError !== 'unknown'" class="text-sm text-red-400">
            <p class="font-medium">❌ {{ t('llm.error') }}</p>
            <p class="text-xs mt-1 opacity-80 font-mono break-all">{{ llmStore.lastError }}</p>
          </div>
          <p v-else-if="llmStore.lastError === 'unknown'" class="text-sm text-red-400">{{ t('llm.error') }}</p>
          <!-- Mode switch buttons -->
          <div v-if="!llmStore.isTranslating && !freeTranslating" class="flex gap-2 mt-2">
            <button @click="switchAIMode('explain')" class="flex-1 px-2 py-1 text-xs rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors text-purple-500">📖 {{ t('llm.explainMode') }}</button>
            <button @click="switchAIMode('analyze')" class="flex-1 px-2 py-1 text-xs rounded bg-green-500/10 hover:bg-green-500/20 transition-colors text-green-500">🔍 {{ t('llm.analyzeMode') }}</button>
          </div>
        </div>

        <!-- Recording TTS output -->
        <div v-if="resultPanelType === 'recording'" class="flex flex-col gap-3">
          <p class="text-xs opacity-60" :class="themeClasses.textColor">{{ t('recording.hint') }}</p>
          <p v-if="ttsStore.ttsProvider === 'browser'" class="text-xs text-orange-400">{{ t('recording.serverTTSOnly') }}</p>
          <div v-else class="flex flex-col gap-3">
            <div class="flex items-center justify-center gap-4 py-2">
              <button @click="startTTSRecording" :disabled="ttsStore.isRecordingTTS" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors" :class="ttsStore.isRecordingTTS ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white hover:bg-blue-600'">
                {{ ttsStore.isRecordingTTS ? '⏺ ' + t('recording.recording') : '⏺ ' + t('recording.start') }}
              </button>
              <button @click="stopTTSRecording" :disabled="!ttsStore.isRecordingTTS" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white transition-colors disabled:opacity-50">
                ⏹ {{ t('recording.stop') }}
              </button>
            </div>
            <div v-if="recordedResult" class="flex flex-col items-center gap-2">
              <p class="text-xs opacity-60 p-2 rounded w-full" :class="[isDark ? 'bg-white/5' : 'bg-black/5', themeClasses.textColor]">📝 {{ recordedResult.text.slice(0, 100) }}{{ recordedResult.text.length > 100 ? '...' : '' }}</p>
              <audio :src="recordedResult.url" controls class="w-full" />
              <div class="flex gap-2">
                <button @click="downloadTTSRecording" class="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600">{{ t('recording.download') }}</button>
                <button @click="recordedResult = null" class="px-3 py-1 text-xs rounded border" :class="[themeClasses.borderColor, themeClasses.textColor]">{{ t('recording.clear') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Per-chapter book TTS -->
        <div v-if="resultPanelType === 'bookTTS'" class="flex flex-col gap-3">
          <div v-if="!bookTTS.isRunning && chapterResults.length === 0" class="flex flex-col items-center gap-3">
            <p class="text-sm text-center" :class="themeClasses.textColor">{{ t('bookTTS.description') }}</p>
            <p class="text-xs opacity-60" :class="themeClasses.textColor">{{ t('bookTTS.engine') }}: {{ ttsStore.ttsProvider === 'edge' ? 'Edge TTS' : ttsStore.ttsProvider === 'ai_voice' ? 'AI Voice' : t('tts.browserVoice') }}</p>
            <p class="text-xs opacity-60" :class="themeClasses.textColor">{{ t('bookTTS.perChapterHint') }}</p>
            <button @click="startChapterTTS" class="px-6 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
              {{ t('bookTTS.start') }}
            </button>
          </div>
          <div v-if="bookTTS.isRunning" class="flex flex-col items-center gap-3">
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: bookTTS.progress + '%' }"></div>
            </div>
            <p class="text-sm" :class="themeClasses.textColor">{{ bookTTS.currentText }}</p>
            <p class="text-xs opacity-60" :class="themeClasses.textColor">{{ t('bookTTS.chapterProgress', { current: bookTTS.currentChapter, total: bookTTS.totalChapters }) }}</p>
            <button @click="cancelBookTTS" class="px-4 py-1 text-xs rounded border text-red-500 border-red-500 hover:bg-red-500/10">{{ t('bookTTS.cancel') }}</button>
          </div>
          <div v-if="chapterResults.length > 0" class="flex flex-col gap-2">
            <p class="text-sm font-medium" :class="themeClasses.textColor">{{ t('bookTTS.chaptersReady', { count: chapterResults.length }) }}</p>
            <div v-for="(ch, idx) in chapterResults" :key="idx" class="flex items-center gap-2 p-2 rounded border text-xs" :class="[themeClasses.borderColor, isDark ? 'bg-white/5' : 'bg-black/5']">
              <span class="flex-1 truncate" :class="themeClasses.textColor">📖 {{ ch.title }} ({{ ch.paragraphCount }} {{ t('bookTTS.segments') }})</span>
              <button @click="playChapterAudio(idx)" class="px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">▶</button>
              <button @click="downloadChapterAudio(idx)" class="px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">{{ t('bookTTS.download') }}</button>
            </div>
          </div>
          <p v-if="bookTTS.error" class="text-sm text-red-400 text-center">{{ bookTTS.error }}</p>
        </div>
      </div>
    </transition>

    <!-- Header -->
    <AppHeader
      :has-book="!!currentBook || (isPdfBook && !!currentPdfBuffer)"
      :theme="themeClasses"
      :is-full-width="isFullWidth"
      :show-toc="showToc"
      :show-theme-menu="showThemeMenu"
      :show-unified-settings="showUnifiedSettings"
      :show-ai-reading="showAiReading"
      :show-bilingual="bilingualStore.isBilingualActive"
      :is-translating-bilingual="bilingualStore.isTranslating"
      :tts-playing="ttsStore.isPlaying"
      :tts-paused="ttsStore.isPaused"
      :tts-generating="ttsStore.isGenerating"
      :can-go-back="canGoBack"
      :show-bookmarks="showBookmarks"
      :show-highlights="showHighlights"
      :show-sync="showSync"
      @toggle-donate="showDonate = true"
      @toggle-layout="toggleLayout"
      @toggle-toc="toggleToc"
      @go-back="goBack"
      @toggle-theme-menu="toggleThemeMenu"
      @toggle-bilingual="handleToggleBilingual"
      @tts-play-pause="handleTTSPlayPause"
      @tts-stop="handleTTSStop"
      @toggle-unified-settings="showUnifiedSettings = !showUnifiedSettings"
      @toggle-ai-reading="openAiReadingModal"
      @toggle-bookmarks="showBookmarks = !showBookmarks; showHighlights = false"
      @toggle-highlights="showHighlights = !showHighlights; showBookmarks = false"
      @toggle-sync="showSync = !showSync"
      @close-book="closeBook"
    />

    <!-- Selection Toolbar -->
    <SelectionToolbar
      :visible="showSelectionToolbar"
      :position="toolbarPosition"
      :theme="themeClasses"
      @translate="handleUnifiedTranslate"
      @ai-action="handleAIAction"
      @highlight="onHighlightClick"
      @speak="speakSelection"
      @copy="copySelection"
    />

    <!-- Unified Settings Panel (Voice & AI in ReadMate Style) -->
    <UnifiedSettingsModal
      :visible="showUnifiedSettings"
      :initial-tab="unifiedSettingsInitialTab"
      :theme="themeClasses"
      :is-dark="isDark"
      @close="showUnifiedSettings = false"
    />

    <!-- Theme Menu -->
    <ThemeMenu
      :visible="showThemeMenu"
      :themes="themes"
      :current-id="currentId"
      :theme="themeClasses"
      @select="setTheme"
      @close="showThemeMenu = false"
    />

    <!-- Bookmarks / Highlights / Vocab Panels -->
    <BookmarksPanel
      :visible="showBookmarks"
      :items="bookmarkStore.forBook(bookStore.currentMetadata?.id || '')"
      :theme="themeClasses"
      @close="showBookmarks = false"
      @navigate="navigateToCfi"
      @delete="deleteBookmark"
    />
    <HighlightsPanel
      :visible="showHighlights"
      :items="highlightStore.forBook(bookStore.currentMetadata?.id || '')"
      :theme="themeClasses"
      @close="showHighlights = false"
      @navigate="navigateToCfi"
      @delete="deleteHighlight"
    />

    <!-- Cloud Sync Panel -->
    <SyncPanel
      v-if="showSync"
      :theme="themeClasses"
      @close="showSync = false"
    />

    <!-- Donate Modal -->
    <DonateModal
      :show="showDonate"
      :theme="themeClasses"
      @close="showDonate = false"
    />

    <!-- AI Reading & Quiz Companion Modal -->
    <AiReadingModal
      :visible="showAiReading"
      :book-id="bookStore.currentMetadata?.id || ''"
      :book-title="bookStore.currentMetadata?.title || ''"
      :chapter-href="currentChapter"
      :chapter-title="currentChapterTitle"
      :chapter-text="currentChapterFullText"
      :full-book-text="fullBookTextSummary"
      :is-chinese-book="isCurrentBookChinese"
      @close="showAiReading = false"
    />

    <!-- Footnote Preview Modal (文中引用与注释轻预览 - 就近气泡卡片) -->
    <FootnoteModal
      :visible="showFootnote"
      :text="footnoteText"
      :target-href="footnoteTargetHref"
      :theme="themeClasses"
      :position="footnotePosition"
      @close="showFootnote = false"
      @go-to="handleFootnoteGoTo"
    />

    <!-- Bilingual Export Modal (一键制作并导出中英双语 EPUB 电子书) -->
    <BilingualExportModal
      :visible="showBilingualExport"
      :book-id="bookStore.currentMetadata?.id || ''"
      :book-title="bookStore.currentMetadata?.title || ''"
      :theme="themeClasses"
      :current-chapter-href="currentChapter"
      :load-binary="() => bookStore.loadBookBinary(bookStore.currentMetadata?.id || '')"
      @close="showBilingualExport = false"
      @open-settings="showBilingualExport = false; unifiedSettingsInitialTab = 'ai'; showUnifiedSettings = true"
    />



    <!-- Main Content -->
    <main class="flex-1 relative overflow-hidden" :class="themeClasses.mainBgClass">
      <!-- PDF 原版阅读器 -->
      <PdfReaderView
        v-if="isPdfBook && currentPdfBuffer"
        :pdf-buffer="currentPdfBuffer"
        :title="bookStore.currentMetadata?.title || ''"
        :author="bookStore.currentMetadata?.author || ''"
        :theme="themeClasses"
        :initial-page="bookStore.currentMetadata?.currentPage || 1"
        :is-dark="isDark"
        @page-change="handlePdfPageChange"
        @speak-text="handlePdfSpeakText"
        @translate-text="handlePdfTranslateText"
        @ai-action="handlePdfAiAction"
        @convert-to-flow="handlePdfConvertToFlow"
        @back-to-library="closeBook"
      />
      <!-- EPUB 阅读器 -->
      <ReaderView
        v-else-if="currentBook"
        :show-toc="showToc"
        :toc-items="tocItems"
        :current-chapter="currentChapter"
        :title="bookStore.currentMetadata?.title || ''"
        :author="bookStore.currentMetadata?.author || ''"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        :progress-percent="progressPercent"
        :slider-value="progressSlider"
        :location-label="currentLocation"
        :theme="themeClasses"
        @navigate-chapter="navigateToChapter"
        @prev-page="prevPage"
        @next-page="nextPage"
        @progress-input="isDraggingProgress = true"
        @progress-change="handleProgressChange"
      />
      <!-- 本地书架 -->
      <LibraryView
        v-else
        ref="libraryViewRef"
        :books="bookStore.books"
        :is-loading="bookStore.isLoading"
        :is-dark="isDark"
        :theme="themeClasses"
        @open-book="openBook"
        @delete-book="deleteBook"
        @upload="handleFileUpload"
        @batch-upload="handleBatchUpload"
      />
    </main>

    <!-- Footer toolbar (recording + book TTS + bookmark + export bilingual) -->
    <div v-if="currentBook" class="fixed bottom-2 right-4 z-[90] flex gap-2">
      <button @click="showBilingualExport = true" class="px-3 py-1.5 text-xs rounded-full shadow-lg border transition-colors flex items-center gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" :title="t('bilingual.exportTitle')">
        🌐 {{ t('bilingual.exportTitle') }}
      </button>
      <button @click="openAiReadingModal" class="px-3 py-1.5 text-xs rounded-full shadow-lg border transition-colors flex items-center gap-1 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" :title="t('aiReading.title')">
        💡 {{ t('aiReading.title') }}
      </button>
      <button @click="onBookmarkClick" class="px-3 py-1.5 text-xs rounded-full shadow-lg border transition-colors flex items-center gap-1" :class="[themeClasses.menuBgClass, themeClasses.borderColor, themeClasses.textColor]" :title="t('bookmark.add')">
        ⭐ {{ t('bookmark.title') }}
      </button>
      <button @click="openRecordingPanel" class="px-3 py-1.5 text-xs rounded-full shadow-lg border transition-colors flex items-center gap-1" :class="[themeClasses.menuBgClass, themeClasses.borderColor, themeClasses.textColor]" :title="t('recording.title')">
        🎙️ {{ t('recording.title') }}
      </button>
      <button @click="openBookTTSPanel" class="px-3 py-1.5 text-xs rounded-full shadow-lg border transition-colors flex items-center gap-1" :class="[themeClasses.menuBgClass, themeClasses.borderColor, themeClasses.textColor]" :title="t('bookTTS.title')">
        📚 {{ t('bookTTS.title') }}
      </button>
    </div>

    <!-- Toast Notification -->
    <transition name="fade">
      <div v-if="toastVisible" class="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white">
        {{ toastMessage }}
      </div>
    </transition>

    <!-- PDF 转流式精读本处理弹窗 -->
    <transition name="fade">
      <div v-if="isConvertingFlow" class="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full border" :class="themeClasses.borderColor">
          <div class="flex flex-col items-center text-center gap-3">
            <div class="w-12 h-12 rounded-full border-4 border-blue-200 dark:border-gray-600 border-t-blue-600 animate-spin"></div>
            <h3 class="text-base font-bold" :class="themeClasses.textColor">{{ t('pdf.convertingTitle') }}</h3>
            <p class="text-xs opacity-70" :class="themeClasses.textColor">
              {{ convertFlowStep === 'extracting'
                  ? t('pdf.extractingText', { current: convertFlowCurrent, total: convertFlowTotal || '...' })
                  : t('pdf.packagingEpub') }}
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Debug Log Panel -->
    <div v-if="showDebugPanel" class="fixed bottom-2 left-4 right-4 max-w-3xl mx-auto z-[150] max-h-60 rounded-lg border shadow-xl overflow-hidden flex flex-col" :class="[themeClasses.menuBgClass, themeClasses.borderColor]">
      <div class="flex items-center justify-between px-3 py-1.5 border-b text-xs" :class="[themeClasses.borderColor, themeClasses.textColor]">
        <span class="font-medium flex items-center gap-1.5">🐛 {{ t('reader.debugLogs') }} ({{ debugLogs.length }})</span>
        <div class="flex items-center gap-1.5">
          <button @click="copyDebugLogs" class="px-2 py-0.5 text-xs rounded border transition-colors" :class="[themeClasses.borderColor, themeClasses.textColor]">📋 {{ t('reader.copyLogs') }}</button>
          <button @click="debugLogs = []" class="px-2 py-0.5 text-xs rounded border transition-colors" :class="[themeClasses.borderColor, themeClasses.textColor]">{{ t('reader.clearLogs') }}</button>
          <button @click="showDebugPanel = false" class="px-2 py-0.5 text-xs rounded border transition-colors" :class="[themeClasses.borderColor, themeClasses.textColor]">✕</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed space-y-0.5">
        <div v-for="(log, i) in debugLogs" :key="i" :class="themeClasses.textColor" class="break-all">
          <span class="opacity-40">[{{ log.time }}]</span> {{ log.msg }}
        </div>
      </div>
    </div>

    <!-- Debug Toggle Button (仅在显式开启调试时显示，避免遮挡底栏) -->
    <button v-if="showDebugPanel" @click="showDebugPanel = !showDebugPanel" class="fixed bottom-2 left-4 z-[140] px-3 py-1.5 text-xs rounded-lg shadow-lg font-bold transition-colors bg-red-600 text-white hover:bg-red-700">
      🐛 {{ showDebugPanel ? t('reader.hideLogs') : t('reader.debugLogs') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import Epub from 'epubjs'
import type { Book, Rendition, NavItem } from 'epubjs'
import { X } from 'lucide-vue-next'
import { useBookStore } from '@/stores/bookStore'
import { useTTSStore, getCleanText, clearSentenceHighlight } from '@/stores/ttsStore'
import { useLLMStore } from '@/stores/llmStore'
import { useTheme } from '@/composables/useTheme'
import { useI18n } from '@/i18n'
import type { TranslateMode } from '@/types/book'
import AppHeader from './AppHeader.vue'
import LibraryView from './LibraryView.vue'
import ReaderView from './ReaderView.vue'
import PdfReaderView from './PdfReaderView.vue'
import SelectionToolbar from './SelectionToolbar.vue'
import UnifiedSettingsModal from './UnifiedSettingsModal.vue'
import ThemeMenu from './ThemeMenu.vue'
import BookmarksPanel from './BookmarksPanel.vue'
import HighlightsPanel from './HighlightsPanel.vue'
import SyncPanel from './SyncPanel.vue'
import DonateModal from './DonateModal.vue'
import AiReadingModal from './AiReadingModal.vue'
import FootnoteModal from './FootnoteModal.vue'
import BilingualExportModal from './BilingualExportModal.vue'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { useBilingualStore, type ParagraphSentenceInfo } from '@/stores/bilingualStore'
import { translateSentenceBatch } from '@/utils/freeTranslator'
import { splitIntoSentences } from '@/stores/ttsStore'
import { parseNCXFromBinary } from '@/utils/epubToc'
import { computeResultPanelPlacement, DEFAULT_RESULT_PANEL_STYLE } from '@/utils/panelPlacement'
// @ts-ignore
import { EpubCFI } from 'epubjs'
import { getGoldenEdgeVoice } from '@/utils/langVoiceDetector'

const { t, locale } = useI18n()
const bookStore = useBookStore()
const ttsStore = useTTSStore()
const llmStore = useLLMStore()
const bookmarkStore = useBookmarkStore()
const highlightStore = useHighlightStore()
const bilingualStore = useBilingualStore()

const { themes, currentId, isDark, setTheme, themeClasses } = useTheme()

// Re-apply epub theme when the Vue theme changes while a book is open
watch(currentId, () => {
  if (rendition.value) {
    updateRenditionTheme()
  }
})

// Loading message (reactive)
const loadingMessage = computed(() => {
  if (bookStore.loadingMessage) {
    const map: Record<string, string> = {
      '正在加载书籍...': t('loading.loadingBook'),
      '生成阅读位置索引...': t('loading.generatingIndex'),
      '加载目录...': t('loading.loadingToc'),
      '准备阅读器...': t('loading.preparingReader'),
      '加载完成': t('loading.complete'),
    }
    return map[bookStore.loadingMessage] || bookStore.loadingMessage
  }
  return t('loading.book')
})

// State
const currentBook = computed(() => bookStore.currentBook)
const currentPdfBuffer = ref<ArrayBuffer | null>(null)
const isPdfBook = computed(() => bookStore.currentMetadata?.format === 'pdf')
const isConvertingFlow = ref(false)
const convertFlowStep = ref<'extracting' | 'packaging'>('extracting')
const convertFlowCurrent = ref(0)
const convertFlowTotal = ref(0)
const tocItems = ref<NavItem[]>([])
const showToc = ref(false)
const showThemeMenu = ref(false)
const showUnifiedSettings = ref(false)
const unifiedSettingsInitialTab = ref<'voice' | 'ai'>('voice')
const showBookmarks = ref(false)
const showHighlights = ref(false)
const showSync = ref(false)
const showDonate = ref(false)
const showBilingualExport = ref(false)
const showAiReading = ref(false)

const fullBookTextSummary = ref('')

const extractFullBookText = () => {
  if (fullBookTextSummary.value && fullBookTextSummary.value.length > 200) {
    return fullBookTextSummary.value
  }

  // 从 TOC 目录和当前章节组装全书结构文本
  const parts: string[] = []
  if (bookStore.currentMetadata?.title) {
    parts.push(`Book: ${bookStore.currentMetadata.title}`)
  }
  if (bookStore.currentMetadata?.author) {
    parts.push(`Author: ${bookStore.currentMetadata.author}`)
  }

  if (tocItems.value.length > 0) {
    parts.push('Table of Contents:')
    tocItems.value.slice(0, 30).forEach((t, i) => {
      parts.push(`${i + 1}. ${t.label?.trim()}`)
    })
  }

  // 融合当前章节丰富正文
  const cur = extractCurrentChapterText()
  if (cur) {
    parts.push('\nSample/Key Content:\n' + cur.slice(0, 15000))
  }

  const res = parts.join('\n')
  fullBookTextSummary.value = res
  return res
}

const openAiReadingModal = () => {
  extractCurrentChapterText()
  extractFullBookText()
  showAiReading.value = true
}

const currentChapterTitle = computed(() => {
  if (!currentChapter.value) return bookStore.currentMetadata?.title || ''
  const findTitle = (items: NavItem[]): string => {
    for (const it of items) {
      if (it.href && (currentChapter.value.includes(it.href) || it.href.includes(currentChapter.value))) {
        return it.label?.trim() || ''
      }
      if (it.subitems?.length) {
        const sub = findTitle(it.subitems)
        if (sub) return sub
      }
    }
    return ''
  }
  const found = findTitle(tocItems.value)
  return found || bookStore.currentMetadata?.title || ''
})

const currentChapterFullText = ref('')

const extractCurrentChapterText = () => {
  // 1. 优先从 iframe DOM 提取
  const paras = getParagraphsFromIframe()
  let text = paras.map(p => getCleanText(p)).filter(t => t.length > 0).join('\n\n')
  
  // 2. 兜底：若 getParagraphsFromIframe 结果为空，直接从 iframe body 提取
  if (!text || text.length < 30) {
    const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
    if (iframe?.contentDocument?.body) {
      text = getCleanText(iframe.contentDocument.body)
    }
  }

  // 3. 终极兜底：从 epubjs rendition 的 contents 提取
  if (!text || text.length < 30) {
    try {
      const rend = rendition.value as any
      const contents = rend?.getContents?.()
      if (contents && contents.length > 0 && contents[0].document?.body) {
        text = getCleanText(contents[0].document.body)
      }
    } catch {}
  }

  currentChapterFullText.value = text
  return text
}

const isCurrentBookChinese = computed(() => {
  const meta = bookStore.currentMetadata as any
  const lang = (meta?.language || '').toLowerCase()
  if (lang.startsWith('zh')) return true
  const sample = currentChapterFullText.value.slice(0, 400)
  const cjkCount = (sample.match(/[\u4e00-\u9fff]/g) || []).length
  return cjkCount > 25
})
const currentChapter = ref('')
const currentLocation = ref('')
const canGoPrev = ref(false)
const canGoNext = ref(true)
interface NavHistoryItem {
  cfi: string
  sourceAnchorId?: string
  sourceHref?: string
}

const navigationHistory = ref<NavHistoryItem[]>([])
const canGoBack = computed(() => navigationHistory.value.length > 0)
const showFootnote = ref(false)
const footnoteText = ref('')
const footnoteTargetHref = ref('')
const footnotePosition = ref<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null)
const currentSourceLinkInfo = ref<{ id?: string; href?: string } | null>(null)
const readingProgress = ref(0)
const progressSlider = ref(0)
const isDraggingProgress = ref(false)
const progressPercent = computed(() => Math.round(readingProgress.value * 100))
const isFullWidth = ref(false)

// === Debug Log ===
const debugLogs = ref<{ time: string; msg: string }[]>([])
const showDebugPanel = ref(false)  // hidden in release builds
const addDebugLog = (msg: string) => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
  debugLogs.value.push({ time, msg })
  if (debugLogs.value.length > 200) debugLogs.value = debugLogs.value.slice(-100)
}
const copyDebugLogs = () => {
  const text = debugLogs.value.map(l => `[${l.time}] ${l.msg}`).join('\n')
  navigator.clipboard.writeText(text).then(() => addDebugLog(t('reader.logsCopied')))
}

// Selection
const showSelectionToolbar = ref(false)
const selectedText = ref('')
const toolbarPosition = ref({ top: 0, left: 0 })

// Unified result panel
type ResultPanelType = 'ai' | 'recording' | 'bookTTS'
const showResultPanel = ref(false)
const resultPanelType = ref<ResultPanelType>('ai')

// 【v2.10.3】划词翻译结果面板定位：
//   - 划词场景：紧贴划词显示（下方放不下就翻到上方），**永不遮挡划词本身**；
//   - 其它场景（TTS 录音、整本书 TTS）：完全维持原来的「底部居中」不变。
const selectionAnchorRect = ref<{ top: number; bottom: number; left: number; width: number } | null>(null)

const resultPanelStyle = computed<Record<string, string>>(() => {
  const anchor = selectionAnchorRect.value
  const nearby = showResultPanel.value && resultPanelType.value === 'ai' && !!anchor
  if (!nearby || typeof window === 'undefined') return { ...DEFAULT_RESULT_PANEL_STYLE }
  return computeResultPanelPlacement(anchor, { width: window.innerWidth, height: window.innerHeight })
})
const resultPanelTitle = ref('')

// TTS recording state
const recordedResult = ref<{ blob: Blob; url: string; text: string } | null>(null)

// Book chapter TTS state
interface ChapterResult {
  title: string
  blob: Blob
  url: string
  paragraphCount: number
}
const chapterResults = ref<ChapterResult[]>([])

// Book TTS progress tracking (not the audio itself, just progress state)
const bookTTS = ref({
  isRunning: false,
  currentChapter: 0,
  totalChapters: 0,
  currentText: '',
  progress: 0,
  error: '',
})

// Epub refs
const bookInstance = ref<Book | null>(null)
const rendition = ref<Rendition | null>(null)

// Layout
const toggleLayout = () => {
  isFullWidth.value = !isFullWidth.value
  localStorage.setItem('moreader-layout', isFullWidth.value ? 'full' : 'normal')
  if (rendition.value) { updateRenditionTheme(); setTimeout(() => rendition.value?.resize(), 100) }
}

const toggleToc = () => { showToc.value = !showToc.value; showThemeMenu.value = false }
const toggleThemeMenu = () => { showThemeMenu.value = !showThemeMenu.value; showToc.value = false }
const closeMenus = () => { showToc.value = false; showThemeMenu.value = false }

// Theme application to epub.js
const updateRenditionTheme = () => {
  if (!rendition.value) return
  const th = themes.find(t => t.id === currentId.value) ?? themes[0]
  const d = th.isDark
  const textColor = d ? '#FFFFFF' : '#000000'
  const hPad = isFullWidth.value ? '40px' : '20px'
  const maxW = isFullWidth.value ? 'none' : '900px'

  rendition.value.themes.register('current', {
    '*': { 'color': `${textColor} !important` },
    body: {
      'font-family': 'Georgia, Cambria, "Times New Roman", Times, serif !important',
      'font-size': '18px !important', 'line-height': '1.8 !important',
      'color': `${textColor} !important`, 'background': `${th.readerBg} !important`,
      'margin': '0 auto !important', 'padding': `20px ${hPad} !important`,
      'max-width': `${maxW} !important`, 'overflow-x': 'hidden !important', 'box-sizing': 'border-box !important',
    },
    html: { 'overflow-x': 'hidden !important', 'color': `${textColor} !important` },
    p: { 'text-align': 'justify !important', 'text-indent': '2em !important', 'margin-bottom': '1.2em !important', 'color': `${textColor} !important` },
    span: { 'color': `${textColor} !important` },
    div: { 'color': `${textColor} !important` },
    'h1, h2, h3, h4, h5, h6': { 'font-family': 'Georgia, Cambria, "Times New Roman", Times, serif !important', 'color': `${textColor} !important`, 'margin-top': '1.5em !important', 'margin-bottom': '0.8em !important', 'line-height': '1.4 !important' },
    img: { 'max-width': '100% !important', 'max-height': '70vh !important', 'height': 'auto !important', 'object-fit': 'contain !important', 'display': 'block !important', 'margin': '1em auto !important' },
    figure: { 'margin': '1.5em 0 !important' },
    figcaption: { 'text-align': 'center !important', 'font-size': '0.9em !important', 'color': `${d ? '#CCCCCC' : '#666666'} !important`, 'margin-top': '0.5em !important' },
    'code, pre': { 'font-family': 'monospace !important', 'font-size': '0.9em !important', 'background': `${d ? '#333333' : '#f5f5f5'} !important`, 'color': `${textColor} !important`, 'padding': '0.2em 0.4em !important', 'border-radius': '3px !important' },
    blockquote: { 'border-left': `3px solid ${d ? '#444444' : '#dddddd'} !important`, 'padding-left': '1em !important', 'margin-left': '0 !important', 'color': `${d ? '#CCCCCC' : '#666666'} !important` },
    a: { 'color': `${d ? '#66b3ff' : '#0066cc'} !important` },
    li: { 'color': `${textColor} !important` },
    td: { 'color': `${textColor} !important` },
    th: { 'color': `${textColor} !important` },
    strong: { 'color': `${textColor} !important` },
    em: { 'color': `${textColor} !important` },
    label: { 'color': `${textColor} !important` },
  })
  rendition.value.themes.select('current')
}

// File upload
const handleFileUpload = async (file: File) => {
  try {
    const bookId = await bookStore.saveBook(file)
    await openBook(bookId)
  } catch (err) {
    console.error('Failed to upload book:', err)
    alert(t('library.confirmDelete') + ' ' + (err instanceof Error ? err.message : t('llm.error')))
  }
}

// Batch file upload
const libraryViewRef = ref<InstanceType<typeof LibraryView> | null>(null)
const handleBatchUpload = async (files: File[]) => {
  libraryViewRef.value?.startBatch(files.length)
  const result = await bookStore.saveBooks(files, (current, total) => {
    libraryViewRef.value?.updateBatchProgress(current)
  })
  libraryViewRef.value?.endBatch()
  if (result.failed > 0) {
    alert(`${t('library.batchResult', { success: result.success, failed: result.failed })}`)
  }
}

// Open book
const openBook = async (bookId: string) => {
  try {
    // 彻底清空上一本书遗留的提取文本与章节状态
    fullBookTextSummary.value = ''
    currentChapterFullText.value = ''
    currentChapter.value = ''

    const metadata = bookStore.books.find(b => b.id === bookId)
    if (metadata?.format === 'pdf') {
      bookStore.isLoadingBook = true
      bookStore.loadingProgress = 50
      bookStore.loadingMessage = t('loading.loadingBook')

      const arrayBuffer = await bookStore.loadBookBinary(bookId)
      if (!arrayBuffer) throw new Error('无法加载 PDF 数据')

      if (rendition.value) { rendition.value.destroy(); rendition.value = null }
      if (bookInstance.value) { bookInstance.value.destroy(); bookInstance.value = null }

      currentPdfBuffer.value = arrayBuffer
      bookStore.setCurrentBook(null, metadata)
      bookStore.isLoadingBook = false
      return
    }

    currentPdfBuffer.value = null
    bookStore.isLoadingBook = true
    bookStore.loadingProgress = 0
    bookStore.loadingMessage = t('loading.loadingBook')

    const arrayBuffer = await bookStore.loadBookBinary(bookId)
    if (!arrayBuffer) throw new Error('无法加载书籍数据')

    if (rendition.value) { rendition.value.destroy(); rendition.value = null }
    if (bookInstance.value) { bookInstance.value.destroy() }

    const book = Epub(arrayBuffer)
    bookInstance.value = book

    await book.ready
    bookStore.loadingProgress = 30
    bookStore.loadingMessage = t('loading.generatingIndex')
    await book.locations.generate(1000)

    bookStore.loadingProgress = 60
    bookStore.loadingMessage = t('loading.loadingToc')
    // 【方案A】不再依赖 epub.js 的顶层目录，也不再受 <5 阈值限制：
    // 始终自解析一遍（与安卓端同一套解析），条目更多就采用，否则原样保留。
    const [navigation, ncxItems] = await Promise.all([
      book.navigation,
      parseNCXFromBinary(arrayBuffer, addDebugLog),
    ])
    const navItems = (navigation.toc || []) as NavItem[]
    addDebugLog(`📑 TOC: epub.js 顶层 ${navItems.length} 项 / 自解析 ${ncxItems.length} 项`)
    if (ncxItems.length > navItems.length) {
      addDebugLog(`📑 TOC: 采用自解析目录（${ncxItems.length} 项，含层级缩进）`)
      tocItems.value = ncxItems
    } else {
      addDebugLog(`📑 TOC: 保留 epub.js 目录（${navItems.length} 项）`)
      tocItems.value = navItems
    }
    bookStore.setCurrentBook(book, metadata)

    // 智能语言黄金音色匹配：根据当前书籍语言，自动调整 Edge-TTS 音色
    try {
      const bookLang = ((book.package?.metadata as any)?.language || (metadata as any)?.language || 'zh').toLowerCase()
      const goldenVoice = getGoldenEdgeVoice(bookLang)
      if (goldenVoice && !localStorage.getItem('moreader-tts-voice-user-customized')) {
        ttsStore.setEdgeVoice(goldenVoice)
        addDebugLog(`🎙️ TTS: 书籍语言 [${bookLang}] 智能匹配黄金音色 -> ${goldenVoice}`)
      }
    } catch (e) {}

    await nextTick()
    const container = document.getElementById('epub-reader')
    if (!container) return

    const availableHeight = 'calc(100vh - 170px)'
    bookStore.loadingProgress = 80
    bookStore.loadingMessage = t('loading.preparingReader')

    rendition.value = book.renderTo('epub-reader', {
      width: '100%', height: availableHeight, spread: 'none', flow: 'scrolled-doc', allowScriptedContent: true,
    })
    updateRenditionTheme()
    await rendition.value.display(metadata?.currentLocation || 0)

    bookStore.loadingProgress = 100
    bookStore.loadingMessage = t('loading.complete')
    setTimeout(() => { bookStore.isLoadingBook = false; bookStore.loadingProgress = 0 }, 300)

    // Setup iframe events after content loads
    const setupIframe = () => {
      const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
      if (!iframe) { setTimeout(setupIframe, 200); return }
      const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document
      if (!doc?.body) { setTimeout(setupIframe, 200); return }

      // Always re-inject ▶ indicators on each page render (they're DOM elements that get wiped)
      injectPlayIndicators(doc)

      if ((doc as any).__moreaderSetup) return

      // Selection / mouse events (only bind once)
      doc.addEventListener('mouseup', () => {
        setTimeout(() => {
          const selection = doc.getSelection()
          const text = selection?.toString()?.trim()
          if (text?.length) {
            selectedText.value = text
            const range = selection?.getRangeAt(0)
            if (range) {
              const rect = range.getBoundingClientRect()
              const iframeRect = iframe.getBoundingClientRect()
              // 记录划词位置（视口坐标）：翻译结果面板靠它就近显示
              selectionAnchorRect.value = {
                top: iframeRect.top + rect.top,
                bottom: iframeRect.top + rect.bottom,
                left: iframeRect.left + rect.left,
                width: rect.width,
              }
              const tw = 320
              let left = iframeRect.left + rect.left + rect.width / 2 - tw / 2
              let top = iframeRect.top + rect.top - 60
              left = Math.max(10, Math.min(left, window.innerWidth - tw - 10))
              top = Math.max(70, top)
              toolbarPosition.value = { top, left }
              showSelectionToolbar.value = true
            }
          }
        }, 50)
      })

      doc.addEventListener('mousedown', () => {
        if (!doc.getSelection()?.toString()?.trim()) hideSelectionToolbar()
      })

      // 优雅交互：点击阅读区域内部任意空白处，自动收起顶部打开的下拉菜单
      doc.addEventListener('click', () => {
        closeMenus()
        showUnifiedSettings.value = false
      })

      // Intercept internal links for footnote preview and history navigation
      doc.addEventListener('click', async (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const link = target.closest('a[href]') as HTMLAnchorElement | null
        if (!link) return
        const href = link.getAttribute('href')
        if (!href) return
        if (/^(https?:|mailto:|tel:)/.test(href)) return

        event.preventDefault()
        event.stopPropagation()

        // 判断当前点击是否本身就处于注释区内部（如读者在文末点击 [1] 或 ↩ 返回正文）
        const isInsideNote = !!link.closest('li, aside, dd, [role="doc-footnote"], [role="doc-endnote"], .footnote, .note, [class*="footnote"], [class*="note"]')

        if (!isInsideNote) {
          // 方案 B：双重轻预览（同页 DOM 嗅探 + 跨章节后台异步嗅探，1:1 对齐 Android 端）
          const sniffed = await sniffFootnoteText(href, doc)
          if (sniffed) {
            footnoteText.value = sniffed.text
            footnoteTargetHref.value = sniffed.targetHref

            // 紧贴标注号（鼠标）附近弹出气泡（Popover 就近定位）
            const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 }
            const linkRect = link.getBoundingClientRect()
            const centerX = iframeRect.left + linkRect.left + linkRect.width / 2
            const topY = iframeRect.top + linkRect.top
            const bottomY = iframeRect.top + linkRect.bottom
            const placement = topY > 240 ? 'top' : 'bottom'

            footnotePosition.value = {
              x: centerX,
              y: placement === 'top' ? topY : bottomY,
              placement,
            }

            currentSourceLinkInfo.value = {
              id: link.getAttribute('id') || '',
              href: href,
            }

            showFootnote.value = true
            return
          }
        }

        // 若处于注释区内点击返回正文，或非注释轻预览的正常章节/正文跳转：安全接管并记录历史
        handleFootnoteGoTo(href, { id: link.getAttribute('id') || '', href, isReturnToText: isInsideNote })
      }, true)

      ;(doc as any).__moreaderSetup = true
    }

    rendition.value.on('rendered', () => {
      setupIframe()
      if (bilingualStore.isBilingualActive) {
        setTimeout(() => applyBilingualToCurrentView(), 300)
      }
    })
    rendition.value.on('relocated', () => {
      setupIframe()
      extractCurrentChapterText()
      if (bilingualStore.isBilingualActive) {
        setTimeout(() => applyBilingualToCurrentView(), 300)
      }
    })
    setTimeout(() => {
      setupIframe()
      extractCurrentChapterText()
      if (bilingualStore.isBilingualActive) {
        setTimeout(() => applyBilingualToCurrentView(), 500)
      }
    }, 500)

    // Load bookmarks, highlights, vocab and re-apply highlights
    if (metadata) {
      bookmarkStore.loadBookmarks(metadata.id)
      highlightStore.loadHighlights(metadata.id)
      setTimeout(() => applyHighlights(), 600)
    }

    rendition.value.on('relocated', (location: any) => {
      canGoPrev.value = !location.atStart
      canGoNext.value = !location.atEnd
      const current = location.start?.displayed?.page || 1
      const total = location.start?.displayed?.total || 1
      currentLocation.value = `${current}/${total}`
      const percentage = location.start?.percentage || 0
      readingProgress.value = percentage
      if (!isDraggingProgress.value) progressSlider.value = Math.round(percentage * 1000) / 10
      currentChapter.value = location.start?.href || ''
      if (metadata) bookStore.updateProgress(metadata.id, location.start.cfi, percentage)
    })

    setTimeout(() => rendition.value?.resize(), 200)
  } catch (err) {
    console.error('Failed to open book:', err)
    bookStore.isLoadingBook = false
    alert(t('library.confirmDelete') + ' ' + (err instanceof Error ? err.message : t('llm.error')))
  }
}

// Navigation
// 翻页后划词位置失效：清掉锚点，让翻译面板回到默认位置（不残留错位）
const prevPage = () => { rendition.value?.prev(); closeMenus(); hideSelectionToolbar(); selectionAnchorRect.value = null }
const nextPage = () => { rendition.value?.next(); closeMenus(); hideSelectionToolbar(); selectionAnchorRect.value = null }

const navigateToChapter = async (href: string) => {
  if (!rendition.value) return
  let cfi: string | undefined
  try {
    const rend = rendition.value as any
    if (rend?.location?.start?.cfi) cfi = rend.location.start.cfi
    else if (typeof rend?.currentLocation === 'function') {
      const cl = rend.currentLocation()
      if (cl?.start?.cfi) cfi = cl.start.cfi
    }
  } catch (e) {}
  if (cfi && cfi !== href) navigationHistory.value.push({ cfi })
  await rendition.value.display(href)
  setTimeout(() => rendition.value?.resize(), 100)
  closeMenus(); hideSelectionToolbar()
}

const handleProgressChange = async (val: number) => {
  if (!rendition.value || !bookInstance.value) return
  const percentage = val / 100
  const cfi = bookInstance.value.locations.cfiFromPercentage(percentage)
  if (cfi) {
    await rendition.value.display(cfi)
    setTimeout(() => rendition.value?.resize(), 100)
  }
  isDraggingProgress.value = false
  closeMenus(); hideSelectionToolbar()
}

// 辅助工具：解析并标准化 EPUB 内链的真实章节与锚点（解决跨目录、相对路径与文件名查找问题）
const resolveSpineHref = (href: string): { sectionHref: string; anchorId: string } => {
  const parts = href.split('#')
  const pathPart = parts[0] ? decodeURI(parts[0]) : ''
  const anchorId = parts[1] ? parts[1].trim() : ''

  const curChapter = (currentChapter.value || '').split('#')[0]

  if (!pathPart) {
    return { sectionHref: curChapter, anchorId }
  }

  const spineItems = ((bookInstance.value as any)?.spine as any)?.items || []

  // 1. 直接匹配
  let item = spineItems.find((s: any) => s.href === pathPart || decodeURI(s.href) === pathPart)
  if (item) return { sectionHref: item.href, anchorId }

  // 2. 依据当前章节所在目录拼接相对路径（例如 ../Text/notes.xhtml 或 notes.xhtml）
  if (curChapter) {
    const lastSlash = curChapter.lastIndexOf('/')
    const baseDir = lastSlash >= 0 ? curChapter.substring(0, lastSlash) : ''
    const rawCombined = baseDir ? `${baseDir}/${pathPart}` : pathPart
    const segs = rawCombined.split('/')
    const normalized: string[] = []
    for (const s of segs) {
      if (s === '.' || s === '') continue
      if (s === '..') {
        if (normalized.length > 0) normalized.pop()
      } else {
        normalized.push(s)
      }
    }
    const resolvedPath = normalized.join('/')
    item = spineItems.find((s: any) => s.href === resolvedPath || decodeURI(s.href) === resolvedPath)
    if (item) return { sectionHref: item.href, anchorId }
  }

  // 3. 回退：按纯文件名匹配（例如 notes.xhtml）
  const targetFilename = pathPart.split('/').pop() || pathPart
  item = spineItems.find((s: any) => (s.href || '').split('/').pop() === targetFilename)
  if (item) return { sectionHref: item.href, anchorId }

  return { sectionHref: pathPart, anchorId }
}

// 方案 B：双重轻预览（同页 DOM 嗅探 + 跨章节后台异步嗅探，1:1 对齐 Android 端）
const sniffFootnoteText = async (href: string, currentDoc: Document): Promise<{ text: string; targetHref: string } | null> => {
  const { sectionHref, anchorId } = resolveSpineHref(href)
  if (!anchorId) return null

  const curChapter = (currentChapter.value || '').split('#')[0]
  const isCurrentDoc = !sectionHref || sectionHref === curChapter

  let targetDoc: Document | null = null

  if (isCurrentDoc) {
    targetDoc = currentDoc
  } else if (bookInstance.value) {
    try {
      targetDoc = await (bookInstance.value as any).load(sectionHref)
    } catch (e) {
      console.warn('跨章节注释后台嗅探加载失败:', e)
    }
  }

  if (!targetDoc) return null

  // 寻找目标锚点节点（1:1 对齐 Android 端多层检索策略）
  let target: HTMLElement | null = targetDoc.getElementById(anchorId)
  if (!target) {
    try {
      target = targetDoc.querySelector(`[name="${CSS.escape(anchorId)}"]`) ||
               targetDoc.querySelector(`a[name="${CSS.escape(anchorId)}"]`) ||
               targetDoc.querySelector(`[id*="${CSS.escape(anchorId)}"]`) ||
               targetDoc.querySelector(`[name*="${CSS.escape(anchorId)}"]`)
    } catch {}
  }
  if (!target) return null

  // 寻找最合适的注释容器（如 li, aside, dd, p, blockquote 等，1:1 对齐 Android）
  const container = (target.closest('li, aside, dd, p, blockquote, [role="doc-footnote"], [role="doc-endnote"], .footnote, .note, [class*="footnote"], [class*="note"]') ||
                     (['P', 'LI', 'DD', 'ASIDE', 'BLOCKQUOTE', 'DIV'].includes(target.tagName) ? target : target.parentElement) ||
                     target) as HTMLElement

  let noteText = (container.textContent || '').trim()
  // 清洗常见返回符号（如 ↩, ↑, ⇧, ↵, ^）
  noteText = noteText.replace(/[\u21A9\u2191\u21E7\u23CE\^]/g, '').trim()

  // 如果容器包含整节超长文本，尝试获取其内部更直接的段落
  if (noteText.length > 2500) {
    const directP = (target.closest('p, li, dd') || target.querySelector('p') || target) as HTMLElement
    noteText = (directP.textContent || '').replace(/[\u21A9\u2191\u21E7\u23CE\^]/g, '').trim()
  }

  if (noteText.length >= 2 && noteText.length < 2500) {
    const fullTargetHref = `${sectionHref || curChapter}#${anchorId}`
    return { text: noteText, targetHref: fullTargetHref }
  }

  return null
}

// 1:1 移植自 Android 端出彩的“回跳以后该标注高亮一下”金黄色呼吸光晕动画
const highlightTargetAnchor = (doc: Document, sourceId?: string, sourceHref?: string) => {
  if (!doc) return
  let targetA: HTMLElement | null = null
  if (sourceId) {
    try {
      targetA = doc.getElementById(sourceId) ||
                doc.querySelector(`[name="${CSS.escape(sourceId)}"]`) ||
                doc.querySelector(`a[name="${CSS.escape(sourceId)}"]`) ||
                doc.querySelector(`[id*="${CSS.escape(sourceId)}"]`)
    } catch {}
  }
  if (!targetA && sourceHref) {
    try {
      const shortHref = sourceHref.indexOf('#') >= 0 ? sourceHref.substring(sourceHref.indexOf('#')) : sourceHref
      targetA = doc.querySelector(`a[href*="${CSS.escape(shortHref)}"]`) ||
                doc.querySelector(`a[href="${CSS.escape(sourceHref)}"]`)
    } catch {}
  }
  if (targetA) {
    targetA.scrollIntoView({ behavior: 'smooth', block: 'center' })
    targetA.style.transition = 'none'
    targetA.style.backgroundColor = '#FFE082'
    targetA.style.borderRadius = '3px'
    targetA.style.padding = '1px 4px'
    targetA.style.boxShadow = '0 0 0 2px #FFB300'
    setTimeout(() => {
      if (targetA) {
        targetA.style.transition = 'all 1.2s ease'
        targetA.style.backgroundColor = ''
        targetA.style.boxShadow = ''
        targetA.style.padding = ''
      }
    }, 2500)
  }
}

const goBack = async () => {
  if (navigationHistory.value.length > 0 && rendition.value) {
    const item = navigationHistory.value.pop()!
    const pos = item.cfi
    try {
      await rendition.value.display(pos)
      setTimeout(() => rendition.value?.resize(), 100)
      closeMenus(); hideSelectionToolbar()

      // 回跳到正文后，立刻点亮金黄色温暖呼吸高亮，方便读者一眼看到刚才从哪跳出的
      setTimeout(() => {
        const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
        const doc = iframe?.contentDocument
        if (doc) {
          highlightTargetAnchor(doc, item.sourceAnchorId, item.sourceHref)
        }
      }, 200)
    } catch (e) {
      try {
        const href = pos.split('#')[0]
        if (href) await rendition.value.display(href)
      } catch (e2) {}
    }
  }
}

const handleFootnoteGoTo = async (href: string, sourceInfo?: { id?: string; href?: string; isReturnToText?: boolean }) => {
  showFootnote.value = false
  if (!rendition.value) return
  // 记录跳转前的位置与来源元素，以便通过顶栏随时一键返回原阅读位置并高亮标注
  try {
    const rend = rendition.value as any
    let cfi: string | undefined
    if (rend?.location?.start?.cfi) cfi = rend.location.start.cfi
    else if (typeof rend?.currentLocation === 'function') {
      const cl = rend.currentLocation()
      if (cl?.start?.cfi) cfi = cl.start.cfi
    }
    if (cfi) {
      const last = navigationHistory.value[navigationHistory.value.length - 1]
      if (!last || last.cfi !== cfi) {
        navigationHistory.value.push({
          cfi,
          sourceAnchorId: sourceInfo?.id || currentSourceLinkInfo.value?.id,
          sourceHref: sourceInfo?.href || currentSourceLinkInfo.value?.href,
        })
      }
    }
  } catch (e) {}

  try {
    const { sectionHref, anchorId } = resolveSpineHref(href)
    const targetDisplayHref = anchorId ? `${sectionHref}#${anchorId}` : sectionHref

    try {
      await rendition.value.display(targetDisplayHref)
    } catch (dispErr) {
      if (sectionHref) {
        await rendition.value.display(sectionHref).catch(() => {})
      }
    }
    setTimeout(() => rendition.value?.resize(), 100)

    // 定位目标锚点并高亮，采用多阶重试以应对跨章节渲染时差
    const locateAndHighlight = () => {
      const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
      const doc = iframe?.contentDocument
      if (!doc) return false

      if (sourceInfo?.isReturnToText) {
        // 如果是从注释列表回跳正文，触发温暖金黄光晕
        highlightTargetAnchor(doc, anchorId, href)
        return true
      }

      if (anchorId) {
        let target: HTMLElement | null = doc.getElementById(anchorId)
        if (!target) {
          try {
            target = doc.querySelector(`[name="${CSS.escape(anchorId)}"]`) ||
                     doc.querySelector(`a[name="${CSS.escape(anchorId)}"]`) ||
                     doc.querySelector(`[id*="${CSS.escape(anchorId)}"]`) ||
                     doc.querySelector(`[name*="${CSS.escape(anchorId)}"]`)
          } catch (ex) {}
        }
        if (target) {
          // 找到目标！锁定注释容器或段落（全量兼容 p, li, dd, aside, div 等任意结构）
          const container = (target.closest('li, aside, dd, p, blockquote, [role="doc-footnote"], [role="doc-endnote"], .footnote, .note') ||
                             (['P', 'LI', 'DD', 'ASIDE', 'BLOCKQUOTE', 'DIV'].includes(target.tagName) ? target : target.parentElement) ||
                             target) as HTMLElement

          // 核心：平滑滚动到视野中央
          container.scrollIntoView({ behavior: 'smooth', block: 'center' })

          // 柔和淡蓝聚焦高亮
          const oldBg = container.style.backgroundColor
          container.style.transition = 'background-color 0.4s ease'
          container.style.backgroundColor = 'rgba(59, 130, 246, 0.25)'
          container.style.borderRadius = '4px'
          setTimeout(() => {
            container.style.backgroundColor = oldBg
          }, 2500)
          return true
        }
      }
      return false
    }

    if (!locateAndHighlight()) {
      setTimeout(() => {
        if (!locateAndHighlight()) {
          setTimeout(locateAndHighlight, 300)
        }
      }, 120)
    }
  } catch (err) {
    console.warn('Failed to navigate to footnote target:', err)
  }
}

const handleToggleBilingual = async () => {
  bilingualStore.toggleBilingual()
  if (bilingualStore.isBilingualActive) {
    showToast(t('bilingual.translating'))
    await applyBilingualToCurrentView()
  } else {
    removeBilingualFromCurrentView()
  }
}

const removeBilingualFromCurrentView = () => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  const doc = iframe?.contentDocument
  if (doc) {
    bilingualStore.removeBilingualFromDoc(doc)
  }
}

const applyBilingualToCurrentView = async () => {
  if (!bilingualStore.isBilingualActive || !bookStore.currentMetadata) return
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  const doc = iframe?.contentDocument
  if (!doc?.body) return

  // 收集当前章节所有需要翻译的段落和句子
  const paras = Array.from(
    doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li')
  ).filter((el) => {
    const text = el.textContent?.trim() || ''
    return text.length >= 2 && /\p{L}|\p{N}/u.test(text) && !el.querySelector('.moreader-bilingual-trans')
  }) as HTMLElement[]

  if (paras.length === 0) return

  const allSentences: string[] = []
  const paraInfos: ParagraphSentenceInfo[] = []

  for (const p of paras) {
    const text = p.textContent?.trim() || ''
    const sents = splitIntoSentences(text)
    if (sents.length === 0) continue

    paraInfos.push({
      para: p,
      sentences: sents,
      startIndex: allSentences.length,
    })

    for (const s of sents) {
      allSentences.push(s.text)
    }
  }

  if (allSentences.length === 0) return

  try {
    const translations = await bilingualStore.getOrTranslateChapter(
      bookStore.currentMetadata.id,
      currentChapter.value || 'chapter',
      allSentences
    )

    if (bilingualStore.isBilingualActive) {
      bilingualStore.applyBilingualToDoc(doc, paraInfos, translations)
    }
  } catch (err) {
    console.warn('[Bilingual] Failed to apply bilingual translation:', err)
  }
}

const closeBook = () => {
  removeBilingualFromCurrentView()
  showBilingualExport.value = false
  showFootnote.value = false
  footnoteText.value = ''
  footnoteTargetHref.value = ''
  ttsStore.stop()
  closeMenus(); hideSelectionToolbar()
  tocItems.value = []
  if (rendition.value) { rendition.value.destroy(); rendition.value = null }
  if (bookInstance.value) { bookInstance.value.destroy(); bookInstance.value = null }
  currentPdfBuffer.value = null
  bookStore.setCurrentBook(null)
  currentLocation.value = ''; readingProgress.value = 0; progressSlider.value = 0
  navigationHistory.value = []
  showBookmarks.value = false
  showHighlights.value = false
  fullBookTextSummary.value = ''
  currentChapterFullText.value = ''
  currentChapter.value = ''
}

// === PDF Event Handlers ===
const handlePdfPageChange = (page: number, total: number) => {
  if (bookStore.currentMetadata?.id) {
    bookStore.updatePdfProgress(bookStore.currentMetadata.id, page, total)
  }
}

const handlePdfSpeakText = (text: string) => {
  if (!text) return
  if (blockIfGenerating()) return
  ttsStore.speakSelection(text)
}

const handlePdfTranslateText = async (text: string, rect?: { top: number; bottom: number; left: number; width: number } | null) => {
  if (!text) return
  selectedText.value = text
  // PDF 划词位置：让翻译结果面板也贴在划词旁边（拿不到就回退底部居中）
  selectionAnchorRect.value = rect ?? null
  await handleUnifiedTranslate()
}

const handlePdfAiAction = async (action: 'explain' | 'analyze', text: string, rect?: { top: number; bottom: number; left: number; width: number } | null) => {
  if (!text) return
  selectedText.value = text
  selectionAnchorRect.value = rect ?? null
  await handleAIAction(action)
}

const handlePdfConvertToFlow = async () => {
  const currentId = bookStore.currentMetadata?.id
  if (!currentId) return
  try {
    isConvertingFlow.value = true
    convertFlowCurrent.value = 0
    convertFlowTotal.value = 0
    convertFlowStep.value = 'extracting'

    const newBookId = await bookStore.convertPdfBookToFlowBook(currentId, (step, curr, total) => {
      convertFlowStep.value = step
      convertFlowCurrent.value = curr
      convertFlowTotal.value = total
    })

    isConvertingFlow.value = false
    showToast(t('pdf.convertSuccess'))

    // 自动打开新生成的流式图书
    await openBook(newBookId)
  } catch (err: any) {
    isConvertingFlow.value = false
    console.error('Failed to convert PDF to flow:', err)
    showToast(err?.message || 'Conversion failed')
  }
}

// === Toast notification ===
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (msg: string) => {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2000)
}

// === Bookmark / Highlight / Vocab handlers ===

const navigateToCfi = async (cfi: string, id?: string) => {
  if (!rendition.value) return

  // ── 跨平台书签/高亮：无 CFI，尝试在文档中搜索文字生成 CFI ──
  if (!cfi && id) {
    cfi = await generateCfiFromText(id)
    if (!cfi) {
      console.warn('跨平台书签/高亮无法定位：文档中未找到匹配文字')
      return
    }
  }

  if (!cfi) return
  try {
    await rendition.value.display(cfi)
    setTimeout(() => rendition.value?.resize(), 100)
    showBookmarks.value = false
    showHighlights.value = false
    closeMenus()
  } catch (e) {
    console.warn('Failed to navigate to CFI:', e)
  }
}

/**
 * 在 EPUB 全书中搜索指定文字，先通过 book.archive 搜原始 XML 定位章节，
 * 再导航到该章节后用 TreeWalker 精确生成 CFI。
 * @returns CFI 字符串，如果找不到则返回 null
 */
const searchTextInDocument = async (text: string): Promise<string | null> => {
  if (!text) return null
  const rend = rendition.value as any
  if (!rend) return null

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2)
  const searchTexts = lines.length > 0 ? lines : [text.trim()]

  const book = rend.book
  if (!book || !book.archive) return null

  // 1) 遍历 book.spine 找目标章节
  let targetHref: string | null = null
  if (book.spine && book.spine.items) {
    for (const item of book.spine.items) {
      try {
        const doc = await book.load(item.href)
        if (!doc) continue
        const bodyText = doc.body?.textContent || doc.documentElement?.textContent || ''
        for (const st of searchTexts) {
          if (bodyText.includes(st)) {
            targetHref = item.href
            break
          }
        }
        if (targetHref) break
      } catch (e) { /* skip */ }
    }
  }

  if (!targetHref) return null

  // 2) 导航到目标章节
  try {
    await rend.display(targetHref)
    await new Promise(r => setTimeout(r, 500))
  } catch (e) {
    console.warn('跨平台搜索：导航到目标章节失败', e)
  }

  // 3) 在已渲染的 content 中精确搜索生成 CFI
  const contents = rend.getContents()
  if (!contents || contents.length === 0) return null

  for (let ci = 0; ci < contents.length; ci++) {
    const content = contents[ci]
    const doc = content.document || content.window?.document
    if (!doc || !doc.body) continue

    for (const searchText of searchTexts) {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        const idx = node.textContent?.indexOf(searchText) ?? -1
        if (idx >= 0) {
          try {
            const range = doc.createRange()
            range.setStart(node, idx)
            range.setEnd(node, idx + searchText.length)
            const cfi = content.cfiFromRange(range)
            if (cfi) return cfi
          } catch (e) {
            console.warn('跨平台搜索 CFI 生成失败:', e)
          }
          break
        }
      }
    }
  }

  return null
}

/**
 * 根据书签/高亮 ID，在文档中搜索文字，生成 CFI 并回写存储。
 * 用于跨平台同步的书签/高亮（来自安卓端，只有文字没有 CFI）。
 */
const generateCfiFromText = async (id: string): Promise<string> => {
  // 1) 找到对应的书签或高亮
  const bookmark = bookmarkStore.bookmarks.find(b => b.id === id)
  const highlight = highlightStore.highlights.find(h => h.id === id)
  const text = bookmark?.text || highlight?.text
  if (!text) return ''

  const newCfi = await searchTextInDocument(text)
  if (!newCfi) return ''

  // 2) 回写存储
  if (bookmark) {
    bookmarkStore.bookmarks = bookmarkStore.bookmarks.map(b =>
      b.id === id ? { ...b, cfi: newCfi } : b
    )
  } else if (highlight) {
    highlightStore.highlights = highlightStore.highlights.map(h =>
      h.id === id ? { ...h, cfiRange: newCfi } : h
    )
  }

  return newCfi
}

// Wrapper — ensures addBookmark is callable from template inline handlers
const onBookmarkClick = () => {
  addDebugLog('🔘 书签按钮点击')
  addBookmark()
}

const addBookmark = async () => {
  const rend = rendition.value as any
  if (!rend || !bookStore.currentMetadata) { addDebugLog('⭐ 加书签失败：无 rendition 或 metadata'); return }
  addDebugLog('⭐ === 开始加书签 ===')
  addDebugLog(`   bookId: ${bookStore.currentMetadata.id}`)
  let cfi = ''
  let text = ''
  // Use current location CFI
  addDebugLog('   使用 location.cfi')
  try {
    if (rend?.location?.start?.cfi) cfi = rend.location.start.cfi
    else if (typeof rend?.currentLocation === 'function') {
      const cl = rend.currentLocation()
      if (cl?.start?.cfi) cfi = cl.start.cfi
    }
  } catch (e) { addDebugLog(`   location.cfi 异常: ${e}`) }
  addDebugLog(`   location.cfi: '${cfi ? cfi.substring(0,60) + '...' : '空'}'`)
  if (!cfi) { addDebugLog('⭐ 加书签失败：CFI 为空'); showToast(t('reader.bookmarkFailedNoPos')); return }
  // Get paragraph text preview from visible paragraphs
  if (!text) {
    const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
    if (iframe) {
      const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document
      if (doc?.body) {
        const els = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, section, div')
        for (const el of els) {
          const t = el.textContent?.trim()
          if (t && t.length > 10) { text = t.slice(0, 80); break }
        }
      }
    }
  }
  await bookmarkStore.add({
    bookId: bookStore.currentMetadata.id,
    bookTitle: bookStore.currentMetadata.title,
    cfi,
    text: text || bookStore.currentMetadata.title,
    chapterHint: currentChapter.value,
  })
  showToast(t('bookmark.added'))
  addDebugLog(`   ✅ 书签已保存: cfi=${cfi ? cfi.substring(0,50) : '空'}..., text="${text.substring(0,40).replace(/\n/g,' ')}..."`)
}

const deleteBookmark = async (id: string) => {
  await bookmarkStore.remove(id)
}

const applyHighlights = async () => {
  if (!rendition.value || !bookStore.currentMetadata) return
  const items = highlightStore.forBook(bookStore.currentMetadata.id)
  for (const hl of items) {
    let cfi = hl.cfiRange
    // ── 跨平台高亮（来自安卓，无 CFI）：尝试通过文字搜索生成 CFI ──
    if (!cfi && hl.text) {
      const generated = await searchTextInDocument(hl.text)
      if (generated) {
        cfi = generated
        highlightStore.highlights = highlightStore.highlights.map(h =>
          h.id === hl.id ? { ...h, cfiRange: generated } : h
        )
      }
    }
    if (!cfi) continue
    try {
      ;(rendition.value as any).annotations.add('highlight', cfi, { id: hl.id }, null, '', {
        fill: hl.color,
        'fill-opacity': '0.3',
      })
    } catch (e) {
      console.warn('Failed to apply highlight:', e)
    }
  }
}

// Wrapper — ensures addHighlight is callable from template inline handlers
const onHighlightClick = () => {
  addDebugLog('🖍️ 高亮按钮点击')
  addHighlight()
}

const addHighlight = async (color = '#FFEB3B') => {
  const rend = rendition.value as any
  if (!rend || !bookStore.currentMetadata) { addDebugLog('🖍️ 高亮失败：无 rendition 或 metadata'); return }
  addDebugLog('🖍️ === 开始高亮 ===')
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (!iframe) { addDebugLog('🖍️ 高亮失败：找不到 iframe'); return }
  const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document
  if (!doc) { addDebugLog('🖍️ 高亮失败：无法访问 iframe document'); return }
  addDebugLog(`   iframe 大小: ${iframe.offsetWidth}x${iframe.offsetHeight}, rect: ${JSON.stringify(iframe.getBoundingClientRect())}`)
  const selection = doc.getSelection()
  const text = selection?.toString()?.trim()
  addDebugLog(`   选中文字: '${text ? text.substring(0,50) : '空'}'`)
  if (!text) { addDebugLog('🖍️ 高亮失败：无选中文字'); return }
  const range = selection?.getRangeAt(0)
  if (!range) { addDebugLog('🖍️ 高亮失败：无法获取 Range'); return }
  addDebugLog(`   range.startContainer: ${range.startContainer.nodeName}#${(range.startContainer as Element).id || '?'}, offset=${range.startOffset}`)
  addDebugLog(`   range.endContainer: ${range.endContainer.nodeName}#${(range.endContainer as Element).id || '?'}, offset=${range.endOffset}`)
  try {
    // Use epubjs Contents.cfiFromRange() to get proper spine-aware CFI
    const contents = rend.getContents()
    addDebugLog(`   rend.getContents(): ${contents ? contents.length + '个' : 'null'}`)
    if (!contents || contents.length === 0) {
      addDebugLog('🖍️ 高亮失败：无 epubjs contents')
      return
    }
    const cfiRange = contents[0].cfiFromRange(range)
    addDebugLog(`   cfiFromRange 结果: '${cfiRange ? cfiRange.substring(0,80) + '...' : '空'}'`)
    if (!cfiRange) { addDebugLog('🖍️ 高亮失败：cfiFromRange 返回空'); return }
    const hl = await highlightStore.add({
      bookId: bookStore.currentMetadata.id,
      bookTitle: bookStore.currentMetadata.title,
      cfiRange,
      text: text.slice(0, 200),
      color,
    })
    addDebugLog(`   highlightStore.add: id=${hl.id}`)
    // Apply to epubjs rendition
    rend.annotations.add('highlight', cfiRange, { id: hl.id }, null, '', {
      fill: color,
      'fill-opacity': '0.3',
    })
    hideSelectionToolbar()
    showToast(t('highlight.add') + ' ✓')
    addDebugLog(`   ✅ rend.annotations.add 成功, cfiRange=${cfiRange.substring(0,50)}...`)
  } catch (e) {
    addDebugLog(`   ❌ 高亮异常: ${e}`)
  }
}

const deleteHighlight = async (id: string) => {
  const hl = highlightStore.highlights.find(h => h.id === id)
  if (hl) {
    try {
      if (rendition.value) {
        ;(rendition.value as any).annotations.remove(hl.cfiRange, 'highlight')
      }
    } catch (e) { console.warn('Failed to remove highlight from epub:', e) }
  }
  await highlightStore.remove(id)
}


const deleteBook = async (bookId: string) => {
  if (confirm(t('library.confirmDelete'))) {
    if (bookStore.currentMetadata?.id === bookId) closeBook()
    await bookStore.deleteBook(bookId)
  }
}

// Selection actions
const hideSelectionToolbar = () => { showSelectionToolbar.value = false; selectedText.value = '' }

// Translation & AI State
const aiPanelText = ref('')
const freeTranslating = ref(false)
const freeTranslateResult = ref('')

// Unified Translate handler (自动根据全局引擎与配置切换 AI 或 免费通道)
const handleUnifiedTranslate = async () => {
  const text = selectedText.value.trim()
  if (!text) return

  hideSelectionToolbar()
  aiPanelText.value = text
  freeTranslateResult.value = ''

  // 检查全局是否配置了 AI
  const currentCfg = llmStore.config
  const hasAiConfig = !!(currentCfg.apiKey || currentCfg.provider === 'custom')
  const useAi = bilingualStore.engine === 'ai' && hasAiConfig

  resultPanelType.value = 'ai'
  resultPanelTitle.value = `🌐 ${t('selection.translate')}`
  showResultPanel.value = true

  if (useAi) {
    // 优先走 AI 大模型，全语种支持
    await llmStore.translate(
      text,
      'translate',
      undefined,
      llmStore.sourceLang || 'auto',
      bilingualStore.targetLang || llmStore.targetLang || 'zh-CN'
    )
  } else {
    // 走极速免费通道
    freeTranslating.value = true
    try {
      const res = await translateSentenceBatch(
        [text],
        bilingualStore.targetLang || llmStore.targetLang || 'zh-CN',
        llmStore.sourceLang || 'auto'
      )
      freeTranslateResult.value = res[0] || text
    } catch (e) {
      console.warn('Free translation error:', e)
      freeTranslateResult.value = text
    } finally {
      freeTranslating.value = false
    }
  }
}

// AI Explain / Analyze handler
const handleAIAction = async (mode: TranslateMode) => {
  const text = selectedText.value.trim()
  if (!text) return

  hideSelectionToolbar()
  aiPanelText.value = text
  freeTranslateResult.value = ''

  const currentCfg = llmStore.config
  if (!currentCfg.apiKey && currentCfg.provider !== 'custom') {
    unifiedSettingsInitialTab.value = 'ai'
    showUnifiedSettings.value = true
    return
  }

  resultPanelType.value = 'ai'
  const modeLabels: Record<TranslateMode, string> = {
    translate: t('llm.translateMode'),
    explain: t('llm.explainMode'),
    analyze: t('llm.analyzeMode'),
  }
  resultPanelTitle.value = `🤖 AI ${modeLabels[mode]}`
  showResultPanel.value = true

  await llmStore.translate(
    text,
    mode,
    (chunk: string) => {
      // streamingText is updated internally
    },
    llmStore.sourceLang || 'auto',
    bilingualStore.targetLang || llmStore.targetLang || 'zh-CN'
  )
}

// Switch AI mode from within the result panel
const switchAIMode = async (mode: TranslateMode) => {
  const text = aiPanelText.value
  if (!text) return
  freeTranslateResult.value = ''
  const currentCfg = llmStore.config
  if (!currentCfg.apiKey && currentCfg.provider !== 'custom') {
    unifiedSettingsInitialTab.value = 'ai'
    showUnifiedSettings.value = true
    return
  }

  resultPanelType.value = 'ai'
  const modeLabels: Record<TranslateMode, string> = {
    translate: t('llm.translateMode'),
    explain: t('llm.explainMode'),
    analyze: t('llm.analyzeMode'),
  }
  resultPanelTitle.value = `🤖 AI ${modeLabels[mode]}`

  await llmStore.translate(
    text,
    mode,
    (chunk: string) => {
      // streamingText is updated internally
    },
    llmStore.sourceLang || 'auto',
    bilingualStore.targetLang || llmStore.targetLang || 'zh-CN'
  )
}

const closeResultPanel = () => {
  showResultPanel.value = false
  aiPanelText.value = ''
  freeTranslateResult.value = ''
}

const speakSelection = () => {
  if (!selectedText.value) return
  if (blockIfGenerating()) { hideSelectionToolbar(); return }
  ttsStore.speakSelection(selectedText.value)
  hideSelectionToolbar()
}

const copySelection = () => {
  if (!selectedText.value) return
  navigator.clipboard.writeText(selectedText.value)
  hideSelectionToolbar()
}

// TTS
// ★ v2.10.4：生成中的「统一闸门」—— 所有朗读入口都先过这一关。
//   生成期间再点播放键/点段落/划词朗读，一律忽略（只给轻提示），
//   彻底避免「等得不耐烦多点一次 → 两份声音此起彼伏」。
const blockIfGenerating = (): boolean => {
  if (ttsStore.isGenerating) {
    showToast(t('tts.generatingHint'))
    return true
  }
  return false
}

const handleTTSPlayPause = () => {
  if (blockIfGenerating()) return
  if (ttsStore.isPaused) resumeTTS()
  else if (ttsStore.isPlaying) ttsStore.pause()
  else startTTS()
}

const handleTTSStop = () => {
  ttsStore.stop()
  clearTTSHighlight()
}

const startTTS = () => {
  const paragraphs = getParagraphsFromIframe()
  if (!paragraphs?.length) return
  ttsStore.start(paragraphs, 0)
}

const resumeTTS = () => {
  const paragraphs = getParagraphsFromIframe()
  if (!paragraphs?.length) return
  const idx = Math.min(ttsStore.pausedIndex, paragraphs.length - 1)
  ttsStore.start(paragraphs, idx)
}

// Inject ▶ play indicators into each paragraph INSIDE the iframe
// Called on every page render (DOM gets wiped between chapters)
const injectPlayIndicators = (doc: Document) => {
  if (!doc?.body) return
  const styleId = 'moreader-play-style'
  if (!doc.getElementById(styleId)) {
    const style = doc.createElement('style')
    style.id = styleId
    style.textContent = `
      p, h1, h2, h3, h4, h5, h6 { position: relative; }
      .moreader-play-indicator {
        position: absolute;
        left: -1.3em;
        top: 0.15em;
        width: 1em;
        height: 1em;
        opacity: 0;
        transition: opacity 0.15s;
        cursor: pointer;
        user-select: none;
      }
      .moreader-play-indicator::before {
        content: '▶';
        color: #3b82f6;
        font-size: 0.8em;
      }
      .moreader-play-indicator.loading {
        opacity: 1 !important;
      }
      .moreader-play-indicator.loading::before {
        content: '⏳';
        font-size: 0.8em;
      }
      p:hover .moreader-play-indicator,
      h1:hover .moreader-play-indicator,
      h2:hover .moreader-play-indicator,
      h3:hover .moreader-play-indicator,
      h4:hover .moreader-play-indicator,
      h5:hover .moreader-play-indicator,
      h6:hover .moreader-play-indicator { opacity: 1; }
      .tts-hl {
        background-color: rgba(59, 130, 246, 0.15) !important;
        border-left: 4px solid #3b82f6 !important;
        padding-left: 8px !important;
        transition: all 0.2s ease !important;
      }
      .tts-sentence-hl {
        background-color: rgba(34, 197, 94, 0.25) !important;
        border-radius: 2px !important;
        padding: 1px 2px !important;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        transition: background-color 0.15s ease !important;
      }
    `
    doc.head.appendChild(style)
  }
  const selector = 'p, h1, h2, h3, h4, h5, h6'
  doc.querySelectorAll(selector).forEach((para) => {
    const el = para as HTMLElement
    if (el.querySelector('.moreader-play-indicator')) return
    const clean = getCleanText(el)
    if (!clean || clean.length < 2) return
    const indicator = doc.createElement('span')
    indicator.className = 'moreader-play-indicator'
    indicator.title = t('reader.playFromParagraph')
    indicator.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
      playFromParagraph(el)
    })
    el.insertBefore(indicator, el.firstChild)
  })
}

// Called from injected ▶ indicator inside iframe paragraphs
let _lastPlayTime = 0
const playFromParagraph = (para: HTMLElement) => {
  if (blockIfGenerating()) return
  const now = Date.now()
  if (now - _lastPlayTime < 300) return
  _lastPlayTime = now

  // 清除所有旧 indicator loading 状态
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  const doc = iframe?.contentDocument
  if (doc) {
    doc.querySelectorAll('.moreader-play-indicator.loading').forEach(el => el.classList.remove('loading'))
  }

  // 标定当前段落为 loading，给予用户即时视觉反馈（绝不让用户误以为没点上）
  const ind = para.querySelector('.moreader-play-indicator')
  if (ind) ind.classList.add('loading')

  // 立即终止任何在途的旧朗读线程与音频实例（依托 Session ID 彻底杜绝声音重叠）
  ttsStore.stop()
  addDebugLog('▶ === 点击段落播放按钮 ===')
  addDebugLog(`   段落: "${para.textContent?.trim().substring(0,40)}..."`)
  const paragraphs = getParagraphsFromIframe()
  const idx = paragraphs.findIndex(p => p === para)
  addDebugLog(`   findIndex 结果: ${idx} / ${paragraphs.length} 段`)
  if (idx < 0) {
    if (ind) ind.classList.remove('loading')
    addDebugLog('▶ 未找到匹配段落索引！')
    return
  }

  ttsStore.start(paragraphs, idx)
  addDebugLog(`   ✅ TTS.start(paragraphs, ${idx})`)
}

const getParagraphsFromIframe = (): HTMLElement[] => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (!iframe?.contentDocument?.body) return []
  clearTTSHighlight()
  return Array.from(iframe.contentDocument.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div[class*="para"], section')).filter((el: any) => getCleanText(el as HTMLElement).length >= 2) as HTMLElement[]
}

const clearTTSHighlight = () => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (iframe?.contentDocument?.body) {
    iframe.contentDocument.body.querySelectorAll('.moreader-play-indicator.loading').forEach(el => el.classList.remove('loading'))
    iframe.contentDocument.body.querySelectorAll('.tts-highlight, .tts-hl').forEach(el => {
      el.classList.remove('tts-highlight')
      el.classList.remove('tts-hl');
      (el as HTMLElement).style.backgroundColor = '';
      (el as HTMLElement).style.borderLeft = '';
      (el as HTMLElement).style.paddingLeft = '';
    })
    clearSentenceHighlight(iframe.contentDocument)
  }
}

watch(() => ttsStore.isPlaying, (playing) => { if (!playing) clearTTSHighlight() })

// Recording TTS output (not microphone - collects TTS audio blobs during playback)
const openRecordingPanel = () => {
  if (ttsStore.ttsProvider === 'browser') {
    alert(t('recording.serverTTSOnly'))
  }
  resultPanelType.value = 'recording'
  resultPanelTitle.value = `🎙️ ${t('recording.title')}`
  showResultPanel.value = true
}

const startTTSRecording = () => {
  ttsStore.startRecordingTTS()
}

const stopTTSRecording = () => {
  const result = ttsStore.stopRecordingTTS()
  if (result && result.blob) {
    recordedResult.value = { blob: result.blob, url: result.url, text: result.text }
  }
}

const downloadTTSRecording = () => {
  if (!recordedResult.value) return
  const a = document.createElement('a')
  a.href = recordedResult.value.url
  a.download = `tts_recording_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.mp3`
  a.click()
}

// Per-chapter book TTS
const openBookTTSPanel = () => {
  resultPanelType.value = 'bookTTS'
  resultPanelTitle.value = `📚 ${t('bookTTS.title')}`
  showResultPanel.value = true
}

const startChapterTTS = async () => {
  const paragraphs = getParagraphsFromIframe()
  if (!paragraphs?.length) {
    bookTTS.value.error = t('bookTTS.noContent')
    return
  }

  // For now, treat current view as one "chapter" - in a full implementation,
  // we'd navigate through each chapter and extract text
  const texts = paragraphs.map(p => getCleanText(p)).filter(t => t.length >= 2)
  const bookTitle = bookStore.currentMetadata?.title || 'book'

  // Use TOC to split into chapters if available
  const chapters: { title: string; texts: string[] }[] = []
  if (tocItems.value.length > 0) {
    // Group paragraphs by chapter based on TOC
    // Simple heuristic: split texts into roughly equal parts by TOC count
    const tocCount = Math.min(tocItems.value.length, 10) // cap at 10 to avoid too many requests
    const perChapter = Math.max(1, Math.ceil(texts.length / tocCount))
    for (let i = 0; i < tocCount; i++) {
      const start = i * perChapter
      const end = Math.min(start + perChapter, texts.length)
      if (start < texts.length) {
        chapters.push({
          title: tocItems.value[i]?.label || `Chapter ${i + 1}`,
          texts: texts.slice(start, end),
        })
      }
    }
  } else {
    chapters.push({ title: bookTitle, texts })
  }

  // Clear previous results
  chapterResults.value.forEach(ch => URL.revokeObjectURL(ch.url))
  chapterResults.value = []
  bookTTS.value = { isRunning: true, currentChapter: 0, totalChapters: chapters.length, currentText: '', progress: 0, error: '' }

  try {
    const results = await ttsStore.generateChapterAudios(chapters, (ci, total, pi, totalP) => {
      bookTTS.value.currentChapter = ci
      bookTTS.value.totalChapters = total
      bookTTS.value.currentText = `${chapters[ci - 1]?.title || ''}: ${chapters[ci - 1]?.texts[pi - 1]?.slice(0, 30) || ''}...`
      bookTTS.value.progress = Math.round(((ci - 1 + pi / totalP) / total) * 100)
    })

    chapterResults.value = results.map(r => ({
      title: r.title,
      blob: r.blob,
      url: r.url,
      paragraphCount: r.paragraphCount,
    }))
  } catch (e) {
    bookTTS.value.error = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    bookTTS.value.isRunning = false
  }
}

const cancelBookTTS = () => {
  bookTTS.value.isRunning = false
  ttsStore.stop()
}

const playChapterAudio = (idx: number) => {
  const ch = chapterResults.value[idx]
  if (!ch) return
  const audio = new Audio(ch.url)
  audio.play()
}

const downloadChapterAudio = (idx: number) => {
  const ch = chapterResults.value[idx]
  if (!ch) return
  const bookTitle = bookStore.currentMetadata?.title || 'book'
  const safeTitle = ch.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').slice(0, 50)
  const a = document.createElement('a')
  a.href = ch.url
  a.download = `${bookTitle}_${safeTitle}.mp3`
  a.click()
}

// Keyboard
const handleKeydown = (e: KeyboardEvent) => {
  if (!currentBook.value) return
  // Ctrl+Shift+B: add bookmark
  if (e.ctrlKey && e.shiftKey && e.key === 'B') { e.preventDefault(); addBookmark(); return }
  // Ctrl+Shift+H: highlight selected text
  if (e.ctrlKey && e.shiftKey && e.key === 'H') { e.preventDefault(); addHighlight(); return }
  if (e.key === 'ArrowLeft') prevPage()
  else if (e.key === 'ArrowRight') nextPage()
  else if (e.key === 'Escape') {
    if (showResultPanel.value) closeResultPanel()
    else if (showToc.value || showThemeMenu.value || showSelectionToolbar.value) { closeMenus(); hideSelectionToolbar() }
    else closeBook()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('aside') && !target.closest('button') && !target.closest('.selection-toolbar') && !target.closest('.moreader-result-panel')) closeMenus()
}

// Init
onMounted(() => {
  const savedLayout = localStorage.getItem('moreader-layout')
  isFullWidth.value = savedLayout === 'full'
  ttsStore.checkEdgeTTSServer()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
  closeBook()
})
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }
:deep(#epub-reader) { overflow: hidden !important; }
:deep(#epub-reader iframe) { border: none; max-width: 100% !important; overflow-x: hidden !important; pointer-events: auto !important; }
.selection-toolbar { pointer-events: auto !important; user-select: none; }
</style>
