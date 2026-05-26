<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-5xl mx-auto px-6 py-8">
      <!-- Hero Section -->
      <div class="text-center mb-10">
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

      <div v-if="isLoading" class="text-center py-8">
        <div class="w-8 h-8 mx-auto mb-3 border-2 rounded-full animate-spin" :class="[theme.borderColor, theme.borderTopColor]"></div>
        <p class="text-sm opacity-60" :class="theme.textColor">{{ t('library.importing') }}</p>
      </div>

      <!-- Batch import progress -->
      <div v-if="batchImporting" class="text-center py-8">
        <div class="w-8 h-8 mx-auto mb-3 border-2 rounded-full animate-spin" :class="[theme.borderColor, theme.borderTopColor]"></div>
        <p class="text-sm font-medium" :class="theme.textColor">{{ t('library.batchImporting', { current: batchCurrent, total: batchTotal }) }}</p>
        <div class="w-48 h-1.5 mx-auto mt-3 rounded-full overflow-hidden" :class="isDark ? 'bg-white/10' : 'bg-black/10'">
          <div class="h-full bg-blue-500 transition-all duration-300 rounded-full" :style="{ width: batchPercent + '%' }"></div>
        </div>
      </div>

      <!-- Book Grid -->
      <div v-if="books.length > 0">
        <h3 class="text-sm font-medium mb-4 opacity-60 flex items-center gap-2" :class="theme.textColor">
          <Library class="w-4 h-4" /> {{ t('library.bookshelf') }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div v-for="book in books" :key="book.id" class="group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]" :class="[theme.bookItemClass, theme.bookItemHoverClass]" @click="$emit('openBook', book.id)">
            <!-- Cover -->
            <div class="aspect-[3/4] relative overflow-hidden" :class="theme.coverBgClass">
              <img v-if="book.cover" :src="book.cover" class="w-full h-full object-cover" :alt="book.title" />
              <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <BookOpen class="w-8 h-8 opacity-20" :class="theme.textColor" />
                <span class="text-xs opacity-30" :class="theme.textColor">EPUB</span>
              </div>
              <!-- Gradient overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
            <!-- Info -->
            <div class="p-3">
              <h4 class="text-sm font-medium truncate" :class="theme.textColor">{{ book.title }}</h4>
              <p class="text-xs opacity-50 mt-0.5 truncate" :class="theme.textColor">{{ book.author }}</p>
            </div>
            <!-- Delete Button -->
            <button @click.stop="$emit('deleteBook', book.id)" class="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Plus, Library, BookOpen, Trash2 } from 'lucide-vue-next'
import type { BookMetadata } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  books: BookMetadata[]
  isLoading: boolean
  isDark: boolean
  theme: Record<string, string>
}>()

const emit = defineEmits(['openBook', 'deleteBook', 'upload', 'batchUpload'])

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
