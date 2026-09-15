<template>
  <transition name="pop-bubble">
    <div
      v-if="visible"
      class="fixed z-[130] rounded-2xl shadow-2xl border p-4 flex flex-col transition-all duration-200 backdrop-blur-md"
      :class="[theme.menuBgClass || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']"
      :style="modalStyle"
    >
      <!-- 顶栏：标题与关闭按钮 -->
      <div class="flex items-center justify-between pb-2.5 border-b" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <div class="flex items-center gap-2">
          <span class="text-base">📖</span>
          <span class="text-sm font-bold tracking-wide" :class="theme.textColor">
            {{ t('footnote.title') }}
          </span>
        </div>
        <button
          @click="$emit('close')"
          class="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          :class="theme.textColor"
          :title="t('footnote.dismiss')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 内容区：可滚动正文 -->
      <div class="py-2.5 px-1 max-h-48 overflow-y-auto leading-relaxed text-sm opacity-90 break-words select-text" :class="theme.textColor">
        {{ text }}
      </div>

      <!-- 底栏按钮群 -->
      <div class="pt-2 flex items-center justify-end gap-2 border-t" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <button
          @click="$emit('close')"
          class="px-3 py-1.5 text-xs rounded-lg font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          :class="theme.textColor"
        >
          {{ t('footnote.dismiss') }}
        </button>
        <button
          v-if="targetHref"
          @click="$emit('goTo', targetHref)"
          class="px-3.5 py-1.5 text-xs rounded-lg font-medium bg-blue-500 hover:bg-blue-600 active:scale-95 text-white shadow-sm transition-all flex items-center gap-1"
        >
          <span>↗</span>
          <span>{{ t('footnote.goTo') }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  text: string
  targetHref: string
  theme: any
  position?: { x: number; y: number; placement: 'top' | 'bottom' } | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'goTo', href: string): void
}>()

const { t } = useI18n()

const modalStyle = computed(() => {
  if (!props.position) {
    return {
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '420px',
      maxWidth: '92vw',
    }
  }

  const modalWidth = Math.min(420, typeof window !== 'undefined' ? window.innerWidth * 0.9 : 420)
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768

  let left = props.position.x - modalWidth / 2
  const padding = 16
  if (left < padding) left = padding
  if (left + modalWidth > screenWidth - padding) {
    left = Math.max(padding, screenWidth - modalWidth - padding)
  }

  if (props.position.placement === 'top') {
    return {
      bottom: `${screenHeight - props.position.y + 10}px`,
      left: `${left}px`,
      width: `${modalWidth}px`,
      maxWidth: '92vw',
    }
  } else {
    return {
      top: `${props.position.y + 10}px`,
      left: `${left}px`,
      width: `${modalWidth}px`,
      maxWidth: '92vw',
    }
  }
})
</script>

<style scoped>
.pop-bubble-enter-active,
.pop-bubble-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-bubble-enter-from,
.pop-bubble-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
