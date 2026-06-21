<template>
  <transition name="fade">
    <div v-if="visible" class="fixed top-14 right-36 mt-1 w-80 max-h-96 rounded-lg border shadow-xl overflow-hidden z-50 flex flex-col" :class="[theme.menuBgClass, theme.borderColor]">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 border-b" :class="[theme.borderColor, theme.textColor]">
        <span class="text-sm font-medium flex items-center gap-1.5">⭐ {{ t('bookmark.title') }} ({{ items.length }})</span>
        <button @click="$emit('close')" class="p-1 rounded hover:bg-black/10 transition-colors"><X class="w-3.5 h-3.5" /></button>
      </div>
      <!-- List -->
      <div v-if="items.length === 0" class="flex-1 flex items-center justify-center py-8 opacity-60 text-sm" :class="theme.textColor">
        {{ t('bookmark.empty') }}
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <div v-for="bm in items" :key="bm.id"
          class="flex items-start gap-2 px-3 py-2.5 hover:bg-black/5 cursor-pointer border-b border-current/5 transition-colors group"
          :class="theme.textColor" @click="$emit('navigate', bm.cfi, bm.id)">

          <span class="text-base flex-shrink-0 mt-0.5">⭐</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs leading-relaxed line-clamp-2 opacity-80">{{ bm.text }}</p>
            <p class="text-xs mt-1 opacity-40 flex items-center gap-2">
              <span v-if="bm.chapterHint" class="truncate">{{ bm.chapterHint }}</span>
              <span>{{ formatTime(bm.createdAt) }}</span>
            </p>
          </div>
          <button @click.stop="$emit('delete', bm.id)" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all text-red-400 text-xs" :title="t('bookmark.remove')">
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import type { Bookmark } from '@/types/book'

const { t } = useI18n()

defineProps<{
  visible: boolean
  items: Bookmark[]
  theme: Record<string, string>
}>()

defineEmits<{
  close: []
  navigate: [cfi: string, id: string]
  delete: [id: string]
}>()

const formatTime = (ts: number) => {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>
