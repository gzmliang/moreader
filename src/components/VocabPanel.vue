<template>
  <transition name="fade">
    <div v-if="visible" class="fixed top-14 right-52 mt-1 w-80 max-h-96 rounded-lg border shadow-xl overflow-hidden z-50 flex flex-col" :class="[theme.menuBgClass, theme.borderColor]">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 border-b" :class="[theme.borderColor, theme.textColor]">
        <span class="text-sm font-medium flex items-center gap-1.5">📖 {{ t('vocab.title') }} ({{ items.length }})</span>
        <button @click="$emit('close')" class="p-1 rounded hover:bg-black/10 transition-colors"><X class="w-3.5 h-3.5" /></button>
      </div>
      <!-- List -->
      <div v-if="items.length === 0" class="flex-1 flex items-center justify-center py-8 opacity-60 text-sm" :class="theme.textColor">
        {{ t('vocab.empty') }}
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <div v-for="vw in items" :key="vw.id"
          class="flex items-start gap-2 px-3 py-2.5 hover:bg-black/5 cursor-pointer border-b border-current/5 transition-colors group"
          :class="theme.textColor" @click="vw.cfi && $emit('navigate', vw.cfi)">

          <span class="flex-shrink-0 mt-0.5 text-sm">📝</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ vw.word }}</p>
            <p v-if="vw.definition" class="text-xs mt-0.5 opacity-80">{{ vw.definition }}</p>
            <p class="text-xs mt-0.5 opacity-50 italic truncate">「{{ vw.context }}」</p>
            <p class="text-xs mt-0.5 opacity-40">{{ formatTime(vw.createdAt) }}</p>
          </div>
          <button @click.stop="$emit('delete', vw.id)" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all text-red-400 text-xs" :title="t('vocab.remove')">
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
import type { VocabWord } from '@/types/book'

const { t } = useI18n()

defineProps<{
  visible: boolean
  items: VocabWord[]
  theme: Record<string, string>
}>()

defineEmits<{
  close: []
  navigate: [cfi: string]
  delete: [id: string]
}>()

const formatTime = (ts: number) => {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>
