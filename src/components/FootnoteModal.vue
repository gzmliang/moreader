<template>
  <transition name="slide-up">
    <div
      v-if="visible"
      class="fixed z-[130] bottom-6 left-1/2 -translate-x-1/2 w-[520px] max-w-[92vw] rounded-2xl shadow-2xl border p-4 flex flex-col transition-all duration-300 backdrop-blur-md"
      :class="[theme.menuBgClass || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']"
    >
      <!-- 顶栏：标题与关闭按钮 -->
      <div class="flex items-center justify-between pb-3 border-b" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
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
      <div class="py-3 px-1 max-h-44 overflow-y-auto leading-relaxed text-sm opacity-90 break-words" :class="theme.textColor">
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
          class="px-4 py-1.5 text-xs rounded-lg font-medium bg-blue-500 hover:bg-blue-600 active:scale-95 text-white shadow-sm transition-all flex items-center gap-1"
        >
          <span>↗</span>
          <span>{{ t('footnote.goTo') }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n'
import { X } from 'lucide-vue-next'

defineProps<{
  visible: boolean
  text: string
  targetHref: string
  theme: any
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'goTo', href: string): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.96);
}
</style>
