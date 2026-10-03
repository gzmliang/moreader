<template>
  <transition name="fade">
    <div v-if="visible" ref="menuRef"
         class="fixed z-50 w-48 rounded-lg border shadow-xl overflow-hidden transition-colors"
         :style="menuStyle"
         :class="[theme.menuBgClass, theme.borderColor]"
         @click.stop>
      <div class="px-3.5 py-2.5 border-b flex items-center justify-between" :class="theme.borderColor">
        <span class="text-xs font-semibold opacity-75" :class="theme.textColor">{{ t('theme.select') }}</span>
      </div>
      <div class="p-1.5 space-y-1">
        <button
          v-for="t_item in themes"
          :key="t_item.id"
          @click="$emit('select', t_item.id); $emit('close')"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
          :class="[currentId === t_item.id ? theme.activeButtonClass : theme.buttonHoverClass]"
        >
          <div class="w-5 h-5 rounded border flex-shrink-0 shadow-sm"
               :class="t_item.isDark ? 'border-gray-600' : 'border-gray-300'"
               :style="{ backgroundColor: t_item.previewBg }"></div>
          <span class="text-xs font-medium flex-1" :class="theme.textColor">{{ t(t_item.name) }}</span>
          <span v-if="currentId === t_item.id" class="text-xs font-bold text-sky-500">✓</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
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
const menuStyle = ref<{ top?: string; left?: string; right?: string }>({ top: '3.5rem', right: '4rem' })

function updatePosition() {
  const btn = document.getElementById('moreader-palette-btn')
  if (btn) {
    const rect = btn.getBoundingClientRect()
    const menuWidth = 192 // w-48 = 12rem = 192px
    let left = rect.left + rect.width / 2 - menuWidth / 2
    left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10))
    menuStyle.value = {
      top: `${rect.bottom + 6}px`,
      left: `${left}px`,
    }
  } else {
    menuStyle.value = { top: '3.5rem', right: '4rem' }
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(updatePosition)
  }
})

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
  updatePosition()
  window.addEventListener('resize', updatePosition)
  document.addEventListener('click', handleGlobalClick, true)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('click', handleGlobalClick, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
