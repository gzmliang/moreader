<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed z-[100] flex flex-col gap-2 p-2.5 rounded-xl shadow-2xl border min-w-[260px] max-w-[340px] selection-toolbar"
      :class="[theme.menuBgClass, theme.borderColor]"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      @mousedown.stop
    >
      <!-- Core Language Intelligence Actions -->
      <div class="flex items-center gap-1.5">
        <button
          @click="$emit('translate')"
          class="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-all flex items-center justify-center gap-1"
          :title="t('selection.translate')"
        >
          <span class="text-xs">🌐</span>
          <span>{{ t('selection.translate') }}</span>
        </button>
        <button
          @click="$emit('aiAction', 'explain')"
          class="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all flex items-center justify-center gap-1"
          :title="t('selection.aiExplain')"
        >
          <span class="text-xs">📖</span>
          <span>{{ t('selection.aiExplain') }}</span>
        </button>
        <button
          @click="$emit('aiAction', 'analyze')"
          class="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-1"
          :title="t('selection.aiAnalyze')"
        >
          <span class="text-xs">🔍</span>
          <span>{{ t('selection.aiAnalyze') }}</span>
        </button>
      </div>

      <div class="w-full h-px bg-current opacity-10 my-0.5"></div>

      <!-- Quick Action Utilities -->
      <div class="flex items-center gap-1.5">
        <button
          @click="$emit('highlight')"
          class="flex-1 px-2 py-1 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
          :class="theme.textColor"
        >
          <span>🖍️</span>
          <span>{{ t('highlight.add') }}</span>
        </button>
        <button
          @click="$emit('speak')"
          class="flex-1 px-2 py-1 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
          :class="theme.textColor"
        >
          <span>🔊</span>
          <span>{{ t('selection.speak') }}</span>
        </button>
        <button
          @click="$emit('copy')"
          class="flex-1 px-2 py-1 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
          :class="theme.textColor"
        >
          <span>📋</span>
          <span>{{ t('selection.copy') }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  visible: boolean
  position: { top: number; left: number }
  theme: Record<string, string>
}>()

defineEmits(['translate', 'aiAction', 'highlight', 'speak', 'copy'])
</script>
