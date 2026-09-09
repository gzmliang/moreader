<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div
      class="relative w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden z-10 transition-all"
      :class="[themeClasses.menuBgClass, themeClasses.borderColor]"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b" :class="themeClasses.borderColor">
        <div class="flex items-center gap-3">
          <span class="text-xl">💡</span>
          <div>
            <h2 class="text-base font-bold tracking-tight" :class="themeClasses.textColor">
              {{ t('aiReading.title') }}
            </h2>
            <p class="text-xs opacity-60 truncate max-w-md" :class="themeClasses.textColor">
              {{ chapterTitle || t('aiReading.quizScopeChapter') }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Top Navigation Tabs -->
          <div class="flex items-center p-1 rounded-lg bg-black/5 dark:bg-white/10">
            <button
              @click="activeTab = 'summary'"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="activeTab === 'summary' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabSummary') }}
            </button>
            <button
              @click="activeTab = 'quiz'"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="activeTab === 'quiz' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabQuiz') }}
            </button>
          </div>

          <!-- Close Button -->
          <button
            @click="$emit('close')"
            class="p-2 rounded-lg opacity-60 hover:opacity-100 transition-colors ml-2"
            :class="themeClasses.textColor"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Error Alert -->
        <div v-if="aiStore.errorMsg" class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center justify-between">
          <span>{{ aiStore.errorMsg }}</span>
          <button @click="aiStore.errorMsg = ''" class="hover:underline ml-2">✕</button>
        </div>

        <!-- ================= TAB 1: 归纳 & BLINKIST ================= -->
        <div v-if="activeTab === 'summary'" class="space-y-5">
          <!-- Controls Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]" :class="themeClasses.borderColor">
            <div class="flex flex-wrap items-center gap-4 text-xs">
              <!-- Ratio -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.ratioLabel') }}:</span>
                <select
                  v-model="selectedRatio"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingSummary"
                >
                  <option value="20" class="text-black">{{ t('aiReading.ratio20') }}</option>
                  <option value="50" class="text-black">{{ t('aiReading.ratio50') }}</option>
                  <option value="70" class="text-black">{{ t('aiReading.ratio70') }}</option>
                </select>
              </div>

              <!-- Level -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.levelLabel') }}:</span>
                <select
                  v-model="selectedLevel"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingSummary"
                >
                  <option value="easy" class="text-black">{{ t('aiReading.levelEasy') }}</option>
                  <option value="standard" class="text-black">{{ t('aiReading.levelStandard') }}</option>
                  <option value="advanced" class="text-black">{{ t('aiReading.levelAdvanced') }}</option>
                </select>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
              <span v-if="hasSummaryCache" class="px-2 py-0.5 rounded text-[11px] font-medium bg-green-500/15 text-green-500 border border-green-500/30">
                {{ t('aiReading.cachedBadge') }}
              </span>

              <button
                @click="triggerGenerateSummary"
                :disabled="aiStore.isGeneratingSummary"
                class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5 shadow"
              >
                <Loader2 v-if="aiStore.isGeneratingSummary" class="w-3.5 h-3.5 animate-spin" />
                <RotateCw v-else-if="hasSummaryCache" class="w-3.5 h-3.5" />
                <Sparkles v-else class="w-3.5 h-3.5" />
                <span>{{ hasSummaryCache ? t('aiReading.regenerate') : t('aiReading.generate') }}</span>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!aiStore.currentSummaryData?.blinkist?.fullMarkdown && !aiStore.isGeneratingSummary" class="py-12 text-center space-y-3">
            <div class="text-4xl opacity-40">📚</div>
            <p class="text-xs opacity-60 max-w-sm mx-auto" :class="themeClasses.textColor">
              {{ t('aiReading.emptySummaryHint') }}
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="aiStore.isGeneratingSummary" class="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
            <p class="text-xs opacity-70 animate-pulse" :class="themeClasses.textColor">
              {{ t('aiReading.generating') }}
            </p>
          </div>

          <!-- Summary Content Display -->
          <div v-if="aiStore.currentSummaryData?.blinkist?.fullMarkdown && !aiStore.isGeneratingSummary" class="space-y-4">
            <!-- Action Toolbar for Content -->
            <div class="flex items-center justify-end gap-2 text-xs">
              <button
                @click="copyMarkdownContent"
                class="px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                :class="[themeClasses.borderColor, themeClasses.textColor]"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copySuccess ? t('aiReading.copied') : t('aiReading.copyMarkdown') }}</span>
              </button>
              <button
                @click="playSummaryVoice"
                class="px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                :class="[themeClasses.borderColor, themeClasses.textColor]"
              >
                <Volume2 class="w-3.5 h-3.5 text-blue-500" />
                <span>{{ t('aiReading.playTts') }}</span>
              </button>
            </div>

            <!-- Markdown Presentation -->
            <div
              class="p-5 rounded-xl border prose prose-sm max-w-none dark:prose-invert leading-relaxed space-y-3 bg-black/[0.01] dark:bg-white/[0.01]"
              :class="[themeClasses.borderColor, themeClasses.textColor]"
            >
              <div v-html="renderedMarkdown"></div>
            </div>
          </div>
        </div>

        <!-- ================= TAB 2: 小聪章节测验 ================= -->
        <div v-if="activeTab === 'quiz'" class="space-y-5">
          <!-- Quiz Config Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]" :class="themeClasses.borderColor">
            <div class="flex flex-wrap items-center gap-4 text-xs">
              <!-- Scope -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizScopeLabel') }}:</span>
                <select
                  v-model="quizScope"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingQuiz"
                >
                  <option value="chapter" class="text-black">{{ t('aiReading.quizScopeChapter') }}</option>
                  <option value="book" class="text-black">{{ t('aiReading.quizScopeBook') }}</option>
                </select>
              </div>

              <!-- Count -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizCountLabel') }}:</span>
                <select
                  v-model="quizCount"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingQuiz"
                >
                  <option :value="3" class="text-black">3 题</option>
                  <option :value="5" class="text-black">5 题</option>
                  <option :value="10" class="text-black">10 题</option>
                </select>
              </div>

              <!-- Level -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizLevelLabel') }}:</span>
                <select
                  v-model="quizLevel"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingQuiz"
                >
                  <option value="detail" class="text-black">{{ t('aiReading.quizLevelDetail') }}</option>
                  <option value="infer" class="text-black">{{ t('aiReading.quizLevelInfer') }}</option>
                </select>
              </div>
            </div>

            <!-- Action Button -->
            <div class="flex items-center gap-2">
              <button
                @click="triggerGenerateQuiz"
                :disabled="aiStore.isGeneratingQuiz"
                class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow"
              >
                <Loader2 v-if="aiStore.isGeneratingQuiz" class="w-3.5 h-3.5 animate-spin" />
                <RotateCw v-else-if="hasQuizCache" class="w-3.5 h-3.5" />
                <Award v-else class="w-3.5 h-3.5" />
                <span>{{ hasQuizCache ? t('aiReading.regenerate') : t('aiReading.generateQuizBtn') }}</span>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!aiStore.currentQuizData?.questions?.length && !aiStore.isGeneratingQuiz" class="py-12 text-center space-y-3">
            <div class="text-4xl opacity-40">🎯</div>
            <p class="text-xs opacity-60 max-w-sm mx-auto" :class="themeClasses.textColor">
              {{ t('aiReading.emptyQuizHint') }}
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="aiStore.isGeneratingQuiz" class="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 class="w-8 h-8 animate-spin text-emerald-500" />
            <p class="text-xs opacity-70 animate-pulse" :class="themeClasses.textColor">
              {{ t('aiReading.generating') }}
            </p>
          </div>

          <!-- Quiz Interactive Cards Display -->
          <div v-if="aiStore.currentQuizData?.questions?.length && !aiStore.isGeneratingQuiz" class="space-y-6">
            <!-- Score Banner (when answered) -->
            <div
              v-if="answeredCount > 0"
              class="flex items-center justify-between p-3.5 rounded-xl border"
              :class="isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30'"
            >
              <div class="flex items-center gap-2">
                <span class="text-base">{{ isCompleted ? '🏆' : '📝' }}</span>
                <div>
                  <span class="text-xs font-bold" :class="themeClasses.textColor">
                    {{ t('aiReading.scoreReport', { score: scoreCount, total: totalQuestions, percent: scorePercent }) }}
                  </span>
                  <p v-if="isCompleted" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {{ scorePercent === 100 ? t('aiReading.congratsPerfect') : t('aiReading.congratsGood') }}
                  </p>
                </div>
              </div>
              <button
                @click="aiStore.resetQuizAnswers()"
                class="px-2.5 py-1 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-colors"
                :class="[themeClasses.borderColor, themeClasses.textColor]"
              >
                {{ t('aiReading.tryAgain') }}
              </button>
            </div>

            <!-- Question Cards -->
            <div
              v-for="(q, qIndex) in aiStore.currentQuizData.questions"
              :key="q.id"
              class="p-4 rounded-xl border space-y-3.5 transition-all"
              :class="[themeClasses.borderColor, themeClasses.menuBgClass]"
            >
              <!-- Question Text -->
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {{ qIndex + 1 }}
                </span>
                <p class="text-sm font-semibold leading-snug" :class="themeClasses.textColor">
                  {{ q.question }}
                </p>
              </div>

              <!-- Options (A / B / C / D) -->
              <div class="grid grid-cols-1 gap-2 pl-7">
                <button
                  v-for="opt in q.options"
                  :key="opt.key"
                  @click="selectAnswer(q.id, opt.key)"
                  class="flex items-center gap-3 p-2.5 rounded-lg border text-left text-xs transition-all relative overflow-hidden group"
                  :class="getOptionClass(q, opt.key)"
                >
                  <span
                    class="w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border"
                    :class="getOptionBadgeClass(q, opt.key)"
                  >
                    {{ opt.key }}
                  </span>
                  <span class="flex-1" :class="themeClasses.textColor">{{ opt.text }}</span>
                  <!-- Check or Cross Icon -->
                  <span v-if="q.userAnswer && opt.key === q.answer" class="text-emerald-500 font-bold ml-auto">✓</span>
                  <span v-else-if="q.userAnswer === opt.key && opt.key !== q.answer" class="text-red-500 font-bold ml-auto">✗</span>
                </button>
              </div>

              <!-- Xiao Cong Teacher Explanation (Shows after answered) -->
              <div
                v-if="q.userAnswer"
                class="ml-7 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1 animate-fadeIn"
              >
                <div class="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span>{{ t('aiReading.explanationTitle') }}</span>
                  <span class="text-[11px] font-normal opacity-80">
                    ({{ q.userAnswer === q.answer ? t('aiReading.correctLabel') : t('aiReading.wrongLabel', { answer: q.answer }) }})
                  </span>
                </div>
                <p class="leading-relaxed opacity-90" :class="themeClasses.textColor">
                  {{ q.explanation }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { X, Sparkles, RotateCw, Volume2, Copy, Award, Loader2 } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useTheme } from '@/composables/useTheme'
import { useAiReadingStore } from '@/stores/aiReadingStore'
import { useTTSStore } from '@/stores/ttsStore'
import type { BlinkistRatio, BlinkistLevel, QuizCount, QuizScope, QuizLevel, QuizQuestion } from '@/types/aiReading'

const props = defineProps<{
  visible: boolean
  bookId: string
  chapterHref: string
  chapterTitle: string
  chapterText: string
  isChineseBook?: boolean
}>()

const emit = defineEmits(['close'])

const { t } = useI18n()
const { themeClasses } = useTheme()
const aiStore = useAiReadingStore()
const ttsStore = useTTSStore()

const activeTab = ref<'summary' | 'quiz'>('summary')
const selectedRatio = ref<BlinkistRatio>('50')
const selectedLevel = ref<BlinkistLevel>('standard')
const quizScope = ref<QuizScope>('chapter')
const quizCount = ref<QuizCount>(5)
const quizLevel = ref<QuizLevel>('detail')
const copySuccess = ref(false)

const hasSummaryCache = computed(() => !!aiStore.currentSummaryData?.blinkist?.fullMarkdown)
const hasQuizCache = computed(() => !!aiStore.currentQuizData?.questions?.length)

// Check if all questions are answered
const totalQuestions = computed(() => aiStore.currentQuizData?.questions?.length || 0)
const answeredCount = computed(() => aiStore.currentQuizData?.questions?.filter(q => !!q.userAnswer).length || 0)
const scoreCount = computed(() => aiStore.currentQuizData?.questions?.filter(q => q.userAnswer === q.answer).length || 0)
const scorePercent = computed(() => totalQuestions.value ? Math.round((scoreCount.value / totalQuestions.value) * 100) : 0)
const isCompleted = computed(() => totalQuestions.value > 0 && answeredCount.value === totalQuestions.value)

// Simple markdown to HTML renderer
const renderedMarkdown = computed(() => {
  const md = aiStore.currentSummaryData?.blinkist?.fullMarkdown || ''
  if (!md) return ''
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-4 mb-2 pb-1 border-b opacity-90">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-extrabold mt-5 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[•\-*] (.*$)/gim, '<div class="flex items-start gap-1.5 my-1 ml-2"><span class="text-blue-500">•</span><span>$1</span></div>')
    .replace(/\n\n+/g, '<div class="my-2"></div>')
})

const selectAnswer = (questionId: string, key: 'A' | 'B' | 'C' | 'D') => {
  aiStore.answerQuestion(questionId, key)
}

const getOptionClass = (q: QuizQuestion, key: string) => {
  if (!q.userAnswer) {
    return 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent bg-black/[0.02] dark:bg-white/[0.02]'
  }
  if (key === q.answer) {
    return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium'
  }
  if (q.userAnswer === key) {
    return 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
  }
  return 'opacity-40 border-transparent'
}

const getOptionBadgeClass = (q: QuizQuestion, key: string) => {
  if (!q.userAnswer) {
    return 'border-black/20 dark:border-white/20'
  }
  if (key === q.answer) {
    return 'bg-emerald-500 text-white border-emerald-500'
  }
  if (q.userAnswer === key) {
    return 'bg-red-500 text-white border-red-500'
  }
  return 'border-black/20 dark:border-white/20'
}

const triggerGenerateSummary = async () => {
  if (!props.chapterText || props.chapterText.length < 50) {
    aiStore.errorMsg = t('aiReading.noChapterContent')
    return
  }
  try {
    await aiStore.generateBlinkistBook({
      bookId: props.bookId,
      chapterHref: props.chapterHref,
      chapterTitle: props.chapterTitle,
      chapterText: props.chapterText,
      ratio: selectedRatio.value,
      level: selectedLevel.value,
      isChineseBook: props.isChineseBook,
    })
  } catch {}
}

const triggerGenerateQuiz = async () => {
  if (!props.chapterText || props.chapterText.length < 50) {
    aiStore.errorMsg = t('aiReading.noChapterContent')
    return
  }
  try {
    await aiStore.generateQuiz({
      bookId: props.bookId,
      chapterHref: props.chapterHref,
      chapterTitle: props.chapterTitle,
      chapterText: props.chapterText,
      count: quizCount.value,
      scope: quizScope.value,
      level: quizLevel.value,
      isChineseBook: props.isChineseBook,
    })
  } catch {}
}

const copyMarkdownContent = () => {
  const md = aiStore.currentSummaryData?.blinkist?.fullMarkdown || ''
  if (!md) return
  navigator.clipboard.writeText(md)
  copySuccess.value = true
  setTimeout(() => { copySuccess.value = false }, 2000)
}

const playSummaryVoice = () => {
  const md = aiStore.currentSummaryData?.blinkist?.fullMarkdown || ''
  if (!md) return
  const plainText = md.replace(/[#*•\-`]/g, '').trim()
  ttsStore.speakSelection(plainText)
}

// Watch chapter change to load cached data
const checkAndLoadCache = async () => {
  if (!props.bookId || !props.chapterHref) return
  await aiStore.loadSummaryCache(props.bookId, props.chapterHref, selectedRatio.value, selectedLevel.value)
  await aiStore.loadQuizCache(props.bookId, props.chapterHref, quizCount.value, quizScope.value, quizLevel.value)
}

watch(() => [props.bookId, props.chapterHref, selectedRatio.value, selectedLevel.value], () => {
  if (props.visible) checkAndLoadCache()
})

watch(() => props.visible, (v) => {
  if (v) checkAndLoadCache()
})

onMounted(() => {
  if (props.visible) checkAndLoadCache()
})
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.25s ease forwards;
}
</style>
