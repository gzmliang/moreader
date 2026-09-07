<template>
  <transition name="menu-pop">
    <div v-if="visible" ref="menuRef"
         class="fixed top-16 right-16 z-50 w-52 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-200"
         :class="[theme.containerBg || 'bg-white/95 dark:bg-zinc-900/95', theme.borderColor || 'border-zinc-200/80 dark:border-zinc-800/80']"
         @click.stop>
      <div class="px-4 py-3 border-b flex items-center justify-between" :class="theme.borderColor">
        <span class="text-xs font-semibold opacity-70" :class="theme.textColor">{{ t('theme.select') }}</span>
        <span class="text-[11px] opacity-40">{{ t('theme.countSubtitle') }}</span>
      </div>
      <div class="p-2 space-y-1">
        <button
          v-for="t_item in themes"
          :key="t_item.id"
          @click="$emit('select', t_item.id); $emit('close')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
          :class="[currentId === t_item.id ? 'bg-sky-500/15 font-semibold text-sky-600 dark:text-sky-400' : 'hover:bg-black/5 dark:hover:bg-white/5']"
        >
          <div class="w-6 h-6 rounded-full border shadow-inner flex-shrink-0"
               :class="t_item.isDark ? 'border-zinc-600' : 'border-zinc-300'"
               :style="{ backgroundColor: t_item.previewBg }"></div>
          <span class="text-xs flex-1" :class="theme.textColor">{{ t(t_item.name) }}</span>
          <span v-if="currentId === t_item.id" class="text-sky-500 text-xs">✓</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Theme } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  themes: Theme[]
  currentId: string
  theme: Record<string, string>
}>()

const emit = defineEmits(['select', 'close'])
const menuRef = ref<HTMLElement | null>(null)

function handleGlobalClick(e: MouseEvent) {
  if (props.visible && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick, true)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
