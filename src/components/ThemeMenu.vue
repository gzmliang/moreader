<template>
  <transition name="fade">
    <div v-if="visible" class="absolute top-14 right-4 z-50 w-48 rounded-lg border shadow-lg overflow-hidden" :class="[theme.menuBgClass, theme.borderColor]">
      <div class="p-3 border-b" :class="theme.borderColor">
        <span class="text-xs font-medium opacity-60" :class="theme.textColor">{{ t('theme.select') }}</span>
      </div>
      <div class="p-2 space-y-1">
        <button
          v-for="t_item in themes"
          :key="t_item.id"
          @click="$emit('select', t_item.id)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded transition-colors"
          :class="[currentId === t_item.id ? theme.activeButtonClass : 'hover:bg-black/5']"
        >
          <div class="w-6 h-6 rounded border flex-shrink-0" :class="t_item.isDark ? 'border-gray-600' : 'border-gray-300'" :style="{ backgroundColor: t_item.previewBg }"></div>
          <span class="text-sm" :class="theme.textColor">{{ t(t_item.name) }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { Theme } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  visible: boolean
  themes: Theme[]
  currentId: string
  theme: Record<string, string>
}>()

defineEmits(['select'])
</script>
