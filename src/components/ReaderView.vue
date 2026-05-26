<template>
  <div class="h-full flex">
    <!-- TOC Drawer -->
    <transition name="slide">
      <aside v-if="showToc" class="flex-none w-64 border-r overflow-y-auto transition-colors" :class="[theme.tocBgClass, theme.borderColor]">
        <div class="p-4 border-b transition-colors" :class="theme.borderColor">
          <h3 class="text-sm font-medium" :class="theme.textColor">{{ t('reader.toc') }}</h3>
        </div>
        <nav class="p-2">
          <div v-for="(item, index) in tocItems" :key="index" class="text-sm py-2 px-3 rounded cursor-pointer transition-colors" :class="[currentChapter === item.href ? theme.tocActiveClass : theme.tocItemClass]" :style="{ paddingLeft: `${12 + (item.level || 0) * 16}px` }" @click="$emit('navigateChapter', item.href)">
            {{ item.label }}
          </div>
        </nav>
      </aside>
    </transition>

    <!-- Reading Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex-none px-4 py-2 border-b transition-colors" :class="[theme.bookInfoBgClass, theme.borderColor]">
        <h2 class="text-sm font-medium truncate" :class="theme.textColor">{{ title }}</h2>
        <p class="text-xs opacity-60 truncate" :class="theme.textColor">{{ author }}</p>
      </div>

      <div class="flex-1 relative overflow-hidden">
        <button @click="$emit('prevPage')" class="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors" :class="[canGoPrev ? theme.navArrowClass : 'opacity-30 cursor-not-allowed']" :disabled="!canGoPrev">
          <ChevronLeft class="w-5 h-5" :class="theme.textColor" />
        </button>
        <button @click="$emit('nextPage')" class="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors" :class="[canGoNext ? theme.navArrowClass : 'opacity-30 cursor-not-allowed']" :disabled="!canGoNext">
          <ChevronRight class="w-5 h-5" :class="theme.textColor" />
        </button>
        <div id="epub-reader" class="h-full w-full overflow-hidden"></div>
      </div>

      <div class="flex-none h-12 border-t transition-colors" :class="[theme.progressBgClass, theme.borderColor]">
        <div class="h-full max-w-5xl mx-auto px-4 flex items-center gap-4">
          <span class="text-xs w-12 opacity-60" :class="theme.textColor">{{ progressPercent }}%</span>
          <input type="range" min="0" max="100" step="0.1" :value="sliderValue" @input="$emit('progressInput', ($event.target as HTMLInputElement).value)" @change="$emit('progressChange', parseFloat(($event.target as HTMLInputElement).value))" class="flex-1 h-1 rounded-lg appearance-none cursor-pointer slider" :class="theme.sliderBgClass" />
          <span class="text-xs w-24 text-right opacity-60" :class="theme.textColor">{{ locationLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { NavItem } from 'epubjs'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  showToc: boolean
  tocItems: NavItem[]
  currentChapter: string
  title: string
  author: string
  canGoPrev: boolean
  canGoNext: boolean
  progressPercent: number
  sliderValue: number
  locationLabel: string
  theme: Record<string, string>
}>()

defineEmits(['navigateChapter', 'prevPage', 'nextPage', 'progressInput', 'progressChange'])
</script>

<style scoped>
.slider { height: 3px; border-radius: 2px; outline: none; }
.slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
.slider::-moz-range-thumb { width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
</style>
