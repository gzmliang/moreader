<template>
  <!--
    遮罩关闭修复：不能只用 @click.self。
    病因：在输入框内 mousedown 后向左拖选文字、鼠标移出到遮罩上再松开时，
    mousedown 起点在输入框、click 事件却落在遮罩上，会误判为“点击空白处关闭”。
    现在改为 mousedown 与 click 都发生在遮罩自身才关闭。
  -->
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
       @mousedown.self="onOverlayMouseDown"
       @click.self="onOverlayClick">
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
          <div>
            <p class="font-medium">{{ t(`sync.${currentPreset}GuideIntro`) }}</p>
            <p class="mt-1 opacity-80">{{ t(`sync.${currentPreset}GuideStep`) }}</p>
          </div>

          <div class="p-2 rounded-lg bg-sky-100/70 dark:bg-sky-900/40">
            <span class="font-semibold">{{ t('sync.searchKeywordsLabel') }}</span>
            <span class="font-mono select-all ml-1 underline decoration-dotted">{{ t(`sync.${currentPreset}Keywords`) }}</span>
          </div>

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

      <!-- ============ 连接状态条（永远原地更新，绝不因输入而跳转） ============ -->
      <div class="p-3.5 rounded-xl border flex items-center justify-between gap-2"
           :class="[theme.borderColor, statusBarBg]">
        <div class="flex-1 min-w-0">
          <div v-if="syncStore.isVerifying" class="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <RefreshCw class="w-4 h-4 animate-spin" />
            <span>{{ t('sync.statusVerifying') }}</span>
          </div>
          <div v-else-if="syncStore.isVerified" class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="w-4 h-4" />
            <span>{{ t('sync.statusReady') }}</span>
          </div>
          <div v-else-if="syncStore.isConfigured" class="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Loader class="w-4 h-4" />
            <span>{{ t('sync.statusPending') }}</span>
          </div>
          <div v-else class="flex items-center gap-1.5 text-xs font-semibold opacity-60" :class="theme.textColor">
            <Cloud class="w-4 h-4" />
            <span>{{ t('sync.statusNotConfigured') }}</span>
          </div>

          <p v-if="syncStore.config.url" class="text-[11px] opacity-60 truncate mt-0.5 font-mono" :class="theme.textColor">
            {{ syncStore.config.url }}
          </p>

          <!-- 真实失败原因 -->
          <p v-if="syncStore.verifyState === 'error' && syncStore.verifyMessage"
             class="text-[11px] text-red-500 mt-1 leading-snug break-words">
            {{ syncStore.verifyMessage }}
          </p>
          <p v-else-if="syncStore.isConfigured && !syncStore.isVerified && !syncStore.isVerifying"
             class="text-[11px] opacity-60 mt-1 leading-snug">
            {{ t('sync.statusPendingHint') }}
          </p>
        </div>

        <button @click="toggleEdit"
                class="text-xs px-2.5 py-1 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                :class="theme.borderColor">
          {{ isEditing ? t('sync.finishModify') : (syncStore.isConfigured ? t('sync.modifyConfig') : t('sync.expandConfig')) }}
        </button>
      </div>

      <!-- ============ 配置表单（单一表单，原地展开，不再切换界面） ============ -->
      <div v-show="isEditing" class="mt-4 p-4 rounded-xl border space-y-3 text-xs"
           :class="[theme.borderColor, 'bg-black/5 dark:bg-white/5']">
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
                 @blur="scheduleVerify"
                 class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none font-mono text-xs" :class="theme.borderColor" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block mb-1 font-medium opacity-75" :class="theme.textColor">{{ t('sync.userLabel') }}</label>
            <input v-model="syncStore.config.username"
                   :placeholder="t(`sync.${currentPreset}UserPlaceholder`)"
                   @blur="scheduleVerify"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs" :class="theme.borderColor" />
          </div>
          <div>
            <label class="block mb-1 font-medium opacity-75" :class="theme.textColor">{{ t(`sync.${currentPreset}PwdLabel`) }}</label>
            <input v-model="syncStore.config.password" type="password"
                   :placeholder="t(`sync.${currentPreset}PwdPlaceholder`)"
                   @blur="scheduleVerify"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs" :class="theme.borderColor" />
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button @click="handleTest" :disabled="testing || syncStore.isVerifying"
                  class="flex-1 py-2 rounded-xl bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors flex items-center justify-center gap-2">
            <RefreshCw v-if="testing || syncStore.isVerifying" class="w-4 h-4 animate-spin" />
            <span>{{ (testing || syncStore.isVerifying) ? t('sync.verifyingBtn') : t('sync.verifyBtn') }}</span>
          </button>
          <button v-if="syncStore.isConfigured" @click="handleLogout"
                  class="px-3 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
            {{ t('sync.logout') }}
          </button>
        </div>
      </div>

      <!-- ============ 同步操作区：仅真实验证通过后可用 ============ -->
      <div v-if="syncStore.isVerified" class="space-y-2 mt-4">
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

      <!-- 同步结果提示 -->
      <div v-if="syncStore.syncResult" class="mt-3 p-2.5 rounded-xl text-xs text-center border bg-black/5 dark:bg-white/5"
           :class="theme.borderColor">
        <span :class="theme.textColor">{{ syncStore.syncResult }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Cloud, X, RefreshCw, Upload, Download, CheckCircle2, HelpCircle, Check, Loader } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useSyncStore } from '@/stores/syncStore'

const { t } = useI18n()
const syncStore = useSyncStore()

defineProps<{
  theme: Record<string, string>
}>()

const emit = defineEmits(['close'])

const showGuide = ref(false)
const testing = ref(false)
const promptCopied = ref(false)

/**
 * 编辑态：默认「未配置过就展开、配置过就收起」。
 * 关键修复：表单可见性只由 isEditing 决定，绝不再由 isConfigured 决定，
 * 否则用户刚敲下密码第一个字符就会触发整块 UI 切换，视觉上像被“弹走”。
 */
const isEditing = ref(!syncStore.isConfigured)

const currentPreset = computed(() => syncStore.config.preset || 'jianguo')

const statusBarBg = computed(() => {
  if (syncStore.verifyState === 'ok') return 'bg-emerald-500/5'
  if (syncStore.verifyState === 'error') return 'bg-red-500/5'
  if (syncStore.verifyState === 'verifying') return 'bg-sky-500/5'
  return 'bg-black/5 dark:bg-white/5'
})

// ===== 遮罩关闭：只有按下与松开都发生在遮罩上才算点击空白 =====
let overlayMouseDown = false
function onOverlayMouseDown() {
  overlayMouseDown = true
}
function onOverlayClick() {
  if (overlayMouseDown) emit('close')
  overlayMouseDown = false
}

function toggleEdit() {
  isEditing.value = !isEditing.value
}

function selectPreset(preset: 'jianguo' | 'alist' | 'custom') {
  syncStore.setPreset(preset)
}

function copyPrompt(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    promptCopied.value = true
    setTimeout(() => { promptCopied.value = false }, 2500)
  })
}

/** 离开输入框时才触发一次真实云端验证（输入过程中绝不打扰） */
function scheduleVerify() {
  syncStore.scheduleAutoVerify()
}

async function handleTest() {
  testing.value = true
  await syncStore.testConnection()
  testing.value = false
}

function handleLogout() {
  syncStore.logout()
  isEditing.value = true
}

async function handleUpload() {
  try {
    await syncStore.uploadToCloud()
  } catch (e) {}
}

async function handleDownload() {
  try {
    await syncStore.downloadFromCloud()
  } catch (e) {}
}

// 已配置过时，打开面板即静默拉一次云端书库，避免“看不到云端内容”
onMounted(() => {
  if (syncStore.isConfigured && !isEditing.value) {
    void syncStore.listCloudBooks()
  }
})
</script>
