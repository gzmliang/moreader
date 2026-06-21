<template>
  <div class="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" @click.self="$emit('close')">
    <div class="w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 transition-colors duration-300" :class="[theme.containerBg, theme.borderColor, 'border']">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-4">
        <Cloud class="w-5 h-5" :class="theme.textColor" />
        <h2 class="text-base font-semibold" :class="theme.textColor">{{ t('sync.title') }}</h2>
      </div>

      <!-- Logged in -->
      <div v-if="syncStore.isLoggedIn" class="space-y-4">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-2">
            <Check class="w-6 h-6 text-green-500" />
          </div>
          <p class="font-medium" :class="theme.textColor">{{ t('sync.loggedIn') }}</p>
          <p class="text-sm opacity-60" :class="theme.textColor">{{ syncStore.loggedEmail }}</p>
        </div>

        <!-- Book count -->
        <div class="text-center">
          <p class="text-xs opacity-40" :class="theme.textColor">
            {{ bookCount }} 本书，{{ bookmarkCount }} 书签，{{ highlightCount }} 高亮
          </p>
        </div>

        <!-- Two buttons: upload & download -->
        <div class="space-y-2">
          <!-- Upload button -->
          <button @click="doUpload"
            :disabled="syncStore.isUploading"
            class="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            :class="[syncStore.isUploading ? 'opacity-60 cursor-wait' : '',
                     'bg-blue-600 hover:bg-blue-700 text-white']">
            <RefreshCw v-if="syncStore.isUploading" class="w-4 h-4 animate-spin" />
            <Upload v-else class="w-4 h-4" />
            {{ syncStore.isUploading ? t('sync.uploading') : t('sync.uploadToCloud') }}
          </button>
          <p v-if="syncStore.lastUploadLabel" class="text-[11px] text-center opacity-40" :class="theme.textColor">
            ⏱ 上次上传：{{ syncStore.lastUploadLabel }}
          </p>

          <!-- Download button -->
          <button v-if="!showDownloadConfirm" @click="showDownloadConfirm = true"
            :disabled="syncStore.isDownloading"
            class="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border"
            :class="[syncStore.isDownloading ? 'opacity-60 cursor-wait' : '',
                     theme.borderColor, theme.textColor, 'hover:bg-green-500/10']">
            <RefreshCw v-if="syncStore.isDownloading" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            {{ syncStore.isDownloading ? t('sync.downloading') : t('sync.downloadFromCloud') }}
          </button>

          <!-- Download confirmation -->
          <div v-if="showDownloadConfirm" class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 space-y-2">
            <p class="text-xs text-yellow-600 dark:text-yellow-400">{{ t('sync.downloadConfirm') }}</p>
            <div class="flex gap-2">
              <button @click="doDownload"
                class="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors">
                {{ t('sync.confirmYes') }}
              </button>
              <button @click="showDownloadConfirm = false"
                class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                :class="[theme.borderColor, theme.textColor, 'hover:opacity-80']">
                {{ t('sync.confirmNo') }}
              </button>
            </div>
          </div>

          <p v-if="syncStore.lastDownloadLabel" class="text-[11px] text-center opacity-40" :class="theme.textColor">
            ⏱ 上次下载：{{ syncStore.lastDownloadLabel }}
          </p>
        </div>

        <!-- Result -->
        <p v-if="syncStore.syncResult" class="text-xs text-center opacity-60" :class="theme.textColor">
          {{ syncStore.syncResult }}
        </p>

        <hr class="opacity-20" :class="theme.borderColor" />

        <!-- Logout -->
        <button @click="syncStore.logout()"
          class="w-full py-2 rounded-xl border text-sm font-medium transition-colors"
          :class="[theme.borderColor, 'text-red-500 hover:bg-red-500/5']">
          <LogOut class="w-4 h-4 inline mr-1" />
          {{ t('sync.logout') }}
        </button>
      </div>

      <!-- Login form -->
      <div v-else class="space-y-3">
        <p class="text-sm opacity-60" :class="theme.textColor">{{ t('sync.loginHint') }}</p>

        <input v-model="loginEmail" type="email" :placeholder="t('sync.email')"
          class="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
          :class="[theme.borderColor, theme.inputBg, theme.textColor]"
          @keyup.enter="doLogin" />

        <input v-model="loginPassword" type="password" :placeholder="t('sync.password')"
          class="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
          :class="[theme.borderColor, theme.inputBg, theme.textColor]"
          @keyup.enter="doLogin" />

        <button @click="doLogin" :disabled="isLoggingIn"
          class="w-full py-2.5 rounded-xl font-medium transition-colors"
          :class="[isLoggingIn ? 'opacity-60' : '',
                   theme.primaryBg ? 'text-white' : 'text-white bg-gray-900 hover:bg-gray-800']">
          <span v-if="isLoggingIn">{{ t('sync.loggingIn') }}</span>
          <span v-else>{{ t('sync.login') }}</span>
        </button>

        <p v-if="loginError" class="text-xs text-red-500 text-center">{{ loginError }}</p>

        <p class="text-[11px] text-center opacity-40" :class="theme.textColor">
          {{ t('sync.registerHint') }}
        </p>
      </div>

      <!-- Close -->
      <button @click="$emit('close')" class="mt-3 w-full text-center text-sm opacity-50 hover:opacity-100 transition-opacity" :class="theme.textColor">
        {{ t('sync.close') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cloud, Check, RefreshCw, LogOut, Upload, Download } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useSyncStore } from '@/stores/syncStore'
import { useBookStore } from '@/stores/bookStore'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useHighlightStore } from '@/stores/highlightStore'

defineProps<{
  theme: Record<string, string>
}>()

defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()
const syncStore = useSyncStore()
const bookStore = useBookStore()
const bookmarkStore = useBookmarkStore()
const highlightStore = useHighlightStore()

const bookCount = computed(() => bookStore.books.length)
const bookmarkCount = computed(() => bookmarkStore.bookmarks.length)
const highlightCount = computed(() => highlightStore.highlights.length)

const loginEmail = ref('jimmy@moreader.app')
const loginPassword = ref('')
const isLoggingIn = ref(false)
const loginError = ref<string | null>(null)
const showDownloadConfirm = ref(false)

async function doLogin() {
  if (!loginEmail.value || !loginPassword.value) {
    loginError.value = '请输入邮箱和密码'
    return
  }
  isLoggingIn.value = true
  loginError.value = null
  try {
    await syncStore.login(loginEmail.value, loginPassword.value)
  } catch (e: any) {
    loginError.value = e.message
  } finally {
    isLoggingIn.value = false
  }
}

async function doUpload() {
  try {
    await syncStore.uploadToCloud()
  } catch (e) {
    // error already handled in store
  }
}

async function doDownload() {
  showDownloadConfirm.value = false
  try {
    await syncStore.downloadFromCloud()
  } catch (e) {
    // error already handled in store
  }
}
</script>
