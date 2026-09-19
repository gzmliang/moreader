<template>
  <div class="h-full flex flex-col min-w-0 select-none" :class="theme.containerClass">
    <!-- Top Bar: Info & Controls -->
    <div class="flex-none px-4 py-2 border-b flex items-center justify-between gap-3 transition-colors" :class="[theme.bookInfoBgClass, theme.borderColor]">
      <!-- Left: Title & Page badge -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-medium truncate max-w-[240px] sm:max-w-md" :class="theme.textColor">{{ title }}</h2>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 uppercase tracking-wider">PDF</span>
          </div>
          <p class="text-xs opacity-60 truncate" :class="theme.textColor">{{ author }}</p>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Zoom & Preset Controls -->
        <div class="flex items-center rounded-lg border p-0.5" :class="[theme.borderColor, isDark ? 'bg-white/5' : 'bg-black/5']">
          <button @click="fitPage" class="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium flex items-center gap-1" :class="theme.textColor" :title="t('pdf.fitPage')">
            <Maximize2 class="w-3.5 h-3.5" />
            <span class="hidden md:inline">{{ t('pdf.fitPage') }}</span>
          </button>
          <button @click="fitWidth" class="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium flex items-center gap-1" :class="theme.textColor" :title="t('pdf.fitWidth')">
            <Minimize2 class="w-3.5 h-3.5" />
            <span class="hidden md:inline">{{ t('pdf.fitWidth') }}</span>
          </button>
          <div class="w-px h-3 bg-current opacity-20 mx-1"></div>
          <button @click="zoomOut" class="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors" :class="theme.textColor" :title="t('pdf.zoomOut')">
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <span class="px-1.5 py-0.5 text-xs font-mono font-medium" :class="theme.textColor">
            {{ Math.round(scale * 100) }}%
          </span>
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

    <!-- Main PDF Viewport (Scrollable & Centered) -->
    <div
      ref="viewportContainer"
      class="flex-1 relative overflow-auto flex items-center justify-center p-4 sm:p-6 transition-colors"
      :class="isDark ? 'bg-neutral-900' : 'bg-neutral-100'"
      @mouseup="handleTextSelection"
      @wheel="handleWheel"
    >
      <!-- Nav Arrows -->
      <button
        @click="prevPage"
        class="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all"
        :class="[currentPage > 1 ? (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-gray-800 hover:bg-gray-50') : 'opacity-20 cursor-not-allowed bg-transparent']"
        :disabled="currentPage <= 1"
        :title="t('reader.prevPage')"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>

      <button
        @click="nextPage"
        class="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all"
        :class="[currentPage < totalPages ? (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-gray-800 hover:bg-gray-50') : 'opacity-20 cursor-not-allowed bg-transparent']"
        :disabled="currentPage >= totalPages"
        :title="t('reader.nextPage')"
      >
        <ChevronRight class="w-5 h-5" />
      </button>

      <!-- PDF Canvas & TextLayer Container -->
      <div
        ref="pageWrapper"
        class="relative shadow-2xl rounded-sm overflow-hidden bg-white select-text transition-transform duration-100 my-auto"
        :style="{ width: `${pageWidth}px`, height: `${pageHeight}px` }"
      >
        <canvas ref="pdfCanvas" class="block w-full h-full"></canvas>
        <div ref="textLayerContainer" class="textLayer absolute inset-0 overflow-hidden leading-none pointer-events-auto"></div>

        <!-- 渲染中遮罩：扫描版大图解码较慢，明确告知用户，避免"白页"误解 -->
        <transition name="pdf-fade">
          <div
            v-if="isRendering"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95"
          >
            <div class="w-9 h-9 rounded-full border-[3px] border-gray-200 border-t-blue-500 animate-spin"></div>
            <span class="text-xs font-medium text-gray-600">{{ t('pdf.rendering', { current: renderingPageLabel }) }}</span>
            <span class="text-[10px] text-gray-400">{{ t('pdf.renderingHint') }}</span>
          </div>
        </transition>

        <!-- Blank page indicator if no text or empty page -->
        <div v-if="isBlankPage" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span class="text-xs font-mono text-gray-500 uppercase tracking-widest">[ Blank Page ]</span>
        </div>
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

    <!-- Bottom Navigation Bar (No Overlap) -->
    <div class="flex-none h-12 border-t flex items-center justify-between px-4 sm:px-6 transition-colors z-30" :class="[theme.progressBgClass, theme.borderColor]">
      <div class="flex items-center gap-2 min-w-[120px]">
        <span class="text-xs font-semibold tracking-wide" :class="theme.textColor">
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
          class="w-14 px-1.5 py-1 text-xs text-center rounded border outline-none font-mono font-medium"
          :class="[theme.borderColor, isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-800']"
        />
        <button
          @click="jumpToPage"
          class="px-2.5 py-1 text-xs font-medium rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          :class="[theme.borderColor, theme.textColor]"
        >
          {{ t('pdf.pageJump') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Sparkles } from 'lucide-vue-next'
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
let prefetchTask: any = null
let prefetchTimer: ReturnType<typeof setTimeout> | null = null
let loadingShowTimer: ReturnType<typeof setTimeout> | null = null
// 渲染序号：每次翻页 +1，旧任务完成后发现序号已变则直接丢弃（彻底修复快速翻页竞态）
let renderSeq = 0

const currentPage = ref(props.initialPage || 1)
const totalPages = ref(1)
const scale = ref(1.0)
const pageWidth = ref(600)
const pageHeight = ref(800)
const jumpInputPage = ref(currentPage.value)
const isBlankPage = ref(false)

// 渲染中状态（延迟 180ms 才显示遮罩，避免快页闪烁）
const isRendering = ref(false)
const renderingPageLabel = ref(currentPage.value)

// ═══ 已渲染页面位图缓存（LRU + 像素预算）═══
// 扫描版大图（JPEG2000）解码 0.8~2s，缓存后可瞬时回看/翻回
const PAGE_CACHE_MAX = 6
const PAGE_CACHE_MAX_PIXELS = 24 * 1000 * 1000 // 约 96MB 位图上限，防止大屏/高 DPI 爆内存
const pageCache = new Map<string, HTMLCanvasElement>()
let cachePixels = 0

const cacheKeyOf = (pageNumber: number, vp: any) =>
  `${pageNumber}:${Math.round(vp.width)}x${Math.round(vp.height)}`

const cachePut = (key: string, canvas: HTMLCanvasElement) => {
  const existing = pageCache.get(key)
  if (existing) {
    cachePixels -= existing.width * existing.height
    pageCache.delete(key)
  }
  pageCache.set(key, canvas)
  cachePixels += canvas.width * canvas.height
  while (pageCache.size > PAGE_CACHE_MAX || cachePixels > PAGE_CACHE_MAX_PIXELS) {
    const oldestKey = pageCache.keys().next().value
    if (oldestKey === undefined) break
    const old = pageCache.get(oldestKey)
    if (old) cachePixels -= old.width * old.height
    pageCache.delete(oldestKey)
  }
}

const clearPageCache = () => {
  pageCache.clear()
  cachePixels = 0
}

/**
 * 判断当前画布是否“真的空白”（空白纸页）
 * 采用对比度（亮度离散度）而非绝对白度判定：
 *  - 扫描书的空白衬页不是纯白，而是带纸纹与透印（约 228 亮度），绝对阈值会漏判；
 *  - 插图页无 OCR 文字但对比度很高，不能被当成空白页。
 * 实测：该书空白衬页 spread=12，插图页 spread=65，正文页 spread≥136。
 */
const isCanvasVisuallyBlank = (): boolean => {
  const canvas = pdfCanvas.value
  if (!canvas || !canvas.width || !canvas.height) return true
  try {
    const N = 32
    const tmp = document.createElement('canvas')
    tmp.width = N
    tmp.height = N
    const c = tmp.getContext('2d', { alpha: false })
    if (!c) return false
    c.drawImage(canvas, 0, 0, N, N)
    const d = c.getImageData(0, 0, N, N).data
    let min = 255
    let max = 0
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3
      if (lum < min) min = lum
      if (lum > max) max = lum
    }
    return max - min < 20
  } catch {
    return false
  }
}

const cancelTask = (t: any) => {
  if (t) {
    try { t.cancel() } catch {}
  }
}

const beginLoading = () => {
  if (loadingShowTimer) { clearTimeout(loadingShowTimer); loadingShowTimer = null }
  loadingShowTimer = setTimeout(() => {
    loadingShowTimer = null
    isRendering.value = true
  }, 180)
}

const endLoading = () => {
  if (loadingShowTimer) { clearTimeout(loadingShowTimer); loadingShowTimer = null }
  isRendering.value = false
}

// Selection Toolbar State
const toolbarVisible = ref(false)
const toolbarPosition = ref({ top: 0, left: 0 })
const selectedText = ref('')

// Load PDF Document
const loadDocument = async () => {
  if (!props.pdfBuffer) return
  try {
    renderSeq++
    cancelTask(currentRenderTask)
    cancelTask(prefetchTask)
    currentRenderTask = null
    prefetchTask = null
    if (prefetchTimer) { clearTimeout(prefetchTimer); prefetchTimer = null }
    clearPageCache()
    if (pdfDoc) { try { pdfDoc.destroy() } catch {} pdfDoc = null }

    const loadingTask = pdfjsLib.getDocument({ data: props.pdfBuffer })
    pdfDoc = await loadingTask.promise
    totalPages.value = pdfDoc.numPages

    await nextTick()
    // 默认自适应整页高度与宽度，保证书本完全呈现在屏幕中央，不削头砍脚
    await fitPage()
  } catch (err) {
    console.error('Failed to load PDF in PdfReaderView:', err)
    endLoading()
  }
}

// 把已缓存的位图直接绘制到主 canvas（瞬时显示）
const paintFromCache = (src: HTMLCanvasElement, w: number, h: number) => {
  const canvas = pdfCanvas.value
  if (!canvas) return
  canvas.width = src.width
  canvas.height = src.height
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d', { alpha: false })
  if (ctx) ctx.drawImage(src, 0, 0)
}

// 真正执行 pdfjs 渲染到主 canvas
const renderToMainCanvas = async (page: any, viewport: any, w: number, h: number): Promise<boolean> => {
  const canvas = pdfCanvas.value
  if (!canvas) return false
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return false
  // 先铺白底，避免解码期间残留上页内容
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
  const task = page.render({ canvasContext: ctx, viewport, transform: transform || undefined })
  currentRenderTask = task
  await task.promise
  return true
}

// 渲染文字层（选词/高亮），耗时极短
const renderTextLayer = async (textContent: any, viewport: any) => {
  const tl = textLayerContainer.value
  if (!tl) return
  tl.innerHTML = ''
  tl.style.width = `${Math.floor(viewport.width)}px`
  tl.style.height = `${Math.floor(viewport.height)}px`
  tl.style.setProperty('--scale-factor', `${scale.value}`)
  const textLayer = new (pdfjsLib as any).TextLayer({
    textContentSource: textContent,
    container: tl,
    viewport
  })
  await textLayer.render()
}

// Render Single Page
const renderPage = async (pageNumber: number) => {
  if (!pdfDoc) return
  if (pageNumber < 1 || pageNumber > totalPages.value) return

  const mySeq = ++renderSeq
  renderingPageLabel.value = pageNumber

  // 取消一切进行中的渲染/预渲染，避免互相抢 worker
  cancelTask(currentRenderTask); currentRenderTask = null
  cancelTask(prefetchTask); prefetchTask = null
  if (prefetchTimer) { clearTimeout(prefetchTimer); prefetchTimer = null }

  beginLoading()
  closeToolbar()
  // 立即清空旧页文字层，避免旧内容与新页错位
  if (textLayerContainer.value) textLayerContainer.value.innerHTML = ''

  try {
    const page = await pdfDoc.getPage(pageNumber)
    if (mySeq !== renderSeq) return

    const viewport = page.getViewport({ scale: scale.value })
    const w = Math.floor(viewport.width)
    const h = Math.floor(viewport.height)
    pageWidth.value = w
    pageHeight.value = h

    const key = cacheKeyOf(pageNumber, viewport)
    const cached = pageCache.get(key)

    if (cached) {
      // 命中缓存：瞬时呈现，无需等待解码
      paintFromCache(cached, w, h)
    } else {
      await renderToMainCanvas(page, viewport, w, h)
      if (mySeq !== renderSeq) return
      // 存入缓存（拷贝一份，因为主 canvas 会被下一页覆盖）
      if (pdfCanvas.value) {
        const snap = document.createElement('canvas')
        snap.width = pdfCanvas.value.width
        snap.height = pdfCanvas.value.height
        const sctx = snap.getContext('2d')
        if (sctx) {
          sctx.drawImage(pdfCanvas.value, 0, 0)
          cachePut(key, snap)
        }
      }
    }

    // Render TextLayer for Selection & Highlighting
    const textContent = await page.getTextContent()
    if (mySeq !== renderSeq) return
    isBlankPage.value = textContent.items.length === 0 && isCanvasVisuallyBlank()
    await renderTextLayer(textContent, viewport)
    if (mySeq !== renderSeq) return

    emit('pageChange', pageNumber, totalPages.value)
    jumpInputPage.value = pageNumber
    endLoading()
    schedulePrefetch()
  } catch (err: any) {
    if (mySeq !== renderSeq) return
    if (err?.name !== 'RenderingCancelledException') {
      console.error(`Failed to render PDF page ${pageNumber}:`, err)
    }
    endLoading()
  }
}

// ═══ 后台预渲染相邻页：翻页时直接命中缓存，视觉上"秒开" ═══
const schedulePrefetch = () => {
  if (prefetchTimer) clearTimeout(prefetchTimer)
  const seq = renderSeq
  prefetchTimer = setTimeout(() => {
    prefetchTimer = null
    void prefetchAround(seq)
  }, 260)
}

const prefetchAround = async (seq: number) => {
  if (!pdfDoc) return
  const from = currentPage.value
  for (const p of [from + 1, from - 1]) {
    if (seq !== renderSeq) return
    if (p < 1 || p > totalPages.value) continue
    await prefetchPage(p, seq)
  }
}

const prefetchPage = async (pageNumber: number, seq: number) => {
  if (!pdfDoc) return
  try {
    const page = await pdfDoc.getPage(pageNumber)
    if (seq !== renderSeq) return
    const viewport = page.getViewport({ scale: scale.value })
    const key = cacheKeyOf(pageNumber, viewport)
    if (pageCache.has(key)) return

    const dpr = window.devicePixelRatio || 1
    const off = document.createElement('canvas')
    off.width = Math.floor(viewport.width * dpr)
    off.height = Math.floor(viewport.height * dpr)
    const ctx = off.getContext('2d', { alpha: false })
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, off.width, off.height)
    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
    const task = page.render({ canvasContext: ctx, viewport, transform: transform || undefined })
    prefetchTask = task
    await task.promise
    prefetchTask = null
    if (seq !== renderSeq) return
    cachePut(key, off)
  } catch {
    prefetchTask = null
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
    scale.value = parseFloat((scale.value + 0.15).toFixed(2))
    renderPage(currentPage.value)
  }
}

const zoomOut = () => {
  if (scale.value > 0.4) {
    scale.value = parseFloat((scale.value - 0.15).toFixed(2))
    renderPage(currentPage.value)
  }
}

/**
 * 适应页面高度与宽度（整页四边完整居中，绝不削头砍脚）
 */
const fitPage = async () => {
  if (!viewportContainer.value || !pdfDoc) return
  const availW = Math.max(300, viewportContainer.value.clientWidth - 48)
  const availH = Math.max(400, viewportContainer.value.clientHeight - 32)
  try {
    const page = await pdfDoc.getPage(currentPage.value)
    const baseVp = page.getViewport({ scale: 1.0 })
    const scaleW = availW / baseVp.width
    const scaleH = availH / baseVp.height
    scale.value = parseFloat(Math.min(scaleW, scaleH, 1.8).toFixed(2))
    await renderPage(currentPage.value)
  } catch {}
}

/**
 * 适应宽度
 */
const fitWidth = async () => {
  if (!viewportContainer.value || !pdfDoc) return
  const availW = Math.max(300, viewportContainer.value.clientWidth - 48)
  try {
    const page = await pdfDoc.getPage(currentPage.value)
    const baseVp = page.getViewport({ scale: 1.0 })
    scale.value = parseFloat((availW / baseVp.width).toFixed(2))
    await renderPage(currentPage.value)
  } catch {}
}

// 滚轮平滑翻页
let wheelTimer: ReturnType<typeof setTimeout> | null = null
const handleWheel = (e: WheelEvent) => {
  if (Math.abs(e.deltaY) < 40) return
  if (wheelTimer) return

  if (e.deltaY > 0) {
    // 仅在已滚动到底部时翻下一页
    const el = viewportContainer.value
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      wheelTimer = setTimeout(() => { wheelTimer = null }, 350)
      nextPage()
    }
  } else if (e.deltaY < 0) {
    // 仅在已滚动到顶部时翻上一页
    const el = viewportContainer.value
    if (el && el.scrollTop <= 10) {
      wheelTimer = setTimeout(() => { wheelTimer = null }, 350)
      prevPage()
    }
  }
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

// Window resize auto fit（防抖，避免拖动窗口时反复重渲染）
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    fitPage()
  }, 250)
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
  await loadDocument()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
  renderSeq++
  if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = null }
  if (prefetchTimer) { clearTimeout(prefetchTimer); prefetchTimer = null }
  if (loadingShowTimer) { clearTimeout(loadingShowTimer); loadingShowTimer = null }
  cancelTask(currentRenderTask); currentRenderTask = null
  cancelTask(prefetchTask); prefetchTask = null
  clearPageCache()
  if (pdfDoc) {
    try { pdfDoc.destroy() } catch {}
    pdfDoc = null
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
  overflow: hidden;
  opacity: 1;
  line-height: 1;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 2;
}

.textLayer span,
.textLayer br {
  color: transparent !important;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.textLayer ::selection {
  background: rgba(59, 130, 246, 0.35) !important;
  color: transparent !important;
}

.slider { height: 3px; border-radius: 2px; outline: none; }

/* 渲染遮罩渐隐 */
.pdf-fade-enter-active, .pdf-fade-leave-active { transition: opacity 0.18s ease; }
.pdf-fade-enter-from, .pdf-fade-leave-to { opacity: 0; }
.slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
.slider::-moz-range-thumb { width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
</style>
