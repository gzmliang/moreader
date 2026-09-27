<template>
  <!--
    云端目录浏览器 —— 移植自安卓端 WebDavBrowserDialog 的设计：
    服务器地址只填根，目录靠这里逐级点选，选中后“设为默认存储目录”。
    好处：用户看得见真实目录结构，彻底避开手打路径写错（如 /dav/Books 实际不存在）的坑。
  -->
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
       @mousedown.self="onOverlayMouseDown"
       @click.self="onOverlayClick">
    <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-5 transition-colors duration-300"
         :class="[theme.containerBg || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800', 'border']">

      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <FolderOpen class="w-5 h-5 text-sky-500 shrink-0" />
          <h2 class="text-base font-semibold truncate" :class="theme.textColor">
            {{ t('sync.browseTitle') }}
          </h2>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors shrink-0" :class="theme.textColor">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 当前路径 + 返回上级 + 刷新 -->
      <div class="flex items-center justify-between gap-2 mb-2 text-xs">
        <button v-if="!isAtRoot" @click="goUp"
                class="flex items-center gap-1 px-2 py-1 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                :class="theme.borderColor">
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{{ t('sync.browseParent') }}</span>
        </button>
        <span v-else class="opacity-50" :class="theme.textColor">{{ t('sync.browseRoot') }}</span>

        <button @click="refresh" class="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                :class="theme.borderColor">
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': syncStore.browseLoading }" />
        </button>
      </div>

      <!-- 当前路径显示 -->
      <p class="text-[11px] font-mono opacity-60 truncate mb-2" :class="theme.textColor"
         :title="fullPathLabel">{{ fullPathLabel }}</p>

      <!-- 当前目录是否已选为默认 -->
      <div v-if="isCurrentSelected" class="mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5">
        <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
        <span class="text-[11px] text-emerald-600 font-medium">{{ t('sync.browseIsCurrent') }}</span>
      </div>

      <!-- 列表区 -->
      <div class="rounded-xl border overflow-hidden" :class="theme.borderColor">
        <div v-if="syncStore.browseLoading" class="flex items-center justify-center h-40">
          <RefreshCw class="w-5 h-5 animate-spin opacity-50" :class="theme.textColor" />
        </div>

        <div v-else-if="syncStore.browseError" class="p-4 text-center space-y-2">
          <p class="text-xs text-red-500 leading-snug break-words">{{ syncStore.browseError }}</p>
          <button @click="refresh" class="px-3 py-1 rounded-lg text-xs bg-sky-600 text-white hover:bg-sky-700 transition-colors">
            {{ t('library.retry') }}
          </button>
        </div>

        <div v-else-if="syncStore.browseItems.length === 0" class="flex items-center justify-center h-40">
          <p class="text-xs opacity-50" :class="theme.textColor">{{ t('sync.browseEmpty') }}</p>
        </div>

        <div v-else class="max-h-[280px] overflow-y-auto divide-y" :class="theme.borderColor">
          <div v-for="item in syncStore.browseItems" :key="item.path"
               class="flex items-center gap-2 px-2.5 py-2 transition-colors"
               :class="item.isDirectory
                 ? 'cursor-pointer hover:bg-sky-500/10'
                 : 'opacity-50'"
               @click="onItemClick(item)">
            <Folder v-if="item.isDirectory" class="w-4 h-4 text-sky-500 shrink-0" />
            <FileText v-else class="w-4 h-4 shrink-0 opacity-60" :class="theme.textColor" />
            <div class="flex-1 min-w-0">
              <p class="text-xs truncate font-medium" :class="theme.textColor">{{ item.name }}</p>
              <p v-if="!item.isDirectory && item.size > 0" class="text-[10px] opacity-40" :class="theme.textColor">
                {{ formatSize(item.size) }}
              </p>
            </div>
            <ChevronRight v-if="item.isDirectory" class="w-3.5 h-3.5 opacity-40 shrink-0" :class="theme.textColor" />
          </div>
        </div>
      </div>

      <!-- 底部动作 -->
      <div class="flex gap-2 mt-4">
        <button @click="confirmSelect"
                class="flex-1 py-2 rounded-xl text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors flex items-center justify-center gap-1.5">
          <CheckCircle2 class="w-4 h-4" />
          <span>{{ t('sync.browseSetCurrent') }}</span>
        </button>
        <button @click="$emit('close')"
                class="px-4 py-2 rounded-xl text-xs border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                :class="[theme.borderColor, theme.textColor]">
          {{ t('sync.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FolderOpen, Folder, FileText, X, RefreshCw, ArrowLeft, ChevronRight, CheckCircle2 } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useSyncStore, type CloudDirItem } from '@/stores/syncStore'

const { t } = useI18n()
const syncStore = useSyncStore()

const props = defineProps<{
  theme: Record<string, string>
  /** 打开时的起始目录；不传则从当前已选目录开始 */
  startDir?: string
}>()

const emit = defineEmits(['close', 'selected'])

const currentDir = ref('')

const isAtRoot = computed(() => !currentDir.value || currentDir.value === '/')

const fullPathLabel = computed(() => {
  const root = syncStore.getRootUrl()
  const dir = currentDir.value ? '/' + currentDir.value.replace(/^\/+/, '').replace(/\/+$/, '') : ''
  return root + dir
})

const isCurrentSelected = computed(() => {
  const a = (currentDir.value || '').replace(/^\/+/, '').replace(/\/+$/, '')
  const b = (syncStore.getSelectedDir() || '').replace(/^\/+/, '').replace(/\/+$/, '')
  return a === b
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

async function load(dir: string) {
  currentDir.value = dir
  await syncStore.listDir(dir)
}

function refresh() {
  void load(currentDir.value)
}

function goUp() {
  const d = (currentDir.value || '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!d) return
  const parent = d.substring(0, d.lastIndexOf('/'))
  void load(parent)
}

function onItemClick(item: CloudDirItem) {
  if (item.isDirectory) void load(item.path)
}

function confirmSelect() {
  syncStore.setSelectedDir(currentDir.value)
  emit('selected', currentDir.value)
  emit('close')
}

// 遮罩关闭：mousedown 与 click 都落在遮罩上才关闭（防止拖选误关）
let overlayMouseDown = false
function onOverlayMouseDown() { overlayMouseDown = true }
function onOverlayClick() {
  if (overlayMouseDown) emit('close')
  overlayMouseDown = false
}

onMounted(() => {
  const start = props.startDir !== undefined
    ? props.startDir
    : (syncStore.getSelectedDir() || '')
  void load(start)
})
</script>
