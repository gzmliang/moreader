<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" @click.self="$emit('close')">
    <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 border transition-colors duration-300 flex flex-col"
         :class="[theme.containerBg || 'bg-white dark:bg-zinc-900', theme.borderColor || 'border-zinc-200 dark:border-zinc-800']">
      
      <!-- Top Header & Tabs (ReadMate 风格统一导航) -->
      <div class="flex items-center justify-between pb-3 mb-5 border-b shrink-0" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
        <div class="flex items-center gap-3">
          <span class="text-xl">⚙️</span>
          <div>
            <h3 class="text-base font-bold leading-tight" :class="theme.textColor">{{ t('settings.unifiedTitle') }}</h3>
            <p class="text-[11px] opacity-50 mt-0.5" :class="theme.textColor">{{ t('settings.unifiedSubtitle') }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Switcher Tabs -->
          <div class="flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border" :class="theme.borderColor">
            <button @click="currentTab = 'voice'"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    :class="currentTab === 'voice' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              <span>🎙️</span>
              <span>{{ t('settings.tabVoice') }}</span>
            </button>
            <button @click="currentTab = 'ai'"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    :class="currentTab === 'ai' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              <span>🤖</span>
              <span>{{ t('settings.tabAi') }}</span>
            </button>
          </div>

          <button @click="$emit('close')" class="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-1" :class="theme.textColor">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- ================= 1. 语音朗读设置 (Voice Tab) ================= -->
      <div v-show="currentTab === 'voice'" class="space-y-4 text-xs">
        <!-- 引擎切换 (3 选 1 卡片) -->
        <div class="p-4 rounded-xl border bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <div class="flex items-center justify-between mb-2.5">
            <label class="font-bold opacity-80 text-xs" :class="theme.textColor">{{ t('tts.engineLabel') }}</label>
            <span class="text-[11px] opacity-50">{{ t('tts.engineHint') }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 border" :class="theme.borderColor">
            <button @click="voiceProvider = 'edge'"
                    class="py-2 px-2 rounded-lg font-medium transition-all text-center"
                    :class="voiceProvider === 'edge' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              ☁️ {{ t('tts.engineEdge') }}
            </button>
            <button @click="voiceProvider = 'browser'"
                    class="py-2 px-2 rounded-lg font-medium transition-all text-center"
                    :class="voiceProvider === 'browser' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              🔊 {{ t('tts.engineBrowser') }}
            </button>
            <button @click="voiceProvider = 'ai_voice'"
                    class="py-2 px-2 rounded-lg font-medium transition-all text-center"
                    :class="voiceProvider === 'ai_voice' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              🎙️ {{ t('tts.engineAi') }}
            </button>
          </div>
        </div>

        <!-- 语速调节 -->
        <div class="p-4 rounded-xl border flex items-center justify-between gap-4" :class="theme.borderColor">
          <div class="space-y-0.5">
            <span class="font-bold opacity-80" :class="theme.textColor">{{ t('tts.speedLabel') }}</span>
            <p class="text-[10.5px] opacity-50">{{ t('tts.speedHint') }}</p>
          </div>
          <div class="flex items-center gap-3 w-60">
            <input type="range" min="0.5" max="2.0" step="0.1" v-model.number="speechRate"
                   class="w-full accent-sky-500 cursor-pointer" />
            <span class="font-mono font-bold text-sky-600 dark:text-sky-400 w-10 text-right">{{ speechRate }}x</span>
          </div>
        </div>

        <!-- Edge TTS 专属面板 -->
        <div v-if="voiceProvider === 'edge'" class="p-4 rounded-xl border space-y-3.5 bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <!-- 黄金音色自动匹配提示 -->
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Sparkles class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div class="leading-relaxed text-[11px]">
              <span class="font-semibold">{{ t('tts.smartMatchTitle') }}</span>
              <span class="opacity-85">{{ t('tts.smartMatchDesc') }}</span>
            </div>
          </div>

          <!-- 节点地址与状态 -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="font-medium opacity-75" :class="theme.textColor">{{ t('tts.nodeEndpointLabel') }}</label>
              <span class="text-[11px] font-medium" :class="edgeAvailable ? 'text-emerald-500' : 'text-red-500'">
                {{ edgeAvailable ? t('tts.statusConnected') : t('tts.statusDisconnected') }}
              </span>
            </div>
            <div class="flex gap-1.5">
              <input v-model="localEdgeEndpoint" @change="updateEdgeEndpoint"
                     class="flex-1 px-3 py-2 rounded-xl border bg-transparent font-mono text-xs outline-none"
                     :class="theme.borderColor" placeholder="http://p-plus.duckdns.org:5001" />
              <button @click="checkEdgeServer" class="px-3 py-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 shrink-0 transition-colors font-medium" :class="theme.borderColor">
                {{ t('tts.testBtn') }}
              </button>
            </div>
          </div>

          <!-- 音色选择 (方案B：分类搜索弹窗选择器) -->
          <div>
            <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('tts.defaultVoiceLabel') }}</label>
            <div @click="openEdgeVoicePicker"
                 class="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:border-sky-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                 :class="[theme.borderColor, isDark ? 'bg-zinc-800/60' : 'bg-white']">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm font-bold shrink-0">
                  🎙️
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-xs truncate" :class="theme.textColor">
                    {{ currentEdgeVoiceDisplay }}
                  </div>
                  <div class="text-[10.5px] opacity-50 font-mono truncate">
                    {{ selectedEdgeVoice }}
                  </div>
                </div>
              </div>
              <button type="button" class="px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 ml-2 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500 transition-all flex items-center gap-1"
                      :class="theme.borderColor">
                <span>🔍</span>
                <span>{{ t('voicePicker.chooseBtn') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 浏览器原生语音面板 -->
        <div v-if="voiceProvider === 'browser'" class="p-4 rounded-xl border space-y-3 bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <div>
            <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('tts.browserVoiceLabel') }}</label>
            <div @click="openBrowserVoicePicker"
                 class="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:border-sky-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                 :class="[theme.borderColor, isDark ? 'bg-zinc-800/60' : 'bg-white']">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                  🔊
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-xs truncate" :class="theme.textColor">
                    {{ currentBrowserVoiceDisplay }}
                  </div>
                  <div class="text-[10.5px] opacity-50 font-mono truncate">
                    {{ selectedBrowserVoiceURI || t('tts.browserVoiceDefault') }}
                  </div>
                </div>
              </div>
              <button type="button" class="px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 ml-2 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all flex items-center gap-1"
                      :class="theme.borderColor">
                <span>🔍</span>
                <span>{{ t('voicePicker.chooseBtn') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- AI Voice 面板 -->
        <div v-if="voiceProvider === 'ai_voice'" class="p-4 rounded-xl border space-y-3 bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <div>
            <label class="font-medium mb-1 block opacity-75" :class="theme.textColor">{{ t('tts.aiEndpointLabel') }}</label>
            <input v-model="aiVoiceEndpoint" @change="updateAiVoiceConfig"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent font-mono text-xs outline-none"
                   :class="theme.borderColor" placeholder="https://api.siliconflow.cn/v1" />
          </div>
          <div>
            <label class="font-medium mb-1 block opacity-75" :class="theme.textColor">{{ t('tts.aiApiKeyLabel') }}</label>
            <input v-model="aiVoiceApiKey" @change="updateAiVoiceConfig" type="password"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent outline-none"
                   :class="theme.borderColor" placeholder="sk-..." />
          </div>
          <div>
            <label class="font-medium mb-1 block opacity-75" :class="theme.textColor">{{ t('tts.aiVoiceIdLabel') }}</label>
            <input v-model="aiVoiceId" @change="updateAiVoiceConfig"
                   class="w-full px-3 py-2 rounded-xl border bg-transparent font-mono text-xs outline-none"
                   :class="theme.borderColor" placeholder="fnlp/MOSS-TTSD-v0.5:anna / alloy" />
          </div>
        </div>
      </div>

      <!-- ================= 2. AI 服务商设置 (AI Tab) ================= -->
      <div v-show="currentTab === 'ai'" class="space-y-4 text-xs">
        <!-- 双语翻译引擎与通道选择 -->
        <div class="p-4 rounded-xl border bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <div class="flex items-center justify-between mb-2.5">
            <label class="font-bold opacity-80 text-xs" :class="theme.textColor">{{ t('bilingual.engineLabel') }}</label>
            <span class="text-[11px] opacity-50">{{ t('bilingual.engineSettingHint') }}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 border" :class="theme.borderColor">
            <button @click="bilingualStore.setEngine('google_free')"
                    class="py-2.5 px-3 rounded-lg font-medium transition-all text-left flex flex-col gap-0.5"
                    :class="bilingualStore.engine === 'google_free' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-xs">🌐 {{ t('bilingual.engineGoogle') }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded" :class="bilingualStore.engine === 'google_free' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'">{{ t('bilingual.engineGoogleBadge') }}</span>
              </div>
              <p class="text-[10.5px] opacity-85 leading-tight mt-1">{{ t('bilingual.engineGoogleDesc') }}</p>
            </button>
            <button @click="bilingualStore.setEngine('ai')"
                    class="py-2.5 px-3 rounded-lg font-medium transition-all text-left flex flex-col gap-0.5"
                    :class="bilingualStore.engine === 'ai' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 ' + theme.textColor">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-xs">✨ {{ t('bilingual.engineAi') }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded" :class="bilingualStore.engine === 'ai' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'">{{ t('bilingual.engineAiBadge') }}</span>
              </div>
              <p class="text-[10.5px] opacity-85 leading-tight mt-1">{{ t('bilingual.engineAiDesc') }}</p>
            </button>
          </div>
        </div>

        <!-- Provider Selection (卡片式) -->
        <div class="p-4 rounded-xl border bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <label class="font-bold mb-2.5 block opacity-80" :class="theme.textColor">{{ t('llm.provider') }}</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button v-for="key in ['siliconflow', 'deepseek', 'openrouter', 'custom']" :key="key"
              @click="handleSetLlmProvider(key as any)"
              class="py-2.5 px-3 rounded-xl border font-medium transition-all text-center"
              :class="[llmConfig.provider === key ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold shadow-sm' : 'opacity-65 hover:opacity-100 ' + (theme.borderColor || 'border-zinc-200 dark:border-zinc-800')]">
              <div class="font-semibold">{{ t('llm.' + key) || providerNames[key as LLMProvider] }}</div>
              <div class="text-[10px] opacity-60 font-normal mt-0.5">
                {{ key === 'custom' ? t('llm.subCustom') : key === 'deepseek' ? t('llm.subDeepseek') : key === 'siliconflow' ? t('llm.subSiliconflow') : t('llm.subOpenrouter') }}
              </div>
            </button>
          </div>
        </div>

        <!-- Details Box -->
        <div class="p-4 rounded-xl border space-y-3.5 bg-black/[0.01] dark:bg-white/[0.01]" :class="theme.borderColor">
          <!-- API Key -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="font-medium opacity-75" :class="theme.textColor">{{ t('llm.apiKey') }}</label>
              <span v-if="llmConfig.provider === 'custom'" class="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                {{ t('llm.optionalAuth') }}
              </span>
            </div>
            <input v-model="localLlmApiKey" type="password"
              class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none transition-colors"
              :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
              :placeholder="llmConfig.provider === 'custom' ? t('llm.customApiKeyPlaceholder') : t('llm.apiKeyRequired')" />
          </div>

          <!-- Endpoint -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="font-medium opacity-75" :class="theme.textColor">{{ t('llm.endpoint') }}</label>
              <span class="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                {{ t('llm.autoCompletePath') }}
              </span>
            </div>
            <input v-model="localLlmEndpoint"
              class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent font-mono text-xs outline-none transition-colors"
              :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
              :placeholder="llmConfig.provider === 'custom' ? t('llm.customEndpointPlaceholder') : 'https://.../v1'" />
          </div>

          <!-- Model -->
          <div>
            <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('llm.model') }}</label>
            <input v-model="localLlmModel"
              class="w-full px-3.5 py-2.5 rounded-xl border bg-transparent font-mono text-xs outline-none transition-colors"
              :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor]"
              :placeholder="llmConfig.provider === 'custom' ? t('llm.customModelPlaceholder') : 'model name'" />
          </div>

          <!-- Dual-Language Selection (源语言与目标语言对齐) -->
          <div class="grid grid-cols-2 gap-3 pt-1 border-t" :class="theme.borderColor || 'border-zinc-200 dark:border-zinc-800'">
            <div>
              <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('llm.sourceLangLabel') }}</label>
              <select v-model="localSourceLang"
                class="w-full px-3 py-2 rounded-xl border outline-none cursor-pointer text-xs"
                :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor, isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-zinc-800']">
                <option value="auto">{{ t('llm.langAuto') }}</option>
                <option value="en">English (英语)</option>
                <option value="zh-CN">中文 (简体)</option>
                <option value="zh-TW">中文 (繁體)</option>
                <option value="ja">日本語 (日语)</option>
                <option value="ko">한국어 (韩语)</option>
                <option value="fr">Français (法语)</option>
                <option value="de">Deutsch (德语)</option>
                <option value="es">Español (西班牙语)</option>
                <option value="ru">Русский (俄语)</option>
              </select>
            </div>
            <div>
              <label class="font-medium mb-1.5 block opacity-75" :class="theme.textColor">{{ t('llm.targetLangLabel') }}</label>
              <select v-model="localTargetLang"
                class="w-full px-3 py-2 rounded-xl border outline-none cursor-pointer text-xs"
                :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor, isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-zinc-800']">
                <option value="zh-CN">中文 (简体)</option>
                <option value="en">English (英语)</option>
                <option value="zh-TW">中文 (繁體)</option>
                <option value="ja">日本語 (日语)</option>
                <option value="ko">한국어 (韩语)</option>
                <option value="fr">Français (法语)</option>
                <option value="de">Deutsch (德语)</option>
                <option value="es">Español (西班牙语)</option>
                <option value="ru">Русский (俄语)</option>
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2.5 pt-2">
            <button @click="handleTestLlmConnection" :disabled="testingLlm"
              class="flex-1 py-2.5 px-4 rounded-xl border font-medium transition-all flex items-center justify-center gap-1.5"
              :class="[theme.borderColor || 'border-zinc-200 dark:border-zinc-800', theme.textColor, testingLlm ? 'opacity-50' : 'hover:bg-black/5 dark:hover:bg-white/5']">
              <RefreshCw v-if="testingLlm" class="w-3.5 h-3.5 animate-spin" />
              <span>{{ testingLlm ? t('llm.testConnection') : t('llm.testConnection') }}</span>
            </button>
            <button @click="handleSaveLlm"
              class="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-all shadow-md flex items-center justify-center gap-1.5">
              <Check v-if="savedLlmFeedback" class="w-3.5 h-3.5" />
              <span>{{ savedLlmFeedback ? t('llm.saved') : t('llm.save') }}</span>
            </button>
          </div>

          <!-- Test Result Box -->
          <div v-if="testLlmResult !== null" class="p-3 rounded-xl text-xs text-center border transition-all"
               :class="testLlmResult ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'">
            <div class="flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 v-if="testLlmResult" class="w-4 h-4 text-emerald-500" />
              <AlertCircle v-else class="w-4 h-4 text-red-500" />
              <span>{{ testLlmResult ? t('llm.connectionSuccess') : t('llm.connectionFailed') }}</span>
            </div>
            <p v-if="!testLlmResult && testLlmErrorMsg" class="text-[11px] mt-1.5 opacity-85 break-all leading-relaxed font-mono">
              {{ testLlmErrorMsg }}
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- 方案B：全功能语音选择器弹窗 (VoicePickerModal) -->
    <VoicePickerModal
      :visible="showVoicePicker"
      :mode="voicePickerMode"
      :current-voice="voicePickerMode === 'edge' ? selectedEdgeVoice : selectedBrowserVoiceURI"
      :edge-voices="ttsStore.edgeTTSVoices"
      :browser-voices="browserVoices"
      :edge-endpoint="localEdgeEndpoint"
      :theme="theme"
      :is-dark="isDark"
      @select="handleVoiceSelected"
      @close="showVoicePicker = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { X, Sparkles, RefreshCw, Check, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import VoicePickerModal from '@/components/VoicePickerModal.vue'
import { useTTSStore } from '@/stores/ttsStore'
import { useLLMStore } from '@/stores/llmStore'
import { useBilingualStore } from '@/stores/bilingualStore'
import type { TTSProvider, LLMProvider } from '@/types/book'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const ttsStore = useTTSStore()
const llmStore = useLLMStore()
const bilingualStore = useBilingualStore()

const props = defineProps<{
  visible: boolean
  initialTab?: 'voice' | 'ai'
  theme: Record<string, string>
  isDark: boolean
}>()

const emit = defineEmits(['close'])

const currentTab = ref<'voice' | 'ai'>('voice')

// ================= 1. Voice State =================
const voiceProvider = computed({
  get: () => ttsStore.ttsProvider,
  set: (p: TTSProvider) => ttsStore.setProvider(p),
})

const localEdgeEndpoint = ref(ttsStore.edgeTTSEndpoint || 'http://p-plus.duckdns.org:5001')
const selectedEdgeVoice = computed({
  get: () => ttsStore.edgeTTSVoice || 'zh-CN-XiaoxiaoNeural',
  set: (v: string) => ttsStore.setEdgeVoice(v),
})
const edgeAvailable = ref(true)

const selectedBrowserVoiceURI = computed({
  get: () => ttsStore.selectedVoiceURI,
  set: (v: string) => ttsStore.setVoice(v),
})
const browserVoices = ref<SpeechSynthesisVoice[]>([])

// 语音选择器弹窗控制 (方案B)
const showVoicePicker = ref(false)
const voicePickerMode = ref<'edge' | 'browser'>('edge')

const currentEdgeVoiceDisplay = computed(() => {
  const id = selectedEdgeVoice.value
  const v = ttsStore.edgeTTSVoices.find(item => item.id === id)
  if (v) return `${v.name} (${v.locale || v.lang})`
  return id || 'zh-CN-XiaoxiaoNeural'
})

const currentBrowserVoiceDisplay = computed(() => {
  const uri = selectedBrowserVoiceURI.value
  if (!uri) return t('tts.browserVoiceDefault')
  const v = browserVoices.value.find(item => (item.voiceURI === uri || item.name === uri))
  if (v) return `${v.name.replace(/^Microsoft /, '')} (${v.lang})`
  return uri
})

function openEdgeVoicePicker() {
  voicePickerMode.value = 'edge'
  showVoicePicker.value = true
  ttsStore.syncEdgeVoices().catch(() => {})
}

function openBrowserVoicePicker() {
  voicePickerMode.value = 'browser'
  loadBrowserVoices()
  showVoicePicker.value = true
}

function handleVoiceSelected(voiceId: string) {
  if (voicePickerMode.value === 'edge') {
    selectedEdgeVoice.value = voiceId
  } else {
    selectedBrowserVoiceURI.value = voiceId
  }
}

const speechRate = computed({
  get: () => ttsStore.speechRate,
  set: (r: number) => ttsStore.setRate(r),
})

const aiVoiceEndpoint = ref(ttsStore.aiVoiceEndpoint)
const aiVoiceApiKey = ref(ttsStore.aiVoiceApiKey)
const aiVoiceId = ref(ttsStore.aiVoiceId)

function updateEdgeEndpoint() {
  ttsStore.setEdgeTTSEndpoint(localEdgeEndpoint.value)
}

async function checkEdgeServer() {
  edgeAvailable.value = await ttsStore.checkEdgeTTSServer()
}

function updateAiVoiceConfig() {
  ttsStore.setAIVoiceEndpoint(aiVoiceEndpoint.value)
  ttsStore.setAIVoiceApiKey(aiVoiceApiKey.value)
  ttsStore.setAIVoiceId(aiVoiceId.value)
}

function loadBrowserVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    browserVoices.value = window.speechSynthesis.getVoices()
  }
}

// ================= 2. AI State =================
const llmConfig = computed(() => llmStore.config)
const testingLlm = ref(false)
const testLlmResult = ref<boolean | null>(null)
const testLlmErrorMsg = ref('')
const savedLlmFeedback = ref(false)

const localLlmApiKey = ref('')
const localLlmEndpoint = ref('')
const localLlmModel = ref('')
const localSourceLang = ref(llmStore.sourceLang || 'auto')
const localTargetLang = ref(llmStore.targetLang || 'zh-CN')

const providerNames: Record<LLMProvider, string> = {
  siliconflow: 'SiliconFlow',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  custom: 'Custom',
}

function syncFromLlmConfig() {
  localLlmApiKey.value = llmConfig.value.apiKey
  localLlmEndpoint.value = llmConfig.value.endpoint
  localLlmModel.value = llmConfig.value.model
  localSourceLang.value = llmStore.sourceLang || 'auto'
  localTargetLang.value = llmStore.targetLang || 'zh-CN'
}

const handleSetLlmProvider = (p: LLMProvider) => {
  llmStore.updateConfig(localLlmApiKey.value, localLlmEndpoint.value, localLlmModel.value)
  llmStore.setProvider(p)
  syncFromLlmConfig()
  testLlmResult.value = null
  testLlmErrorMsg.value = ''
  savedLlmFeedback.value = false
}

const handleSaveLlm = () => {
  llmStore.updateConfig(localLlmApiKey.value, localLlmEndpoint.value, localLlmModel.value)
  llmStore.setLanguages(localSourceLang.value, localTargetLang.value)
  testLlmResult.value = null
  testLlmErrorMsg.value = ''
  savedLlmFeedback.value = true
  setTimeout(() => { savedLlmFeedback.value = false }, 2000)
}

const handleTestLlmConnection = async () => {
  handleSaveLlm()
  testingLlm.value = true
  testLlmResult.value = null
  testLlmErrorMsg.value = ''
  const result = await llmStore.testConnection()
  testingLlm.value = false
  testLlmResult.value = result.success
  testLlmErrorMsg.value = result.error || ''
}

// Global Key & Visibility Listeners
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    if (props.initialTab) currentTab.value = props.initialTab
    syncFromLlmConfig()
    loadBrowserVoices()
    testLlmResult.value = null
    testLlmErrorMsg.value = ''
    savedLlmFeedback.value = false
  }
})

onMounted(() => {
  loadBrowserVoices()
  syncFromLlmConfig()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadBrowserVoices
  }
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
