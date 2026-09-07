<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-5xl mx-auto px-6 py-8">
      <!-- Tab Bar -->
      <div class="flex gap-1 mb-4 p-1 rounded-xl" :class="isDark ? 'bg-white/5' : 'bg-black/5'">
        <button @click="activeTab = 'local'"
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          :class="activeTab === 'local'
            ? (isDark ? 'bg-white/15 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm')
            : (isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')">
          📚 {{ t('library.localBookshelf') }} ({{ books.length }})
        </button>
        <button v-if="syncStore.isLoggedIn" @click="switchToCloud"
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          :class="activeTab === 'cloud'
            ? (isDark ? 'bg-white/15 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm')
            : (isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')">
          ☁️ {{ t('library.cloudBookshelf') }} ({{ cloudCount }})
        </button>
      </div>

      <!-- Search Bar -->
      <div class="relative mb-6">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" :class="theme.textColor" />
        <input v-model="searchQuery" type="text"
          :placeholder="activeTab === 'local' ? t('library.searchLocal') : t('library.searchCloud')"
          class="w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm outline-none transition-colors"
          :class="[theme.borderColor, theme.inputBg || (isDark ? 'bg-white/5' : 'bg-black/5'), theme.textColor]"
          @input="onSearchInput" />
        <button v-if="searchQuery" @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center opacity-40 hover:opacity-80 text-xs"
          :class="isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'">✕</button>
      </div>

      <!-- ====== 本地书架 ====== -->
      <template v-if="activeTab === 'local'">
        <!-- Hero / Upload Section (hide when searching) -->
        <div v-if="!searchQuery" class="text-center mb-10">
          <div class="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors shadow-lg" :class="theme.uploadIconBgClass">
            <Upload class="w-10 h-10 opacity-50" :class="theme.textColor" />
          </div>
          <h2 class="text-2xl font-bold mb-2" :class="theme.textColor">{{ t('app.title') }}</h2>
          <p class="text-sm mb-6 opacity-60" :class="theme.textColor">{{ t('app.subtitle') }}</p>
          <label class="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-105" :class="theme.uploadButtonClass">
            <Plus class="w-5 h-5" />
            <span class="text-sm font-semibold">{{ t('library.openBook') }}</span>
            <input ref="fileInput" type="file" accept=".epub,application/epub+zip" class="hidden" multiple @change="onFileChange" :disabled="isLoading || batchImporting" />
          </label>
          <p v-if="!batchImporting" class="text-xs mt-2 opacity-40" :class="theme.textColor">{{ t('library.batchHint') }}</p>
        </div>

        <div v-if="isLoading || batchImporting" class="text-center py-8">
          <div class="w-8 h-8 mx-auto mb-3 border-2 rounded-full animate-spin" :class="[theme.borderColor, theme.borderTopColor]"></div>
          <p class="text-sm opacity-60" :class="theme.textColor">
            {{ batchImporting ? t('library.batchImporting', { current: batchCurrent, total: batchTotal }) : t('library.importing') }}
          </p>
          <div v-if="batchImporting" class="w-48 h-1.5 mx-auto mt-3 rounded-full overflow-hidden" :class="isDark ? 'bg-white/10' : 'bg-black/10'">
            <div class="h-full bg-blue-500 transition-all duration-300 rounded-full" :style="{ width: batchPercent + '%' }"></div>
          </div>
        </div>

        <!-- Book Grid -->
        <div v-if="filteredLocalBooks.length > 0">
          <h3 v-if="searchQuery" class="text-sm font-medium mb-4 opacity-60" :class="theme.textColor">
            {{ t('library.searchResultsCount', { query: searchQuery, count: filteredLocalBooks.length }) }}
          </h3>
          <h3 v-else class="text-sm font-medium mb-4 opacity-60 flex items-center gap-2" :class="theme.textColor">
            <Library class="w-4 h-4" /> {{ t('library.bookshelf') }}
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="book in filteredLocalBooks" :key="book.id"
              class="group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]"
              :class="[theme.bookItemClass, theme.bookItemHoverClass]"
              @click="$emit('openBook', book.id)">
              <!-- Cover -->
              <div class="aspect-[3/4] relative overflow-hidden" :class="theme.coverBgClass">
                <img v-if="book.cover" :src="book.cover" class="w-full h-full object-cover" :alt="book.title" />
                <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <BookOpen class="w-8 h-8 opacity-20" :class="theme.textColor" />
                  <span class="text-xs opacity-30" :class="theme.textColor">EPUB</span>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
              <!-- Info -->
              <div class="p-3">
                <h4 class="text-sm font-medium truncate" :class="theme.textColor">{{ book.title }}</h4>
                <p class="text-xs opacity-50 mt-0.5 truncate" :class="theme.textColor">{{ book.author }}</p>
              </div>
              <!-- Upload to Cloud Button (hover) -->
              <button v-if="syncStore.isLoggedIn"
                @click.stop="handleUploadToCloud(book.id)"
                :disabled="syncStore.uploadingBookId === book.id"
                class="absolute top-2 left-2 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                :class="syncStore.uploadingBookId === book.id ? 'bg-blue-500/80' : 'bg-sky-500/80 hover:bg-sky-600'"
                :title="t('library.uploadToCloud')">
                <CloudUpload v-if="syncStore.uploadingBookId !== book.id" class="w-3.5 h-3.5" />
                <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
              </button>
              <!-- Delete Button -->
              <button @click.stop="$emit('deleteBook', book.id)"
                class="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!isLoading && filteredLocalBooks.length === 0 && books.length > 0" class="text-center py-12">
          <p class="text-sm opacity-40" :class="theme.textColor">{{ t('library.noMatchingBooks', { query: searchQuery }) }}</p>
        </div>
        <div v-else-if="!isLoading && books.length === 0" class="text-center py-12">
          <p class="text-sm opacity-40" :class="theme.textColor">{{ t('library.emptyHint') }}</p>
        </div>
      </template>

      <!-- ====== 云书架 ====== -->
      <template v-else>
        <!-- Loading -->
        <div v-if="syncStore.loadingCloud" class="text-center py-8">
          <div class="w-8 h-8 mx-auto mb-3 border-2 rounded-full animate-spin" :class="[theme.borderColor, theme.borderTopColor]"></div>
          <p class="text-sm opacity-60" :class="theme.textColor">{{ t('library.loadingCloud') }}</p>
        </div>

        <!-- Cloud Book Grid -->
        <div v-else-if="filteredCloudBooks.length > 0">
          <h3 v-if="searchQuery" class="text-sm font-medium mb-4 opacity-60" :class="theme.textColor">
            {{ t('library.searchResultsCount', { query: searchQuery, count: filteredCloudBooks.length }) }}
          </h3>
          <h3 v-else class="text-sm font-medium mb-4 opacity-60 flex items-center gap-2" :class="theme.textColor">
            <Cloud class="w-4 h-4" /> {{ t('library.cloudBookshelf') }} ({{ syncStore.cloudBooks.length }})
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="cb in filteredCloudBooks" :key="cb.id"
              class="group relative rounded-xl overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              :class="[theme.bookItemClass, theme.bookItemHoverClass]">
              <!-- Cloud Cover -->
              <div class="aspect-[3/4] relative overflow-hidden flex items-center justify-center" :class="theme.coverBgClass">
                <Cloud class="w-12 h-12 opacity-15" :class="theme.textColor" />
                <!-- Download Button -->
                <button @click="handleDownload(cb)"
                  :disabled="syncStore.downloadingBookId === cb.id || isLocalBook(cb.title)"
                  class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  :title="isLocalBook(cb.title) ? t('library.alreadyLocal') : t('library.downloadFromCloud')">
                  <div class="flex flex-col items-center gap-1">
                    <Download v-if="!isLocalBook(cb.title) && syncStore.downloadingBookId !== cb.id" class="w-6 h-6 text-white" />
                    <Loader2 v-else-if="syncStore.downloadingBookId === cb.id" class="w-6 h-6 text-white animate-spin" />
                    <Check v-else class="w-6 h-6 text-green-400" />
                    <span class="text-xs text-white font-medium">
                      {{ isLocalBook(cb.title) ? t('library.alreadyLocal') : syncStore.downloadingBookId === cb.id ? t('library.downloading') : t('library.downloadFromCloud') }}
                    </span>
                  </div>
                </button>
              </div>
              <!-- Info -->
              <div class="p-3">
                <h4 class="text-sm font-medium truncate" :class="theme.textColor">{{ cb.title }}</h4>
                <p class="text-xs opacity-50 mt-0.5 truncate" :class="theme.textColor">{{ cb.author }}</p>
                <p class="text-[10px] opacity-30 mt-0.5" :class="theme.textColor">{{ formatSize(cb.file_size) }}</p>
              </div>
              <!-- Delete from Cloud Button -->
              <button @click.stop="handleDeleteCloud(cb)"
                class="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                :title="t('library.deleteFromCloud')">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Cloud Empty -->
        <div v-else-if="!syncStore.loadingCloud && filteredCloudBooks.length === 0 && syncStore.cloudBooks.length > 0" class="text-center py-12">
          <p class="text-sm opacity-40" :class="theme.textColor">{{ t('library.noMatchingBooks', { query: searchQuery }) }}</p>
        </div>
        <div v-else-if="!syncStore.loadingCloud" class="text-center py-12">
          <p class="text-sm opacity-40" :class="theme.textColor">{{ t('library.cloudEmpty') }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Plus, Library, BookOpen, Trash2, Cloud, CloudUpload, Download, Check, Loader2, Search } from 'lucide-vue-next'
import type { BookMetadata } from '@/types/book'
import type { CloudBook } from '@/stores/syncStore'
import { useI18n } from '@/i18n'
import { useSyncStore } from '@/stores/syncStore'

const { t } = useI18n()
const syncStore = useSyncStore()

const props = defineProps<{
  books: BookMetadata[]
  isLoading: boolean
  isDark: boolean
  theme: Record<string, string>
}>()

const emit = defineEmits(['openBook', 'deleteBook', 'upload', 'batchUpload'])

const activeTab = ref<'local' | 'cloud'>('local')
const searchQuery = ref('')

const cloudCount = computed(() => syncStore.cloudBooks.length)

// ═══ 搜索过滤 ═══
const queryLower = computed(() => searchQuery.value.trim().toLowerCase())

const filteredLocalBooks = computed(() => {
  const q = queryLower.value
  if (!q) return props.books
  return props.books.filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q)
  )
})

const filteredCloudBooks = computed(() => {
  const q = queryLower.value
  if (!q) return syncStore.cloudBooks
  return syncStore.cloudBooks.filter(cb =>
    cb.title.toLowerCase().includes(q) ||
    cb.author.toLowerCase().includes(q)
  )
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  // 搜索时不清空，只做响应式
}

function isLocalBook(title: string): boolean {
  return props.books.some(b => b.title === title)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function switchToCloud() {
  activeTab.value = 'cloud'
  if (syncStore.cloudBooks.length === 0) {
    try { await syncStore.listCloudBooks() }
    catch (e) { /* error shown in UI */ }
  }
}

async function handleUploadToCloud(bookId: string) {
  try {
    await syncStore.uploadBook(bookId)
    syncStore.syncResult = t('library.uploadSuccess')
    setTimeout(() => { if (syncStore.syncResult === t('library.uploadSuccess')) syncStore.syncResult = null }, 3000)
  } catch (e: any) {
    syncStore.syncResult = t('library.uploadFailed', { error: e.message })
    setTimeout(() => { if (syncStore.syncResult?.startsWith(t('library.uploadFailed', { error: '' }))) syncStore.syncResult = null }, 4000)
  }
}

async function handleDownload(cb: CloudBook) {
  try {
    await syncStore.downloadBook(cb)
    syncStore.syncResult = t('library.downloadSuccess')
    setTimeout(() => { if (syncStore.syncResult === t('library.downloadSuccess')) syncStore.syncResult = null }, 3000)
  } catch (e: any) {
    syncStore.syncResult = t('library.downloadFailed', { error: e.message })
    setTimeout(() => { if (syncStore.syncResult?.startsWith(t('library.downloadFailed', { error: '' }))) syncStore.syncResult = null }, 4000)
  }
}

async function handleDeleteCloud(cb: CloudBook) {
  if (!confirm(t('library.confirmDeleteCloud', { title: cb.title }))) return
  try {
    await syncStore.deleteCloudBook(cb.id)
    syncStore.syncResult = t('library.deleteSuccess')
    setTimeout(() => { if (syncStore.syncResult === t('library.deleteSuccess')) syncStore.syncResult = null }, 3000)
  } catch (e: any) {
    syncStore.syncResult = t('library.deleteFailed', { error: e.message })
  }
}

// ═══ 原有文件导入逻辑 ═══

const fileInput = ref<HTMLInputElement | null>(null)
const batchImporting = ref(false)
const batchCurrent = ref(0)
const batchTotal = ref(0)
const batchPercent = computed(() => batchTotal.value > 0 ? Math.round((batchCurrent.value / batchTotal.value) * 100) : 0)

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  if (files.length === 1) {
    emit('upload', files[0])
  } else {
    emit('batchUpload', Array.from(files))
  }

  if (fileInput.value) fileInput.value.value = ''
}

const startBatch = (total: number) => {
  batchImporting.value = true
  batchTotal.value = total
  batchCurrent.value = 0
}

const updateBatchProgress = (current: number) => {
  batchCurrent.value = current
}

const endBatch = () => {
  batchImporting.value = false
  batchCurrent.value = 0
  batchTotal.value = 0
}

defineExpose({ startBatch, updateBatchProgress, endBatch })
</script>
