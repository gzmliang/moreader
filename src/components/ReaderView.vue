<template>
  <div class="h-full relative overflow-hidden flex">
    <!-- TOC Drawer (浮层抽屉模式，绝不挤压阅读视口宽度！) -->
    <transition name="slide">
      <aside v-if="showToc" class="absolute left-0 top-0 bottom-0 w-80 border-r shadow-2xl overflow-y-auto transition-colors z-30" :class="[theme.tocBgClass, theme.borderColor]">
        <div class="p-4 border-b flex items-center justify-between transition-colors" :class="theme.borderColor">
          <h3 class="text-sm font-semibold" :class="theme.textColor">{{ t('reader.toc') }}</h3>
          <button @click="$emit('toggleToc')" class="p-1 rounded-md opacity-60 hover:opacity-100" :class="theme.textColor">✕</button>
        </div>
        <nav class="p-2">
          <div v-for="(item, index) in tocItems" :key="index" class="text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors" :class="[currentChapter === item.href ? theme.tocActiveClass : theme.tocItemClass]" :style="{ paddingLeft: `${12 + (item.level || 0) * 16}px` }" @click="$emit('navigateChapter', item.href)">
            {{ item.label }}
          </div>
        </nav>
      </aside>
    </transition>

    <!-- Reading Stage -->
    <div class="flex-1 flex flex-col min-w-0 h-full">
      <div class="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6">
        <!-- Prev Page Floating Button -->
        <button
          @click="$emit('prevPage')"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center border transition-all shadow-md"
          :class="[canGoPrev ? [theme.navArrowClass, theme.borderColor] : 'opacity-25 cursor-not-allowed border-transparent']"
          :disabled="!canGoPrev"
        >
          <ChevronLeft class="w-5 h-5" :class="theme.textColor" />
        </button>

        <!-- Next Page Floating Button -->
        <button
          @click="$emit('nextPage')"
          class="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center border transition-all shadow-md"
          :class="[canGoNext ? [theme.navArrowClass, theme.borderColor] : 'opacity-25 cursor-not-allowed border-transparent']"
          :disabled="!canGoNext"
        >
          <ChevronRight class="w-5 h-5" :class="theme.textColor" />
        </button>

        <!-- Book Spread Frame -->
        <div
          class="relative h-full w-full transition-all duration-300 rounded-2xl overflow-hidden border"
          :class="[
            layoutMode === 'double' ? 'max-w-[1620px] shadow-[0_20px_50px_rgba(0,0,0,0.08)]' : 'max-w-[920px] shadow-[0_12px_32px_rgba(0,0,0,0.06)]',
            theme.borderColor,
            theme.menuBgClass
          ]"
        >
          <!-- Center Thin Divider (Clean subtle hairline in Two-Page Spread mode) -->
          <div
            v-if="layoutMode === 'double'"
            class="absolute top-8 bottom-8 left-1/2 w-[1px] bg-black/5 dark:bg-white/5 pointer-events-none z-10 -translate-x-1/2"
          ></div>

          <!-- Epub.js Render Container -->
          <div id="epub-reader" class="h-full w-full overflow-hidden"></div>
        </div>
      </div>

      <!-- Bottom Progress Bar (Left-aligned to leave clean space for right feature pills) -->
      <div class="flex-none h-14 border-t transition-colors px-6 flex items-center justify-between" :class="[theme.progressBgClass, theme.borderColor]">
        <div class="flex items-center gap-3 w-full max-w-md">
          <span class="text-xs font-semibold w-10 tabular-nums opacity-75" :class="theme.textColor">{{ progressPercent }}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="sliderValue"
            @input="$emit('progressInput', ($event.target as HTMLInputElement).value)"
            @change="$emit('progressChange', parseFloat(($event.target as HTMLInputElement).value))"
            class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer slider"
            :class="theme.sliderBgClass"
          />
          <span class="text-xs w-20 text-right tabular-nums opacity-60" :class="theme.textColor">{{ locationLabel }}</span>
        </div>
        <!-- Spacer for right-side fixed feature pills -->
        <div class="hidden lg:block w-[560px]"></div>
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
  layoutMode?: 'single' | 'double'
  theme: Record<string, string>
}>()

defineEmits(['navigateChapter', 'prevPage', 'nextPage', 'progressInput', 'progressChange', 'toggleToc'])
</script>

<style scoped>
.slider { height: 4px; border-radius: 999px; outline: none; }
.slider::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; background: #2B5876; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.slider::-moz-range-thumb { width: 14px; height: 14px; background: #2B5876; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }

.book-spine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 56px;
  transform: translateX(-50%);
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.02) 35%,
    rgba(0, 0, 0, 0.065) 50%,
    rgba(255, 255, 255, 0.35) 52%,
    rgba(0, 0, 0, 0.02) 65%,
    rgba(0, 0, 0, 0) 100%
  );
  z-index: 10;
}

.book-spine-line {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 50%;
  width: 1px;
  background: rgba(128, 128, 128, 0.16);
  z-index: 11;
}
</style>
