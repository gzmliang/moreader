<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 transition-colors duration-300"
         :class="[theme.containerBg || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800', 'border']">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Cloud class="w-5 h-5 text-sky-500" />
          <h2 class="text-base font-semibold" :class="theme.textColor">{{ t('sync.title') }}</h2>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors" :class="theme.textColor">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 说明与指引折叠条 -->
      <div class="mb-5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs leading-relaxed text-sky-900 dark:text-sky-200">
        <div class="flex items-center justify-between cursor-pointer font-medium" @click="showGuide = !showGuide">
          <span class="flex items-center gap-1.5">
            <HelpCircle class="w-4 h-4 text-sky-500" />
            <span>{{ t('sync.guideTitle') }}</span>
          </span>
          <span class="text-[11px] opacity-70">{{ showGuide ? t('sync.guideToggleClose') : t('sync.guideToggleOpen') }}</span>
        </div>

        <div v-if="showGuide" class="mt-2.5 pt-2.5 border-t border-sky-200/60 dark:border-sky-800/60 space-y-2.5 text-[11.5px] opacity-95">
          <!-- 针对当前选中的预设展示专属指南 -->
          <div>
            <p class="font-medium">
              {{ t(`sync.${currentPreset}GuideIntro`) }}
            </p>
            <p class="mt-1 opacity-80">
              {{ t(`sync.${currentPreset}GuideStep`) }}
            </p>
          </div>

          <!-- 搜索关键词指引 -->
          <div class="p-2 rounded-lg bg-sky-100/70 dark:bg-sky-900/40">
            <span class="font-semibold">{{ t('sync.searchKeywordsLabel') }}</span>
            <span class="font-mono select-all ml-1 underline decoration-dotted">{{ t(`sync.${currentPreset}Keywords`) }}</span>
          </div>

          <!-- 问 AI 现成提示词与一键复制 -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-sky-200 dark:border-sky-700/60">
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-semibold text-[11px]">{{ t('sync.askAiLabel') }}</span>
              <button @click="copyPrompt(t(`sync.${currentPreset}AiPrompt`))"
                      class="px-2 py-0.5 rounded text-[10px] font-medium border border-sky-300 dark:border-sky-600 transition-colors flex items-center gap-1"
                      :class="promptCopied ? 'bg-green-500 text-white border-green-500' : 'hover:bg-sky-50 dark:hover:bg-sky-950'">
                <Check v-if="promptCopied" class="w-3 h-3" />
                <span>{{ promptCopied ? t('sync.promptCopied') : t('sync.copyPrompt') }}</span>
              </button>
            </div>
            <p class="italic text-[11px] opacity-80 select-all leading-snug">
              "{{ t(`sync.${currentPreset}AiPrompt`) }}"
            </p>
          </div>
        </div>
      </div>

      <!-- 已配置好：显示同步动作面板 -->
      <div v-if="syncStore.isLoggedIn" class="space-y-4">
        <div class="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 flex items-center justify-between" :class="theme.borderColor">
          <div class="truncate mr-2">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 class="w-4 h-4" />
              <span>{{ t('sync.statusReady') }}</span>
            </div>
            <p class="text-[11px] opacity-60 truncate mt-0.5" :class="theme.textColor">{{ syncStore.config.url }}</p>
          </div>
          <button @click="showConfig = !showConfig" class="text-xs px-2.5 py-1 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors" :class="theme.borderColor">
            {{ showConfig ? t('sync.finishModify') : t('sync.modifyConfig') }}
          </button>
        </div>

        <!-- 修改配置区（折叠） -->
        <div v-if="showConfig" class="p-4 rounded-xl border space-y-3 text-xs" :class="[theme.borderColor, 'bg-black/5 dark:bg-white/5']">
          <div>
            <label class="block mb-1 font-medium opacity-70" :class="theme.textColor">{{ t('sync.presetLabel') }}</label>
            <div class="grid grid-cols-3 gap-1.5">
              <button @click="selectPreset('jianguo')" class="py-1.5 rounded-lg border text-center font-medium transition-all"
                      :class="syncStore.config.preset === 'jianguo' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-semibold' : 'opacity-60 hover:opacity-100'">
                {{ t('sync.presetJianguo') }}
              </button>
              <button @click="selectPreset('alist')" class="py-1.5 rounded-lg border text-center font-medium transition-all"
                      :class="syncStore.config.preset === 'alist' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-semibold' : 'opacity-60 hover:opacity-100'">
                {{ t('sync.presetAlist') }}
              </button>
              <button @click="selectPreset('custom')" class="py-1.5 rounded-lg border text-center font-medium transition-all"
                      :class="syncStore.config.preset === 'custom' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-semibold' : 'opacity-60 hover:opacity-100'">
                {{ t('sync.presetCustom') }}
              </button>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium opacity-70" :class="theme.textColor">{{ t('sync.urlLabel') }}</label>
            <input v-model="syncStore.config.url"
                   :placeholder="t(`sync.${currentPreset}UrlPlaceholder`)"
                   class="w-full px-3 py-1.5 rounded-lg border bg-transparent font-mono outline-none" :class="theme.borderColor" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block mb-1 font-medium opacity-70" :class="theme.textColor">{{ t('sync.userLabel') }}</label>
              <input v-model="syncStore.config.username"
                     :placeholder="t(`sync.${currentPreset}UserPlaceholder`)"
                     class="w-full px-3 py-1.5 rounded-lg border bg-transparent outline-none" :class="theme.borderColor" />
            </div>
            <div>
              <label class="block mb-1 font-medium opacity-70" :class="theme.textColor">{{ t(`sync.${currentPreset}PwdLabel`) }}</label>
              <input v-model="syncStore.config.password" type="password"
                     :placeholder="t(`sync.${currentPreset}PwdPlaceholder`)"
                     class="w-full px-3 py-1.5 rounded-lg border bg-transparent outline-none" :class="theme.borderColor" />
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button @click="handleTest" :disabled="testing" class="flex-1 py-1.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors">
              {{ testing ? t('sync.testing') : t('sync.testAndSave') }}
            </button>
            <button @click="syncStore.logout(); showConfig = false" class="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
              {{ t('sync.logout') }}
            </button>
          </div>
        </div>

        <!-- 同步操作按钮 -->
        <div class="space-y-2 pt-1">
          <!-- 上传到云端 -->
          <button @click="handleUpload"
                  :disabled="syncStore.isUploading"
                  class="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow">
            <RefreshCw v-if="syncStore.isUploading" class="w-4 h-4 animate-spin" />
            <Upload v-else class="w-4 h-4" />
            <span>{{ syncStore.isUploading ? t('sync.uploadingBtn') : t('sync.uploadBtn') }}</span>
          </button>
          <p v-if="syncStore.lastUploadLabel" class="text-[11px] text-center opacity-50" :class="theme.textColor">
            ⏱ {{ t('sync.lastUpload') }}{{ syncStore.lastUploadLabel }}
          </p>

          <!-- 从云端拉取 -->
          <button @click="handleDownload"
                  :disabled="syncStore.isDownloading"
                  class="w-full py-2.5 rounded-xl font-medium border flex items-center justify-center gap-2 transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  :class="[theme.borderColor, theme.textColor]">
            <RefreshCw v-if="syncStore.isDownloading" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            <span>{{ syncStore.isDownloading ? t('sync.downloadingBtn') : t('sync.downloadBtn') }}</span>
          </button>
          <p v-if="syncStore.lastDownloadLabel" class="text-[11px] text-center opacity-50" :class="theme.textColor">
            ⏱ {{ t('sync.lastDownload') }}{{ syncStore.lastDownloadLabel }}
          </p>
        </div>

        <!-- 提示信息 -->
        <div v-if="testMsg || syncStore.syncResult" class="p-2.5 rounded-xl text-xs text-center border"
             :class="isError ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'">
          {{ testMsg || syncStore.syncResult }}
        </div>
      </div>

      <!-- 未配置好：首次引导表单 -->
      <div v-else class="space-y-4">
        <div class="space-y-3 text-xs">
          <div>
            <label class="block mb-1.5 font-semibold" :class="theme.textColor">{{ t('sync.presetTitle') }}</label>
            <div class="grid grid-cols-3 gap-2">
              <button @click="selectPreset('jianguo')" class="p-2 rounded-xl border text-center transition-all"
                      :class="syncStore.config.preset === 'jianguo' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-bold' : 'opacity-70 hover:opacity-100'">
                <div>{{ t('sync.presetJianguo') }}</div>
                <div class="text-[10px] opacity-60">{{ t('sync.presetJianguoSub') }}</div>
              </button>
              <button @click="selectPreset('alist')" class="p-2 rounded-xl border text-center transition-all"
                      :class="syncStore.config.preset === 'alist' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-bold' : 'opacity-70 hover:opacity-100'">
                <div>{{ t('sync.presetAlist') }}</div>
                <div class="text-[10px] opacity-60">{{ t('sync.presetAlistSub') }}</div>
              </button>
              <button @click="selectPreset('custom')" class="p-2 rounded-xl border text-center transition-all"
                      :class="syncStore.config.preset === 'custom' ? 'border-sky-500 bg-sky-500/10 text-sky-600 font-bold' : 'opacity-70 hover:opacity-100'">
                <div>{{ t('sync.presetCustom') }}</div>
                <div class="text-[10px] opacity-60">{{ t('sync.presetCustomSub') }}</div>
              </button>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium opacity-75" :class="theme.textColor">{{ t('sync.urlLabel') }}</label>
            <input v-model="syncStore.config.url"
                   :placeholder="t(`sync.${currentPreset}UrlPlaceholder`)"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none font-mono text-xs" :class="theme.borderColor" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block mb-1 font-medium opacity-75" :class="theme.textColor">{{ t('sync.userLabel') }}</label>
              <input v-model="syncStore.config.username"
                     :placeholder="t(`sync.${currentPreset}UserPlaceholder`)"
                     class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs" :class="theme.borderColor" />
            </div>
            <div>
              <label class="block mb-1 font-medium opacity-75" :class="theme.textColor">{{ t(`sync.${currentPreset}PwdLabel`) }}</label>
              <input v-model="syncStore.config.password" type="password"
                     :placeholder="t(`sync.${currentPreset}PwdPlaceholder`)"
                     class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs" :class="theme.borderColor" />
            </div>
          </div>
        </div>

        <button @click="handleTest" :disabled="testing"
                class="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-md transition-all">
          <RefreshCw v-if="testing" class="w-4 h-4 animate-spin" />
          <span>{{ testing ? t('sync.verifyingBtn') : t('sync.verifyBtn') }}</span>
        </button>

        <div v-if="testMsg" class="p-2.5 rounded-xl text-xs text-center border"
             :class="isError ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'">
          {{ testMsg }}
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cloud, X, RefreshCw, Upload, Download, CheckCircle2, HelpCircle, Check } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useSyncStore } from '@/stores/syncStore'

const { t } = useI18n()
const syncStore = useSyncStore()

defineProps<{
  theme: Record<string, string>
}>()

defineEmits(['close'])

const showGuide = ref(false)
const showConfig = ref(false)
const testing = ref(false)
const testMsg = ref('')
const isError = ref(false)
const promptCopied = ref(false)

const currentPreset = computed(() => syncStore.config.preset || 'jianguo')

function selectPreset(preset: 'jianguo' | 'alist' | 'custom') {
  syncStore.setPreset(preset)
}

function copyPrompt(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    promptCopied.value = true
    setTimeout(() => { promptCopied.value = false }, 2500)
  })
}

async function handleTest() {
  testing.value = true
  testMsg.value = ''
  isError.value = false
  const res = await syncStore.testConnection()
  testing.value = false
  testMsg.value = res.message
  isError.value = !res.ok
  if (res.ok) {
    showConfig.value = false
  }
}

async function handleUpload() {
  testMsg.value = ''
  try {
    await syncStore.uploadToCloud()
  } catch (e) {}
}

async function handleDownload() {
  testMsg.value = ''
  try {
    await syncStore.downloadFromCloud()
  } catch (e) {}
}
</script>
