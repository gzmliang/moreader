<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border transition-all duration-300"
         :class="[theme.containerBg || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']">
      
      <!-- Header -->
      <div class="px-6 pt-5 pb-4 border-b flex items-center justify-between" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <div class="flex items-center gap-2">
          <span class="text-xl">☕</span>
          <h3 class="text-base font-bold" :class="theme.textColor">{{ t('donate.modalTitle') }}</h3>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" :class="theme.textColor">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tab Buttons -->
      <div class="flex border-b text-xs font-semibold" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <button @click="activeTab = 'intl'"
          class="flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5"
          :class="activeTab === 'intl' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5' : 'border-transparent opacity-60 hover:opacity-100'">
          <span>🌍</span> {{ t('donate.tabIntl') }}
        </button>
        <button @click="activeTab = 'cn'"
          class="flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5"
          :class="activeTab === 'cn' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5' : 'border-transparent opacity-60 hover:opacity-100'">
          <span>🇨🇳</span> {{ t('donate.tabCN') }}
        </button>
      </div>

      <!-- Content Body -->
      <div class="p-6">
        <!-- International Tab -->
        <div v-if="activeTab === 'intl'" class="space-y-4 text-center">
          <p class="text-xs opacity-75 leading-relaxed" :class="theme.textColor">
            {{ t('donate.intlDesc') }}
          </p>

          <div class="pt-2 space-y-3">
            <!-- Ko-fi Link -->
            <a href="https://ko-fi.com/jimmyliang10894" target="_blank"
               class="block w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#ff5e5b] hover:bg-[#e04e4b] shadow-md hover:shadow-lg transition-all text-center">
              ☕ Buy me a coffee on Ko-fi
            </a>

            <!-- PayPal Box -->
            <div class="p-3 rounded-xl border bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs" :class="theme.borderColor">
              <div class="text-left truncate mr-2">
                <span class="opacity-50 block text-[10px]">PayPal</span>
                <strong class="text-sky-600 dark:text-sky-400 font-mono">gzjliang@gmail.com</strong>
              </div>
              <button @click="copyPayPal" class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 shrink-0"
                      :class="copied ? 'bg-green-500 text-white border-green-500' : 'hover:bg-black/5 dark:hover:bg-white/5'">
                <Check v-if="copied" class="w-3.5 h-3.5" />
                <span>{{ copied ? t('donate.copied') : t('donate.copy') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- China Tab -->
        <div v-else class="text-center space-y-3">
          <p class="text-xs opacity-75 leading-relaxed" :class="theme.textColor">
            {{ t('donate.cnDesc') }}
          </p>

          <div class="inline-block p-2 rounded-2xl bg-white shadow-md border border-zinc-200 dark:border-zinc-700">
            <img :src="qrCodeImg" alt="WeChat / Alipay QR Code" class="w-48 h-48 object-cover rounded-xl mx-auto" />
            <p class="text-[11px] text-zinc-500 mt-2 font-medium">{{ t('donate.scanToPay') }}</p>
          </div>
        </div>
      </div>

      <!-- Footer note -->
      <div class="px-6 py-3 border-t text-center text-[11px] opacity-50" :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]">
        {{ t('donate.footerThanks') }}
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X, Check } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import qrCodeImg from '@/assets/receivecode.jpg'

const { t } = useI18n()

defineProps<{
  show: boolean
  theme: Record<string, string>
}>()

defineEmits(['close'])

const activeTab = ref<'intl' | 'cn'>('intl')
const copied = ref(false)

function copyPayPal() {
  navigator.clipboard.writeText('gzjliang@gmail.com').then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  })
}
</script>
