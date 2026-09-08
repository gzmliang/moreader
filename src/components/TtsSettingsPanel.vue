<template>
  <transition name="menu-pop">
    <div v-if="visible" ref="menuRef"
         class="fixed top-16 right-4 z-[99] w-88 max-h-[85vh] overflow-y-auto p-5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-200"
         :class="[theme.containerBg || 'bg-white/95 dark:bg-zinc-900/95', theme.borderColor || 'border-zinc-200/80 dark:border-zinc-800/80']"
         @click.stop>
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 mb-4 border-b" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <div class="flex items-center gap-2">
          <span class="text-base">🎙️</span>
          <h3 class="text-sm font-bold" :class="theme.textColor">{{ t('tts.voiceEngine') }}</h3>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" :class="theme.textColor">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex flex-col gap-4 text-xs">
        <!-- Provider Tabs -->
        <div>
          <label class="font-medium mb-1.5 block opacity-70" :class="theme.textColor">{{ t('tts.engineLabel') }}</label>
          <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border" :class="theme.borderColor">
            <button @click="setProvider('edge')"
                    class="py-1.5 rounded-lg font-medium transition-all text-center"
                    :class="provider === 'edge' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100'">
              {{ t('tts.engineEdge') }}
            </button>
            <button @click="setProvider('browser')"
                    class="py-1.5 rounded-lg font-medium transition-all text-center"
                    :class="provider === 'browser' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100'">
              {{ t('tts.engineBrowser') }}
            </button>
            <button @click="setProvider('ai_voice')"
                    class="py-1.5 rounded-lg font-medium transition-all text-center"
                    :class="provider === 'ai_voice' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100'">
              {{ t('tts.engineAi') }}
            </button>
          </div>
        </div>

        <!-- Edge TTS 面板 -->
        <div v-if="provider === 'edge'" class="space-y-3.5">
          <!-- 智能语言黄金音色匹配提示 -->
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Sparkles class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div class="leading-relaxed text-[11.5px]">
              <span class="font-semibold">{{ t('tts.smartMatchTitle') }}</span>
              <span class="opacity-85">{{ t('tts.smartMatchDesc') }}</span>
            </div>
          </div>

          <!-- 节点地址与状态 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="font-medium opacity-70" :class="theme.textColor">{{ t('tts.nodeEndpointLabel') }}</label>
              <span class="text-[11px] font-medium" :class="edgeAvailable ? 'text-emerald-500' : 'text-red-500'">
                {{ edgeAvailable ? t('tts.statusConnected') : t('tts.statusDisconnected') }}
              </span>
            </div>
            <div class="flex gap-1.5">
              <input v-model="localEdgeEndpoint" @change="updateEdgeEndpoint"
                     class="flex-1 px-3 py-1.5 rounded-xl border bg-transparent font-mono text-xs outline-none"
                     :class="theme.borderColor" placeholder="http://p-plus.duckdns.org:5001" />
              <button @click="checkServer" class="px-2.5 py-1.5 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 shrink-0 transition-colors" :class="theme.borderColor">
                {{ t('tts.testBtn') }}
              </button>
            </div>
            <p class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              {{ t('tts.nodePresetNotice') }}
            </p>
          </div>

          <!-- 音色选择 -->
          <div>
            <label class="font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('tts.defaultVoiceLabel') }}</label>
            <select v-model="selectedEdgeVoice" @change="onEdgeVoiceChange"
                    class="w-full px-3 py-1.5 rounded-xl border bg-transparent outline-none cursor-pointer"
                    :class="[theme.borderColor, theme.textColor]">
              <optgroup :label="t('tts.groupChinese')">
                <option value="zh-CN-XiaoxiaoNeural">{{ t('tts.voiceXiaoxiao') }}</option>
                <option value="zh-CN-YunxiNeural">{{ t('tts.voiceYunxi') }}</option>
                <option value="zh-CN-YunjianNeural">{{ t('tts.voiceYunjian') }}</option>
                <option value="zh-CN-XiaoyiNeural">{{ t('tts.voiceXiaoyi') }}</option>
                <option value="zh-HK-HiuMaanNeural">{{ t('tts.voiceHiuMaan') }}</option>
                <option value="zh-TW-HsiaoChenNeural">{{ t('tts.voiceHsiaoChen') }}</option>
              </optgroup>
              <optgroup :label="t('tts.groupEnglish')">
                <option value="en-US-JennyNeural">{{ t('tts.voiceJenny') }}</option>
                <option value="en-US-GuyNeural">{{ t('tts.voiceGuy') }}</option>
                <option value="en-GB-SoniaNeural">{{ t('tts.voiceSonia') }}</option>
              </optgroup>
              <optgroup :label="t('tts.groupInternational')">
                <option value="ja-JP-NanamiNeural">{{ t('tts.voiceNanami') }}</option>
                <option value="ko-KR-SunHiNeural">{{ t('tts.voiceSunHi') }}</option>
                <option value="fr-FR-DeniseNeural">{{ t('tts.voiceDenise') }}</option>
                <option value="de-DE-KatjaNeural">{{ t('tts.voiceKatja') }}</option>
                <option value="es-ES-ElviraNeural">{{ t('tts.voiceElvira') }}</option>
                <option value="ru-RU-SvetlanaNeural">{{ t('tts.voiceSFormat') || 'Svetlana' }}</option>
              </optgroup>
            </select>
          </div>

          <!-- 语音服务器自建教程抽屉 -->
          <div class="border rounded-xl overflow-hidden" :class="theme.borderColor">
            <button @click="showEdgeSetup = !showEdgeSetup"
                    class="w-full p-2.5 flex items-center justify-between text-left font-medium bg-black/5 dark:bg-white/5 hover:opacity-100 transition-colors">
              <span class="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <HelpCircle class="w-3.5 h-3.5" />
                <span>{{ t('tts.howToSetupTitle') }}</span>
              </span>
              <span class="text-[10px] opacity-60">{{ showEdgeSetup ? t('tts.howToSetupClose') : t('tts.howToSetupOpen') }}</span>
            </button>
            <div v-if="showEdgeSetup" class="p-3 space-y-3 text-[11px] leading-relaxed opacity-95 border-t" :class="theme.borderColor">
              <!-- 技巧1: Edge原生 -->
              <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                <strong>{{ t('tts.tip1Title') }}</strong><br />
                <span>{{ t('tts.tip1Desc') }}</span>
              </div>

              <!-- 技巧2: Docker -->
              <div>
                <strong>{{ t('tts.tip2Title') }}</strong>
                <p class="opacity-75 mt-0.5">{{ t('tts.tip2Desc') }}</p>
                <code class="block mt-1 p-2 rounded-lg bg-black/10 dark:bg-black/30 font-mono select-all text-[10px]">
                  docker run -d -p 5001:5001 --name edge-tts-server travisvn/edge-tts-server
                </code>
              </div>

              <!-- 技巧3: Python原生自建（梁老师实操方式） -->
              <div class="pt-2 border-t" :class="theme.borderColor">
                <strong class="text-sky-600 dark:text-sky-400">{{ t('tts.tip3Title') }}</strong>
                <p class="opacity-75 mt-0.5">{{ t('tts.tip3Desc') }}</p>
                
                <p class="font-medium mt-1.5">{{ t('tts.tip3Step1') }}</p>
                <code class="block p-1.5 rounded bg-black/10 dark:bg-black/30 font-mono select-all text-[10px]">
                  pip install edge-tts flask flask-cors gunicorn
                </code>

                <p class="font-medium mt-1.5">{{ t('tts.tip3Step2') }}</p>
                <code class="block p-1.5 rounded bg-black/10 dark:bg-black/30 font-mono select-all text-[10px]">
                  gunicorn -w 2 -b 0.0.0.0:5001 edge-tts-server:app
                </code>

                <div class="mt-2 space-y-1 text-[10.5px] opacity-85">
                  <p>{{ t('tts.tip3Lan') }}</p>
                  <p>{{ t('tts.tip3Wan') }}</p>
                </div>

                <!-- 搜索关键词 -->
                <div class="mt-2 p-1.5 rounded bg-black/5 dark:bg-white/5 text-[10.5px]">
                  <span class="font-semibold">{{ t('sync.searchKeywordsLabel') }}</span>
                  <span class="font-mono ml-1">{{ t('tts.tip3Keywords') }}</span>
                </div>

                <!-- AI 提问提示词 -->
                <div class="mt-2 p-2 rounded bg-white/80 dark:bg-zinc-800/80 border border-sky-200 dark:border-sky-700/60 text-[10.5px]">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold">{{ t('sync.askAiLabel') }}</span>
                    <button @click="copyPrompt(t('tts.tip3AiPrompt'))"
                            class="px-2 py-0.5 rounded text-[10px] border border-sky-300 dark:border-sky-600 flex items-center gap-1"
                            :class="promptCopied ? 'bg-green-500 text-white border-green-500' : 'hover:bg-sky-50 dark:hover:bg-sky-950'">
                      <Check v-if="promptCopied" class="w-3 h-3" />
                      <span>{{ promptCopied ? t('sync.promptCopied') : t('sync.copyPrompt') }}</span>
                    </button>
                  </div>
                  <p class="italic opacity-85 select-all leading-snug">"{{ t('tts.tip3AiPrompt') }}"</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- 浏览器原生语音面板 -->
        <div v-if="provider === 'browser'" class="space-y-3">
          <div>
            <label class="font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('tts.browserVoiceLabel') }}</label>
            <select v-model="selectedVoiceURI" @change="onBrowserVoiceChange"
                    class="w-full px-3 py-1.5 rounded-xl border bg-transparent outline-none cursor-pointer text-xs"
                    :class="[theme.borderColor, theme.textColor]">
              <option value="">{{ t('tts.browserVoiceDefault') }}</option>
              <option v-for="v in browserVoices" :key="v.voiceURI" :value="v.voiceURI">
                {{ v.name }} ({{ v.lang }})
              </option>
            </select>
          </div>
          <p class="text-[11px] opacity-50">
            {{ t('tts.browserVoiceDesc') }}
          </p>
        </div>

        <!-- AI 语音面板 (OpenAI 兼容) -->
        <div v-if="provider === 'ai_voice'" class="space-y-3">
          <div>
            <label class="font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('tts.aiEndpointLabel') }}</label>
            <input v-model="aiVoiceEndpoint" @change="updateAiConfig"
                   class="w-full px-3 py-1.5 rounded-xl border bg-transparent text-xs" :class="theme.borderColor"
                   placeholder="https://api.siliconflow.cn/v1" />
          </div>
          <div>
            <label class="font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('tts.aiApiKeyLabel') }}</label>
            <input v-model="aiVoiceApiKey" @change="updateAiConfig" type="password"
                   class="w-full px-3 py-1.5 rounded-xl border bg-transparent text-xs" :class="theme.borderColor"
                   placeholder="sk-..." />
          </div>
          <div>
            <label class="font-medium mb-1 block opacity-70" :class="theme.textColor">{{ t('tts.aiVoiceIdLabel') }}</label>
            <input v-model="aiVoiceId" @change="updateAiConfig"
                   class="w-full px-3 py-1.5 rounded-xl border bg-transparent text-xs" :class="theme.borderColor"
                   placeholder="fnlp/MOSS-TTSD-v0.5:anna / alex / alloy" />
          </div>

          <!-- AI 语音选型、费用指南与长远规划抽屉 -->
          <div class="border rounded-xl overflow-hidden mt-2" :class="theme.borderColor">
            <button @click="showAiGuide = !showAiGuide"
                    class="w-full p-2.5 flex items-center justify-between text-left font-medium bg-black/5 dark:bg-white/5 hover:opacity-100 transition-colors">
              <span class="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <HelpCircle class="w-3.5 h-3.5" />
                <span>{{ t('tts.aiGuideTitle') }}</span>
              </span>
              <span class="text-[10px] opacity-60">{{ showAiGuide ? t('tts.aiGuideClose') : t('tts.aiGuideOpen') }}</span>
            </button>
            <div v-if="showAiGuide" class="p-3 space-y-2.5 text-[11px] leading-relaxed opacity-95 border-t" :class="theme.borderColor">
              <p>{{ t('tts.aiGuideIntro') }}</p>

              <!-- 费用说明 -->
              <div class="p-2 rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <strong>{{ t('tts.aiCostTitle') }}</strong><br />
                <span class="opacity-90">{{ t('tts.aiCostDesc') }}</span>
              </div>

              <!-- 搜索关键字 -->
              <div class="p-1.5 rounded bg-black/5 dark:bg-white/5 text-[10.5px]">
                <span class="font-semibold">{{ t('sync.searchKeywordsLabel') }}</span>
                <span class="font-mono ml-1">{{ t('tts.aiKeywords') }}</span>
              </div>

              <!-- AI 提示词与一键复制 -->
              <div class="p-2 rounded bg-white/80 dark:bg-zinc-800/80 border border-sky-200 dark:border-sky-700/60 text-[10.5px]">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold">{{ t('sync.askAiLabel') }}</span>
                  <button @click="copyPrompt(t('tts.aiPrompt'))"
                          class="px-2 py-0.5 rounded text-[10px] border border-sky-300 dark:border-sky-600 flex items-center gap-1"
                          :class="promptCopied ? 'bg-green-500 text-white border-green-500' : 'hover:bg-sky-50 dark:hover:bg-sky-950'">
                    <Check v-if="promptCopied" class="w-3 h-3" />
                    <span>{{ promptCopied ? t('sync.promptCopied') : t('sync.copyPrompt') }}</span>
                  </button>
                </div>
                <p class="italic opacity-85 select-all leading-snug">"{{ t('tts.aiPrompt') }}"</p>
              </div>

              <!-- 未来长远愿景 -->
              <div class="pt-2 border-t text-[11px] font-medium text-sky-600 dark:text-sky-400" :class="theme.borderColor">
                {{ t('tts.futureVision') }}
              </div>
            </div>
          </div>
        </div>

        <!-- 语速调节 (全局共享) -->
        <div class="pt-2 border-t" :class="theme.borderColor">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium opacity-70" :class="theme.textColor">{{ t('tts.speedLabel') }}</span>
            <span class="font-mono font-bold text-sky-600 dark:text-sky-400">{{ speechRate }}x</span>
          </div>
          <input type="range" min="0.5" max="2.0" step="0.1" v-model.number="speechRate" @input="updateSpeechRate"
                 class="w-full accent-sky-500 cursor-pointer" />
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { X, Sparkles, HelpCircle, Check } from 'lucide-vue-next'
import { useTTSStore } from '@/stores/ttsStore'
import type { TTSProvider } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const ttsStore = useTTSStore()

const props = defineProps<{
  visible: boolean
  theme: Record<string, string>
}>()

const emit = defineEmits(['close'])

const menuRef = ref<HTMLElement | null>(null)
const provider = ref<TTSProvider>(ttsStore.ttsProvider)
const localEdgeEndpoint = ref(ttsStore.edgeTTSEndpoint || 'http://p-plus.duckdns.org:5001')
const selectedEdgeVoice = ref(ttsStore.edgeTTSVoice || 'zh-CN-XiaoxiaoNeural')
const edgeAvailable = ref(true)
const showEdgeSetup = ref(false)
const showAiGuide = ref(false)
const promptCopied = ref(false)

const selectedVoiceURI = ref(ttsStore.selectedVoiceURI)
const browserVoices = ref<SpeechSynthesisVoice[]>([])
const speechRate = ref(ttsStore.speechRate)

const aiVoiceEndpoint = ref(ttsStore.aiVoiceEndpoint)
const aiVoiceApiKey = ref(ttsStore.aiVoiceApiKey)
const aiVoiceId = ref(ttsStore.aiVoiceId)

function copyPrompt(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    promptCopied.value = true
    setTimeout(() => { promptCopied.value = false }, 2500)
  })
}

function setProvider(p: TTSProvider) {
  provider.value = p
  ttsStore.setProvider(p)
}

function updateEdgeEndpoint() {
  ttsStore.setEdgeTTSEndpoint(localEdgeEndpoint.value)
}

function onEdgeVoiceChange() {
  ttsStore.setEdgeVoice(selectedEdgeVoice.value)
}

function onBrowserVoiceChange() {
  ttsStore.setVoice(selectedVoiceURI.value)
}

function updateSpeechRate() {
  ttsStore.setRate(speechRate.value)
}

function updateAiConfig() {
  ttsStore.setAIVoiceEndpoint(aiVoiceEndpoint.value)
  ttsStore.setAIVoiceApiKey(aiVoiceApiKey.value)
  ttsStore.setAIVoiceId(aiVoiceId.value)
}

async function checkServer() {
  edgeAvailable.value = await ttsStore.checkEdgeTTSServer()
}

function loadVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    browserVoices.value = window.speechSynthesis.getVoices()
  }
}

// 优雅的全局点外部自动收起 & ESC 键关闭
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
  loadVoices()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
  document.addEventListener('click', handleGlobalClick, true)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
