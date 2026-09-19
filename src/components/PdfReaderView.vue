<template>
  <div class="h-full flex flex-col min-w-0 select-none" :class="theme.containerClass">
    <!-- Top Bar: Info & Controls -->
    <div class="flex-none px-4 py-2 border-b flex items-center justify-between gap-3 transition-colors" :class="[theme.bookInfoBgClass, theme.borderColor]">
      <!-- Left: Title & Page badge -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-medium truncate max-w-[280px] sm:max-w-md" :class="theme.textColor">{{ title }}</h2>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 uppercase tracking-wider">PDF</span>
          </div>
          <p class="text-xs opacity-60 truncate" :class="theme.textColor">{{ author }}</p>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Zoom Controls -->
        <div class="flex items-center rounded-lg border p-0.5" :class="[theme.borderColor, isDark ? 'bg-white/5' : 'bg-black/5']">
          <button @click="zoomOut" class="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors" :class="theme.textColor" :title="t('pdf.zoomOut')">
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <button @click="fitWidth" class="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-mono" :class="theme.textColor" :title="t('pdf.fitWidth')">
            {{ Math.round(scale * 100) }}%
          </button>
          <button @click="zoomIn" class="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors" :class="theme.textColor" :title="t('pdf.zoomIn')">
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Convert to Flow Ebook Button -->
        <button
          @click="$emit('convertToFlow')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          :title="t('pdf.convertToFlowDesc')"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('pdf.convertToFlow') }}</span>
          <span class="sm:hidden">{{ t('pdf.convertToFlow').slice(0, 4) }}</span>
        </button>
      </div>
    </div>

    <!-- Main PDF Viewport (Scrollable) -->
    <div
      ref="viewportContainer"
      class="flex-1 relative overflow-auto flex items-start justify-center p-4 sm:p-6"
      :class="isDark ? 'bg-neutral-900' : 'bg-neutral-100'"
      @mouseup="handleTextSelection"
    >
      <!-- Nav Arrows -->
      <button
        @click="prevPage"
        class="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all"
        :class="[currentPage > 1 ? (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-gray-800 hover:bg-gray-50') : 'opacity-20 cursor-not-allowed bg-transparent']"
        :disabled="currentPage <= 1"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>

      <button
        @click="nextPage"
        class="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all"
        :class="[currentPage < totalPages ? (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-gray-800 hover:bg-gray-50') : 'opacity-20 cursor-not-allowed bg-transparent']"
        :disabled="currentPage >= totalPages"
      >
        <ChevronRight class="w-5 h-5" />
      </button>

      <!-- PDF Canvas & TextLayer Container -->
      <div
        ref="pageWrapper"
        class="relative shadow-2xl rounded-sm overflow-hidden bg-white select-text transition-transform duration-100"
        :style="{ width: `${pageWidth}px`, height: `${pageHeight}px` }"
      >
        <canvas ref="pdfCanvas" class="block w-full h-full"></canvas>
        <div ref="textLayerContainer" class="textLayer absolute inset-0 overflow-hidden leading-none pointer-events-auto"></div>
      </div>
    </div>

    <!-- Selection Floating Toolbar -->
    <SelectionToolbar
      :visible="toolbarVisible"
      :position="toolbarPosition"
      :theme="theme"
      @speak="onToolbarSpeak"
      @translate="onToolbarTranslate"
      @ai-action="onToolbarAiAction"
      @highlight="onToolbarHighlight"
      @copy="onToolbarCopy"
    />

    <!-- Bottom Navigation Bar -->
    <div class="flex-none h-12 border-t flex items-center justify-between px-4 sm:px-6 transition-colors" :class="[theme.progressBgClass, theme.borderColor]">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium" :class="theme.textColor">
          {{ t('pdf.pageIndicator', { current: currentPage, total: totalPages }) }}
        </span>
      </div>

      <!-- Slider for Fast Navigation -->
      <div class="flex-1 max-w-md mx-4 flex items-center gap-3">
        <input
          type="range"
          min="1"
          :max="totalPages || 1"
          step="1"
          :value="currentPage"
          @input="onSliderInput"
          class="flex-1 h-1 rounded-lg appearance-none cursor-pointer slider"
          :class="theme.sliderBgClass"
        />
      </div>

      <!-- Quick Page Jump -->
      <div class="flex items-center gap-1.5">
        <input
          type="number"
          min="1"
          :max="totalPages || 1"
          v-model.number="jumpInputPage"
          @keydown.enter="jumpToPage"
          class="w-12 px-1.5 py-1 text-xs text-center rounded border outline-none font-mono"
          :class="[theme.borderColor, isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-800']"
        />
        <button
          @click="jumpToPage"
          class="px-2 py-1 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          :class="[theme.borderColor, theme.textColor]"
        >
          {{ t('pdf.pageJump') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Sparkles } from 'lucide-vue-next'
import 'pdfjs-dist/web/pdf_viewer.css'
import { pdfjsLib } from '@/utils/pdfLoader'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  title: string
  author: string
  theme: Record<string, string>
  initialPage?: number
  isDark?: boolean
}>()

const emit = defineEmits([
  'pageChange',
  'speakText',
  'translateText',
  'aiAction',
  'convertToFlow',
  'backToLibrary'
])

const viewportContainer = ref<HTMLDivElement | null>(null)
const pageWrapper = ref<HTMLDivElement | null>(null)
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const textLayerContainer = ref<HTMLDivElement | null>(null)

let pdfDoc: any = null
let currentRenderTask: any = null

const currentPage = ref(props.initialPage || 1)
const totalPages = ref(1)
const scale = ref(1.2)
const pageWidth = ref(600)
const pageHeight = ref(800)
const jumpInputPage = ref(currentPage.value)

// Selection Toolbar State
const toolbarVisible = ref(false)
const toolbarPosition = ref({ top: 0, left: 0 })
const selectedText = ref('')

// Load PDF Document
const loadDocument = async () => {
  if (!props.pdfBuffer) return
  try {
    const loadingTask = pdfjsLib.getDocument({ data: props.pdfBuffer })
    pdfDoc = await loadingTask.promise
    totalPages.value = pdfDoc.numPages
    await renderPage(currentPage.value)
  } catch (err) {
    console.error('Failed to load PDF in PdfReaderView:', err)
  }
}

// Render Single Page
const renderPage = async (pageNumber: number) => {
  if (!pdfDoc) return
  if (pageNumber < 1 || pageNumber > totalPages.value) return

  if (currentRenderTask) {
    try { currentRenderTask.cancel() } catch {}
  }

  try {
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale: scale.value })

    pageWidth.value = Math.floor(viewport.width)
    pageHeight.value = Math.floor(viewport.height)

    if (pdfCanvas.value) {
      const canvas = pdfCanvas.value
      const ctx = canvas.getContext('2d', { alpha: false })
      if (ctx) {
        // High DPI standard rendering
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null

        currentRenderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: transform || undefined
        })
        await currentRenderTask.promise
      }
    }

    // Render TextLayer for Selection & Highlighting
    if (textLayerContainer.value) {
      textLayerContainer.value.innerHTML = ''
      textLayerContainer.value.style.width = `${Math.floor(viewport.width)}px`
      textLayerContainer.value.style.height = `${Math.floor(viewport.height)}px`
      textLayerContainer.value.style.setProperty('--scale-factor', `${scale.value}`)

      const textContent = await page.getTextContent()

      const textLayer = new (pdfjsLib as any).TextLayer({
        textContentSource: textContent,
        container: textLayerContainer.value,
        viewport
      })
      await textLayer.render()
    }

    emit('pageChange', pageNumber, totalPages.value)
    jumpInputPage.value = pageNumber
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error(`Failed to render PDF page ${pageNumber}:`, err)
    }
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage(currentPage.value)
    closeToolbar()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage(currentPage.value)
    closeToolbar()
  }
}

const onSliderInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const p = parseInt(target.value, 10)
  if (!isNaN(p) && p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    renderPage(currentPage.value)
    closeToolbar()
  }
}

const jumpToPage = () => {
  if (jumpInputPage.value >= 1 && jumpInputPage.value <= totalPages.value) {
    currentPage.value = jumpInputPage.value
    renderPage(currentPage.value)
    closeToolbar()
  } else {
    jumpInputPage.value = currentPage.value
  }
}

const zoomIn = () => {
  if (scale.value < 3.0) {
    scale.value = parseFloat((scale.value + 0.2).toFixed(1))
    renderPage(currentPage.value)
  }
}

const zoomOut = () => {
  if (scale.value > 0.6) {
    scale.value = parseFloat((scale.value - 0.2).toFixed(1))
    renderPage(currentPage.value)
  }
}

const fitWidth = () => {
  if (!viewportContainer.value || !pdfDoc) return
  const containerWidth = viewportContainer.value.clientWidth - 48
  pdfDoc.getPage(currentPage.value).then((page: any) => {
    const defaultViewport = page.getViewport({ scale: 1.0 })
    scale.value = parseFloat((containerWidth / defaultViewport.width).toFixed(2))
    renderPage(currentPage.value)
  })
}

// Text Selection Handling
const handleTextSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    closeToolbar()
    return
  }

  const text = selection.toString().trim()
  if (!text) {
    closeToolbar()
    return
  }

  selectedText.value = text
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  // Calculate Toolbar Position
  const top = Math.max(10, rect.top - 85)
  const left = Math.max(10, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140))

  toolbarPosition.value = { top, left }
  toolbarVisible.value = true
}

const closeToolbar = () => {
  toolbarVisible.value = false
}

const onToolbarSpeak = () => {
  if (selectedText.value) {
    emit('speakText', selectedText.value)
  }
}

const onToolbarTranslate = () => {
  if (selectedText.value) {
    emit('translateText', selectedText.value)
  }
}

const onToolbarAiAction = (action: 'explain' | 'analyze') => {
  if (selectedText.value) {
    emit('aiAction', action, selectedText.value)
  }
}

const onToolbarHighlight = () => {
  // Selection remains highlighted in browser
  closeToolbar()
}

const onToolbarCopy = async () => {
  if (selectedText.value) {
    try {
      await navigator.clipboard.writeText(selectedText.value)
    } catch {}
    closeToolbar()
  }
}

// Keyboard Navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    prevPage()
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
    nextPage()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  await loadDocument()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (currentRenderTask) {
    try { currentRenderTask.cancel() } catch {}
  }
  if (pdfDoc) {
    try { pdfDoc.destroy() } catch {}
  }
})

watch(() => props.pdfBuffer, loadDocument)
</script>

<style>
/* PDF TextLayer Standard Styling */
.textLayer {
  position: absolute;
  text-align: initial;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 1;
  line-height: 1;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 2;
}

.textLayer span {
  color: transparent !important;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

/* Custom Highlight style for selected text */
.textLayer ::selection {
  background: rgba(59, 130, 246, 0.35) !important;
  color: transparent !important;
}

.slider { height: 3px; border-radius: 2px; outline: none; }
.slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
.slider::-moz-range-thumb { width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
</style>
