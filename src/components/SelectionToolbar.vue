<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed z-[100] flex flex-col gap-2 p-3 rounded-lg shadow-xl border min-w-[220px]"
      :class="[theme.menuBgClass, theme.borderColor]"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      @mousedown.stop
    >
      <!-- Dictionary -->
      <div class="flex items-center gap-2">
        <span class="text-xs opacity-60 whitespace-nowrap" :class="theme.textColor">{{ t('selection.dictionary') }}:</span>
        <button @click="$emit('lookup', 'youdao')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor" :title="t('selection.youdao')">{{ t('selection.youdao') }}</button>
        <button @click="$emit('lookup', 'cambridge')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor" :title="t('selection.cambridge')">{{ t('selection.cambridge') }}</button>
        <button @click="$emit('lookup', 'oxford')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor" :title="t('selection.oxford')">{{ t('selection.oxford') }}</button>
      </div>
      <!-- Translate - popup mode -->
      <div class="flex items-center gap-2">
        <span class="text-xs opacity-60 whitespace-nowrap" :class="theme.textColor">{{ t('selection.translate') }}:</span>
        <button @click="$emit('extTranslate', 'google')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor">Google</button>
        <button @click="$emit('extTranslate', 'youdao')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor">{{ t('selection.youdao') }}</button>
        <button @click="$emit('extTranslate', 'baidu')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor">{{ t('selection.baidu') }}</button>
        <button @click="$emit('extTranslate', 'deepl')" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="theme.textColor">DeepL</button>
      </div>
      <!-- AI Translate - 3 modes -->
      <div class="flex items-center gap-2">
        <button @click="$emit('aiTranslate', 'translate')" class="flex-1 px-2 py-1.5 text-xs rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1 text-blue-500">
          <span class="text-xs">🤖</span> {{ t('selection.aiTranslate') }}
        </button>
        <button @click="$emit('aiTranslate', 'explain')" class="flex-1 px-2 py-1.5 text-xs rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-1 text-purple-500">
          <span class="text-xs">📖</span> {{ t('selection.aiExplain') }}
        </button>
        <button @click="$emit('aiTranslate', 'analyze')" class="flex-1 px-2 py-1.5 text-xs rounded bg-green-500/10 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1 text-green-500">
          <span class="text-xs">🔍</span> {{ t('selection.aiAnalyze') }}
        </button>
      </div>
      <div class="w-full h-px bg-current opacity-20 my-1"></div>
      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button @click="$emit('highlight')" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="theme.textColor"><span>🖍️</span> {{ t('highlight.add') }}</button>
        <button @click="$emit('speak')" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="theme.textColor"><span>🔊</span> {{ t('selection.speak') }}</button>
        <button @click="$emit('copy')" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="theme.textColor"><span>📋</span> {{ t('selection.copy') }}</button>
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

defineEmits(['lookup', 'extTranslate', 'aiTranslate', 'highlight', 'speak', 'copy'])
</script>
