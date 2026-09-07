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

    <!-- Unified Translation / Result Panel -->
    <transition name="fade">
      <div v-if="showResultPanel" class="fixed z-[100] bottom-20 left-1/2 -translate-x-1/2 w-[560px] max-w-[90vw] max-h-[70vh] p-4 rounded-lg shadow-xl border overflow-y-auto" :class="[themeClasses.menuBgClass, themeClasses.borderColor]">
        <!-- Panel header -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold" :class="themeClasses.textColor">{{ resultPanelTitle }}</span>
          <button @click="closeResultPanel" class="p-1 rounded hover:bg-black/10" :class="themeClasses.textColor">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- External translation (iframe) -->
        <div v-if="resultPanelType === 'ext'" class="flex flex-col gap-2">
          <p class="text-xs opacity-60" :class="themeClasses.textColor">📝 {{ selectedText }}</p>
          <div class="flex gap-2 mb-2">
            <button v-for="svc in ['google', 'youdao', 'baidu', 'deepl']" :key="svc"
              @click="switchExtTranslate(svc as string)"
              class="px-2 py-1 text-xs rounded transition-colors"
              :class="extTranslateSource === svc ? 'bg-blue-500 text-white' : (themeClasses.borderColor + ' ' + themeClasses.textColor)">
              {{ svc === 'google' ? 'Google' : svc === 'youdao' ? t('dict.youdao') : svc === 'baidu' ? t('dict.baidu') : 'DeepL' }}
            </button>
            <a :href="extTranslateUrl" target="_blank" class="px-2 py-1 text-xs rounded border transition-colors ml-auto" :class="[themeClasses.borderColor, themeClasses.textColor]">
              {{ t('extTranslate.openInTab') }} ↗
            </a>
          </div>
          <!-- iframe attempt - many sites block it, fallback to link -->
          <div class="w-full h-80 rounded border bg-white/5">
            <iframe :src="extTranslateUrl" class="w-full h-full rounded border-0" sandbox="allow-scripts allow-same-origin allow-popups" />
          </div>
          <p class="text-xs text-center opacity-50" :class="themeClasses.textColor">{{ t('extTranslate.iframeHint') }}</p>
        </div>

        <!-- Dictionary lookup (iframe) -->
        <div v-if="resultPanelType === 'dict'" class="flex flex-col gap-2">
          <p class="text-xs opacity-60 p-2 rounded" :class="[isDark ? 'bg-white/5' : 'bg-black/5', themeClasses.textColor]">📝 {{ selectedText }}</p>
          <div class="flex gap-2 mb-2">
            <button v-for="svc in ['youdao', 'cambridge', 'oxford']" :key="svc"
              @click="switchDict(svc)"
              class="px-2 py-1 text-xs rounded transition-colors"
              :class="dictSource === svc ? 'bg-blue-500 text-white' : (themeClasses.borderColor + ' ' + themeClasses.textColor)">
              {{ getDictName(svc) }}
            </button>
            <a :href="dictUrl" target="_blank" class="px-2 py-1 text-xs rounded border transition-colors ml-auto" :class="[themeClasses.borderColor, themeClasses.textColor]">
              {{ t('extTranslate.openInTab') }} ↗
            </a>
          </div>
          <div class="w-full h-80 rounded border bg-white/5">
            <iframe :src="dictUrl" class="w-full h-full rounded border-0" sandbox="allow-scripts allow-same-origin allow-popups" />
          </div>
          <p class="text-xs text-center opacity-50" :class="themeClasses.textColor">{{ t('extTranslate.iframeHint') }}</p>
        </div>

        <!-- AI translation result -->
        <div v-if="resultPanelType === 'ai'" class="flex flex-col gap-2">
          <p class="text-xs opacity-60 p-2 rounded" :class="[isDark ? 'bg-white/5' : 'bg-black/5', themeClasses.textColor]">📝 {{ selectedText }}</p>
          <div v-if="llmStore.isTranslating" class="flex items-center gap-2 py-4">
            <div class="w-4 h-4 border-2 rounded-full animate-spin" :class="[themeClasses.borderColor, themeClasses.borderTopColor]"></div>
            <span class="text-sm" :class="themeClasses.textColor">{{ t('llm.translating') }}</span>
          </div>
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
          <!-- Mode switch buttons (no translate - already in translate panel) -->
          <div v-if="!llmStore.isTranslating" class="flex gap-2 mt-2">
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
      :has-book="!!currentBook"
      :theme="themeClasses"
      :is-full-width="isFullWidth"
      :show-toc="showToc"
      :show-theme-menu="showThemeMenu"
      :show-tts-settings="showTTSSettings"
      :show-ai-settings="showLLMSettings"
      :tts-playing="ttsStore.isPlaying"
      :tts-paused="ttsStore.isPaused"
      :can-go-back="canGoBack"
      :show-bookmarks="showBookmarks"
      :show-highlights="showHighlights"
      :show-sync="showSync"
      @toggle-donate="showDonate = true"
      @toggle-layout="toggleLayout"
      @toggle-toc="toggleToc"
      @go-back="goBack"
      @toggle-theme-menu="toggleThemeMenu"
      @tts-play-pause="handleTTSPlayPause"
      @tts-stop="handleTTSStop"
      @toggle-tts-settings="showTTSSettings = !showTTSSettings"
      @toggle-ai-settings="showLLMSettings = !showLLMSettings"
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
      @lookup="handleLookup"
      @extTranslate="handleExtTranslate"
      @ai-translate="handleAITranslate"
      @highlight="onHighlightClick"
      @speak="speakSelection"
      @copy="copySelection"
    />

    <!-- TTS Settings -->
    <TtsSettingsPanel
      :visible="showTTSSettings"
      :theme="themeClasses"
      :is-dark="isDark"
      :provider="ttsStore.ttsProvider"
      :edge-available="ttsStore.edgeTTSAvailable"
      :edge-voices="ttsStore.edgeTTSVoices"
      :edge-voice="ttsStore.edgeTTSVoice"
      :edge-endpoint="ttsStore.edgeTTSEndpoint"
      :edge-api-key="ttsStore.edgeTTSApiKey"
      :available-voices="ttsStore.availableVoices"
      :selected-voice-u-r-i="ttsStore.selectedVoiceURI"
      :speech-rate="ttsStore.speechRate"
      :ai-voice-endpoint="ttsStore.aiVoiceEndpoint"
      :ai-voice-api-key="ttsStore.aiVoiceApiKey"
      :ai-voice-model="ttsStore.aiVoiceModel"
      :ai-voice-id="ttsStore.aiVoiceId"
      :ai-voice-provider="ttsStore.aiVoiceProvider"
      :ai-available="ttsStore.aiVoiceAvailable"
      @check-server="ttsStore.checkEdgeTTSServer()"
      @check-a-i-server="ttsStore.checkAIVoiceServer()"
      @set-provider="ttsStore.setTTSProvider($event as any)"
      @set-edge-voice="ttsStore.setEdgeVoice($event)"
      @set-edge-endpoint="ttsStore.setEdgeTTSEndpoint($event)"
      @set-edge-api-key="ttsStore.setEdgeTTSApiKey($event)"
      @set-voice="ttsStore.setVoice($event)"
      @set-rate="ttsStore.setRate($event)"
      @set-a-i-voice-endpoint="ttsStore.setAIVoiceEndpoint($event)"
      @set-a-i-voice-api-key="ttsStore.setAIVoiceApiKey($event)"
      @set-a-i-voice-model="ttsStore.setAIVoiceModel($event)"
      @set-a-i-voice-id="ttsStore.setAIVoiceId($event)"
      @set-a-i-voice-provider="ttsStore.setAIVoiceProvider($event)"
      @close="showTTSSettings = false"
    />

    <!-- LLM Settings -->
    <LlmSettingsPanel
      :visible="showLLMSettings"
      :theme="themeClasses"
      :is-dark="isDark"
      @close="showLLMSettings = false"
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



    <!-- Main Content -->
    <main class="flex-1 relative overflow-hidden" :class="themeClasses.mainBgClass">
      <LibraryView
        ref="libraryViewRef"
        v-if="!currentBook"
        :books="bookStore.books"
        :is-loading="bookStore.isLoading"
        :is-dark="isDark"
        :theme="themeClasses"
        @open-book="openBook"
        @delete-book="deleteBook"
        @upload="handleFileUpload"
        @batch-upload="handleBatchUpload"
      />
      <ReaderView
        v-else
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
    </main>

    <!-- Footer toolbar (recording + book TTS + bookmark) -->
    <div v-if="currentBook" class="fixed bottom-2 right-4 z-[90] flex gap-2">
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

    <!-- Debug Toggle Button -->
    <button @click="showDebugPanel = !showDebugPanel" class="fixed bottom-2 left-4 z-[140] px-3 py-1.5 text-xs rounded-lg shadow-lg font-bold transition-colors bg-red-600 text-white hover:bg-red-700">
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
import { useTTSStore } from '@/stores/ttsStore'
import { useLLMStore } from '@/stores/llmStore'
import { useTheme } from '@/composables/useTheme'
import { useI18n } from '@/i18n'
import type { TranslateMode } from '@/types/book'
import AppHeader from './AppHeader.vue'
import LibraryView from './LibraryView.vue'
import ReaderView from './ReaderView.vue'
import SelectionToolbar from './SelectionToolbar.vue'
import TtsSettingsPanel from './TtsSettingsPanel.vue'
import LlmSettingsPanel from './LlmSettingsPanel.vue'
import ThemeMenu from './ThemeMenu.vue'
import BookmarksPanel from './BookmarksPanel.vue'
import HighlightsPanel from './HighlightsPanel.vue'
import SyncPanel from './SyncPanel.vue'
import DonateModal from './DonateModal.vue'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useHighlightStore } from '@/stores/highlightStore'
// @ts-ignore
import { EpubCFI } from 'epubjs'
import { getGoldenEdgeVoice } from '@/utils/langVoiceDetector'

const { t, locale } = useI18n()
const bookStore = useBookStore()
const ttsStore = useTTSStore()
const llmStore = useLLMStore()
const bookmarkStore = useBookmarkStore()
const highlightStore = useHighlightStore()

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
const tocItems = ref<NavItem[]>([])
const showToc = ref(false)
const showThemeMenu = ref(false)
const showTTSSettings = ref(false)
const showLLMSettings = ref(false)
const showBookmarks = ref(false)
const showHighlights = ref(false)
const showSync = ref(false)
const showDonate = ref(false)
const currentChapter = ref('')
const currentLocation = ref('')
const canGoPrev = ref(false)
const canGoNext = ref(true)
const navigationHistory = ref<string[]>([])
const canGoBack = computed(() => navigationHistory.value.length > 0)
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
type ResultPanelType = 'ext' | 'ai' | 'recording' | 'bookTTS' | 'dict'
const showResultPanel = ref(false)
const resultPanelType = ref<ResultPanelType>('ai')
const resultPanelTitle = ref('')

// External translation
const extTranslateSource = ref('google')
const extTranslateUrl = ref('')

const EXT_TRANSLATE_URLS: Record<string, (text: string) => string> = {
  google: (text) => `https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(text)}&op=translate`,
  youdao: (text) => `https://dict.youdao.com/result?word=${encodeURIComponent(text)}&lang=en`,
  baidu: (text) => `https://fanyi.baidu.com/#en/zh/${encodeURIComponent(text)}`,
  deepl: (text) => `https://www.deepl.com/translator#en/zh/${encodeURIComponent(text)}`,
}

// Build translation URL (direct access - user should configure browser system proxy for Google)
const buildTranslateUrl = (source: string, text: string): string => {
  return EXT_TRANSLATE_URLS[source]?.(text) || ''
}

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

// EPUB 2.0 NCX fallback — epubjs's book.navigation only supports EPUB 3 NAV documents
// Many Chinese EPUBs (cnepub, calibre-converted) use EPUB 2.0 with NCX only
// Approach: directly read the EPUB zip (like the Android version does) —
//   container.xml → OPF → NCX, with namespace-aware XML parsing
const parseNCXFforward = async (book: any, bookId: string): Promise<NavItem[]> => {
  try {
    addDebugLog('📑 NCX: 开始回退解析...')
    // Load the raw EPUB as ArrayBuffer and re-zip (independent of epubjs internals)
    const arrayBuffer = await bookStore.loadBookBinary(bookId)
    if (!arrayBuffer) { addDebugLog('📑 NCX: ❌ loadBookBinary 返回空'); return [] }
    addDebugLog(`📑 NCX: ✓ ArrayBuffer loaded, ${arrayBuffer.byteLength} bytes`)

    // Dynamic import of JSZip — bundled via vite
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(arrayBuffer)
    addDebugLog(`📑 NCX: ✓ JSZip opened, files: ${Object.keys(zip.files).length}`)

    // Step 1: read container.xml to find OPF path
    const containerFile = zip.file('META-INF/container.xml')
    if (!containerFile) { addDebugLog('📑 NCX: ❌ container.xml not found'); return [] }
    const containerXml = await containerFile.async('string')
    const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml')
    const rootfile = containerDoc.querySelector('rootfile')
      || containerDoc.getElementsByTagNameNS('*', 'rootfile')[0]
    if (!rootfile) { addDebugLog('📑 NCX: ❌ rootfile not found in container'); return [] }
    const opfPath = rootfile.getAttribute('full-path') || ''
    if (!opfPath) { addDebugLog('📑 NCX: ❌ opfPath empty'); return [] }
    addDebugLog(`📑 NCX: ✓ OPF path = ${opfPath}`)

    // Step 2: read OPF to find NCX
    const opfFile = zip.file(opfPath)
    if (!opfFile) return []
    const opfXml = await opfFile.async('string')
    const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml')

    // Get NCX id from spine toc attribute
    const spineEl = opfDoc.querySelector('spine')
      || opfDoc.getElementsByTagNameNS('*', 'spine')[0]
    const ncxId = spineEl?.getAttribute('toc')
    if (!ncxId) { addDebugLog('📑 NCX: ❌ ncxId not found in spine toc'); return [] }
    addDebugLog(`📑 NCX: ✓ ncxId = ${ncxId}`)

    // Find NCX href in manifest
    const items = opfDoc.querySelectorAll('item')
      || opfDoc.getElementsByTagNameNS('*', 'item')
    let ncxHref = ''
    for (const item of Array.from(items)) {
      if (item.getAttribute('id') === ncxId) {
        ncxHref = item.getAttribute('href') || ''
        break
      }
    }
    if (!ncxHref) { addDebugLog('📑 NCX: ❌ ncxHref not found for id=' + ncxId); return [] }
    addDebugLog(`📑 NCX: ✓ ncxHref = ${ncxHref}`)

    // Step 3: resolve NCX path (relative to OPF directory) and read NCX
    const opfDir = opfPath.replace(/[/][^/]+$/, '')
    const ncxFullPath = opfDir ? `${opfDir}/${ncxHref}` : ncxHref
    addDebugLog(`📑 NCX: 尝试读取 NCX: ${ncxFullPath}`)
    const ncxFile = zip.file(ncxFullPath)
    if (!ncxFile) { addDebugLog(`📑 NCX: ❌ NCX file not found at ${ncxFullPath}`); return [] }
    const ncxXml = await ncxFile.async('string')
    addDebugLog(`📑 NCX: ✓ NCX loaded, ${ncxXml.length} chars`)
    const ncxDoc = new DOMParser().parseFromString(ncxXml, 'text/xml')

    // Step 4: parse navPoints (namespace-aware, like Android version)
    const navPoints = ncxDoc.querySelectorAll('navPoint').length
      ? ncxDoc.querySelectorAll('navPoint')
      : ncxDoc.getElementsByTagNameNS('*', 'navPoint')
    addDebugLog(`📑 NCX: navPoints found = ${(navPoints as any).length || 0}`)
    const tocItems2: NavItem[] = []
    for (const np of Array.from(navPoints)) {
      const npEl = np as Element
      const textEl = npEl.querySelector('text')
        || npEl.getElementsByTagNameNS('*', 'text')[0]
      const label = textEl?.textContent?.trim() || ''
      const contentEl = npEl.querySelector('content')
        || npEl.getElementsByTagNameNS('*', 'content')[0]
      const src = contentEl?.getAttribute('src') || ''
      if (label && src) {
        // countDepth: count ancestor navPoints to get nesting level
        let depth = 0
        let p = npEl.parentElement
        while (p) {
          if (p.localName === 'navPoint' || p.nodeName === 'navPoint'
              || (p.nodeName && p.nodeName.endsWith(':navPoint'))) depth++
          p = p.parentElement
        }
        tocItems2.push({ label, href: src, level: depth })
      }
    }
    addDebugLog(`📑 NCX: ✅ 最终解析 ${tocItems2.length} 个章节`)
    if (tocItems2.length > 0) addDebugLog(`📑 NCX: 前3项: ${tocItems2.slice(0,3).map(i => i.label).join(', ')}`)
    return tocItems2
  } catch (e) {
    addDebugLog(`📑 NCX: ❌ 异常: ${e}`)
    return []
  }
}

// Open book
const openBook = async (bookId: string) => {
  try {
    bookStore.isLoadingBook = true
    bookStore.loadingProgress = 0
    bookStore.loadingMessage = t('loading.loadingBook')

    const arrayBuffer = await bookStore.loadBookBinary(bookId)
    if (!arrayBuffer) throw new Error('无法加载书籍数据')

    if (rendition.value) { rendition.value.destroy(); rendition.value = null }
    if (bookInstance.value) { bookInstance.value.destroy() }

    const book = Epub(arrayBuffer)
    bookInstance.value = book
    const metadata = bookStore.books.find(b => b.id === bookId)

    await book.ready
    bookStore.loadingProgress = 30
    bookStore.loadingMessage = t('loading.generatingIndex')
    await book.locations.generate(1000)

    bookStore.loadingProgress = 60
    bookStore.loadingMessage = t('loading.loadingToc')
    const navigation = await book.navigation
    tocItems.value = navigation.toc || []
    addDebugLog(`📑 TOC: book.navigation returned ${tocItems.value.length} items`)
    // EPUB 2.0 fallback: parse NCX if epub.js returned too few items (EPUB 3 NAV vs NCX)
    // epub.js book.navigation prefers EPUB 3 <nav> and may only return spine-level entries
    // for EPUB 2.0 books, resulting in 3-5 items when the NCX has many more navPoints
    if (tocItems.value.length < 5) {
      addDebugLog(`📑 TOC: 只有 ${tocItems.value.length} 项(<5)，启动 NCX 回退解析...`)
      const ncxItems = await parseNCXFforward(book, bookId)
      if (ncxItems.length > tocItems.value.length) {
        addDebugLog(`📑 TOC: NCX 返回 ${ncxItems.length} 项(>${tocItems.value.length})，替换目录`)
        tocItems.value = ncxItems
      } else {
        addDebugLog(`📑 TOC: NCX 返回 ${ncxItems.length} 项，保留原始目录`)
      }
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
        showTTSSettings.value = false
        showLLMSettings.value = false
      })

      // Intercept internal links for history
      doc.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const link = target.closest('a[href]') as HTMLAnchorElement | null
        if (!link) return
        const href = link.getAttribute('href')
        if (!href) return
        if (/^(https?:|mailto:|tel:)/.test(href)) return
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
            if (last !== cfi) navigationHistory.value.push(cfi)
          }
        } catch (e) { console.warn('Failed to save position:', e) }
      }, true)

      ;(doc as any).__moreaderSetup = true
    }

    rendition.value.on('relocated', () => setupIframe())
    setTimeout(setupIframe, 500)

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
const prevPage = () => { rendition.value?.prev(); closeMenus(); hideSelectionToolbar() }
const nextPage = () => { rendition.value?.next(); closeMenus(); hideSelectionToolbar() }

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
  if (cfi && cfi !== href) navigationHistory.value.push(cfi)
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

const goBack = async () => {
  if (navigationHistory.value.length > 0 && rendition.value) {
    const pos = navigationHistory.value.pop()!
    try {
      await rendition.value.display(pos)
      setTimeout(() => rendition.value?.resize(), 100)
      closeMenus(); hideSelectionToolbar()
    } catch (e) {
      try {
        const href = pos.split('#')[0]
        if (href) await rendition.value.display(href)
      } catch (e2) {}
    }
  }
}

const closeBook = () => {
  ttsStore.stop()
  closeMenus(); hideSelectionToolbar()
  tocItems.value = []
  if (rendition.value) { rendition.value.destroy(); rendition.value = null }
  if (bookInstance.value) { bookInstance.value.destroy(); bookInstance.value = null }
  bookStore.setCurrentBook(null)
  currentLocation.value = ''; readingProgress.value = 0; progressSlider.value = 0
  navigationHistory.value = []
  showBookmarks.value = false
  showHighlights.value = false
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

// External lookup (dictionary) - show in popup
const DICT_URLS: Record<string, (text: string) => string> = {
  youdao: (text) => `https://dict.youdao.com/result?word=${encodeURIComponent(text)}&lang=en`,
  cambridge: (text) => {
    const isPhrase = text.includes(' ')
    if (isPhrase) return `https://dictionary.cambridge.org/zhs/词典/英语-汉语-简体/${encodeURIComponent(text.toLowerCase().replace(/ /g, '-'))}`
    return `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(text.toLowerCase())}`
  },
  oxford: (text) => `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(text.toLowerCase())}`,
}

const dictSource = ref('youdao')
const dictUrl = ref('')
function getDictName(source: string): string {
  const map: Record<string, string> = {
    youdao: t('dict.youdao'),
    cambridge: t('dict.cambridge'),
    oxford: t('dict.oxford'),
    baidu: t('dict.baidu'),
  }
  return map[source] || source
}

const handleLookup = (source: string) => {
  const text = selectedText.value.trim()
  if (!text) return
  hideSelectionToolbar()
  dictSource.value = source
  dictUrl.value = DICT_URLS[source]?.(text) || ''
  resultPanelType.value = 'dict'
  resultPanelTitle.value = t('reader.dictTitle', { dict: getDictName(source) })
  showResultPanel.value = true
}

const switchDict = (source: string) => {
  const text = selectedText.value.trim()
  if (!text) return
  dictSource.value = source
  dictUrl.value = DICT_URLS[source]?.(text) || ''
  resultPanelTitle.value = t('reader.dictTitle', { dict: getDictName(source) })
}

// External translation - show in popup
const handleExtTranslate = (source: string) => {
  const text = selectedText.value.trim()
  if (!text) return
  hideSelectionToolbar()
  extTranslateSource.value = source
  extTranslateUrl.value = buildTranslateUrl(source, text)
  resultPanelType.value = 'ext'
  resultPanelTitle.value = t('reader.transTitle', { engine: source === 'google' ? 'Google' : source === 'youdao' ? t('dict.youdao') : source === 'baidu' ? t('dict.baidu') : 'DeepL' })
  showResultPanel.value = true
}

const switchExtTranslate = (source: string) => {
  const text = selectedText.value.trim()
  if (!text) return
  extTranslateSource.value = source
  extTranslateUrl.value = buildTranslateUrl(source, text)
  resultPanelTitle.value = t('reader.transTitle', { engine: source === 'google' ? 'Google' : source === 'youdao' ? t('dict.youdao') : source === 'baidu' ? t('dict.baidu') : 'DeepL' })
}

// Old handleTranslate (backward compat) - now uses popup
const handleTranslate = (source: string) => {
  handleExtTranslate(source)
}

// AI Translate state
const aiPanelText = ref('') // Store text for explain/analyze mode switches within the panel

// AI Translate - show in unified popup
const handleAITranslate = async (mode: TranslateMode) => {
  const text = selectedText.value.trim()
  if (!text) return

  // Always hide selection toolbar when opening AI panel
  hideSelectionToolbar()
  aiPanelText.value = text

  if (!llmStore.config.apiKey) {
    showLLMSettings.value = true
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

  // llmStore.translate() already clears streamingText/lastResult/lastError at start
  await llmStore.translate(text, mode, (chunk: string) => {
    // llmStore.streamingText is updated internally
  })
}

// Switch AI mode from within the result panel (no toolbar interaction)
const switchAIMode = async (mode: TranslateMode) => {
  const text = aiPanelText.value
  if (!text) return
  if (!llmStore.config.apiKey) {
    showLLMSettings.value = true
    return
  }

  resultPanelType.value = 'ai'
  const modeLabels: Record<TranslateMode, string> = {
    translate: t('llm.translateMode'),
    explain: t('llm.explainMode'),
    analyze: t('llm.analyzeMode'),
  }
  resultPanelTitle.value = `🤖 AI ${modeLabels[mode]}`

  await llmStore.translate(text, mode, (chunk: string) => {
    // llmStore.streamingText is updated internally
  })
}

const closeResultPanel = () => {
  showResultPanel.value = false
  aiPanelText.value = ''
}

const speakSelection = () => {
  if (!selectedText.value) return
  ttsStore.speakSelection(selectedText.value)
  hideSelectionToolbar()
}

const copySelection = () => {
  if (!selectedText.value) return
  navigator.clipboard.writeText(selectedText.value)
  hideSelectionToolbar()
}

// TTS
const handleTTSPlayPause = () => {
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
      p:hover .moreader-play-indicator,
      h1:hover .moreader-play-indicator,
      h2:hover .moreader-play-indicator,
      h3:hover .moreader-play-indicator,
      h4:hover .moreader-play-indicator,
      h5:hover .moreader-play-indicator,
      h6:hover .moreader-play-indicator { opacity: 1; }
    `
    doc.head.appendChild(style)
  }
  const selector = 'p, h1, h2, h3, h4, h5, h6'
  doc.querySelectorAll(selector).forEach((para) => {
    const el = para as HTMLElement
    if (el.querySelector('.moreader-play-indicator')) return
    const text = el.textContent?.trim()
    if (!text || text.length < 10) return
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
  // 5000ms debounce — Edge TTS 异步获取音频约3秒，5秒窗口覆盖完整周期
  const now = Date.now()
  if (now - _lastPlayTime < 5000) return
  _lastPlayTime = now
  ttsStore.stop()
  addDebugLog('▶ === 点击段落播放按钮 ===')
  addDebugLog(`   段落: "${para.textContent?.trim().substring(0,40)}..."`)
  const paragraphs = getParagraphsFromIframe()
  const idx = paragraphs.findIndex(p => p === para)
  addDebugLog(`   findIndex 结果: ${idx} / ${paragraphs.length} 段`)
  if (idx < 0) { addDebugLog('▶ 未找到匹配段落索引！'); return }
  // Small delay to ensure previous stop completes before starting new playback
  setTimeout(() => {
    ttsStore.stop()
    ttsStore.start(paragraphs, idx)
    addDebugLog(`   ✅ TTS.start(paragraphs, ${idx})`)
  }, 50)
}

const getParagraphsFromIframe = (): HTMLElement[] => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (!iframe?.contentDocument?.body) return []
  clearTTSHighlight()
  return Array.from(iframe.contentDocument.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div[class*="para"], section')).filter((el: any) => el.textContent?.trim().length > 10) as HTMLElement[]
}

const clearTTSHighlight = () => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (iframe?.contentDocument?.body) {
    iframe.contentDocument.body.querySelectorAll('.tts-highlight').forEach(el => {
      el.classList.remove('tts-highlight');
      (el as HTMLElement).style.backgroundColor = ''
    })
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
  const texts = paragraphs.map(p => p.innerText?.trim() || '').filter(t => t.length > 5)
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
  if (!target.closest('aside') && !target.closest('button') && !target.closest('.selection-toolbar') && !target.closest('[class*="bottom-20"]')) closeMenus()
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
