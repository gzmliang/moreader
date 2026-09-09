<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div
      class="relative w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden z-10 transition-all"
      :class="[themeClasses.menuBgClass, themeClasses.borderColor]"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-3.5 border-b shrink-0" :class="themeClasses.borderColor">
        <div class="flex items-center gap-3">
          <span class="text-xl">💡</span>
          <div>
            <h2 class="text-base font-bold tracking-tight" :class="themeClasses.textColor">
              {{ t('aiReading.title') }}
            </h2>
            <p class="text-xs opacity-60 truncate max-w-md" :class="themeClasses.textColor">
              {{ activeScope === 'book' ? (bookTitle || t('aiReading.quizScopeBook')) : (chapterTitle || t('aiReading.quizScopeChapter')) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <!-- Font Size Adjuster (A- / A+) -->
          <div class="flex items-center border rounded-lg overflow-hidden shrink-0" :class="themeClasses.borderColor" :title="t('aiReading.fontSizeTitle')">
            <button
              @click="decreaseFontSize"
              class="px-2 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
              :class="themeClasses.textColor"
            >
              A-
            </button>
            <span class="px-1.5 py-1 text-[11px] font-mono opacity-80 border-x" :class="[themeClasses.borderColor, themeClasses.textColor]">
              {{ fontSizePx }}px
            </span>
            <button
              @click="increaseFontSize"
              class="px-2 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
              :class="themeClasses.textColor"
            >
              A+
            </button>
          </div>

          <!-- Top Navigation Tabs (四标签：归纳 / 人物脉络 / 自测 / 成绩单) -->
          <div class="flex items-center p-1 rounded-lg bg-black/5 dark:bg-white/10 shrink-0">
            <button
              @click="activeTab = 'summary'"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1"
              :class="activeTab === 'summary' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabSummary') }}
            </button>
            <button
              @click="activeTab = 'map'"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1"
              :class="activeTab === 'map' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabMap') }}
            </button>
            <button
              @click="activeTab = 'quiz'"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1"
              :class="activeTab === 'quiz' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabQuiz') }}
            </button>
            <button
              @click="openHistoryTab"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1"
              :class="activeTab === 'history' ? 'bg-blue-500 text-white shadow' : [themeClasses.textColor, 'opacity-70 hover:opacity-100']"
            >
              {{ t('aiReading.tabHistory') }}
            </button>
          </div>

          <!-- Close Button -->
          <button
            @click="$emit('close')"
            class="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-colors"
            :class="themeClasses.textColor"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Modal Body (Scrollable with dynamic CSS variable for font size) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 ai-modal-body" :style="{ '--ai-dynamic-font-size': fontSizePx + 'px' }">
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
              <!-- Scope -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizScopeLabel') }}:</span>
                <select
                  v-model="summaryScope"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingSummary"
                >
                  <option value="chapter" class="text-black">{{ t('aiReading.quizScopeChapter') }}</option>
                  <option value="book" class="text-black">{{ t('aiReading.quizScopeBook') }}</option>
                </select>
              </div>

              <!-- Ratio (自由数值输入 10-80%) -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.ratioLabel') }}:</span>
                <div class="flex items-center border rounded px-1.5 py-0.5 bg-transparent" :class="themeClasses.borderColor">
                  <input
                    type="number"
                    min="10"
                    max="80"
                    step="5"
                    v-model.number="selectedRatio"
                    class="w-12 text-xs bg-transparent outline-none font-mono text-center"
                    :class="themeClasses.textColor"
                    :disabled="aiStore.isGeneratingSummary"
                  />
                  <span class="text-xs opacity-70" :class="themeClasses.textColor">%</span>
                </div>
              </div>

              <!-- Language Mode (读伴哲学：双语 / 仅原文 / 仅译文) -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.langModeLabel') }}:</span>
                <select
                  v-model="summaryLangMode"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingSummary"
                >
                  <option value="bilingual" class="text-black">{{ t('aiReading.langModeBilingual') }}</option>
                  <option value="original" class="text-black">{{ t('aiReading.langModeOriginal') }}</option>
                  <option value="target" class="text-black">{{ t('aiReading.langModeTarget') }}</option>
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
                @click="copyMarkdownContent(aiStore.currentSummaryData?.blinkist?.fullMarkdown || '')"
                class="px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                :class="[themeClasses.borderColor, themeClasses.textColor]"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copySuccess ? t('aiReading.copied') : t('aiReading.copyMarkdown') }}</span>
              </button>
              <button
                @click="playSummaryVoice(aiStore.currentSummaryData?.blinkist?.fullMarkdown || '')"
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

        <!-- ================= TAB 2: 人物与情节脉络图谱 (Character & Plot Map) ================= -->
        <div v-if="activeTab === 'map'" class="space-y-5">
          <!-- Map Config Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]" :class="themeClasses.borderColor">
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizScopeLabel') }}:</span>
                <select
                  v-model="mapScope"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingMap"
                >
                  <option value="chapter" class="text-black">{{ t('aiReading.quizScopeChapter') }}</option>
                  <option value="book" class="text-black">{{ t('aiReading.quizScopeBook') }}</option>
                </select>
              </div>
              <!-- Language Mode for Map -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.langModeLabel') }}:</span>
                <select
                  v-model="mapLangMode"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingMap"
                >
                  <option value="bilingual" class="text-black">{{ t('aiReading.langModeBilingual') }}</option>
                  <option value="original" class="text-black">{{ t('aiReading.langModeOriginal') }}</option>
                  <option value="target" class="text-black">{{ t('aiReading.langModeTarget') }}</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span v-if="hasMapCache" class="px-2 py-0.5 rounded text-[11px] font-medium bg-green-500/15 text-green-500 border border-green-500/30">
                {{ t('aiReading.cachedBadge') }}
              </span>

              <button
                @click="triggerGenerateMap"
                :disabled="aiStore.isGeneratingMap"
                class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow"
              >
                <Loader2 v-if="aiStore.isGeneratingMap" class="w-3.5 h-3.5 animate-spin" />
                <RotateCw v-else-if="hasMapCache" class="w-3.5 h-3.5" />
                <Network v-else class="w-3.5 h-3.5" />
                <span>{{ hasMapCache ? t('aiReading.regenerate') : t('aiReading.mapGenerateBtn') }}</span>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!currentMapData && !aiStore.isGeneratingMap" class="py-12 text-center space-y-3">
            <div class="text-4xl opacity-40">🕸️</div>
            <p class="text-xs opacity-60 max-w-sm mx-auto" :class="themeClasses.textColor">
              {{ t('aiReading.mapEmptyHint') }}
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="aiStore.isGeneratingMap" class="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
            <p class="text-xs opacity-70 animate-pulse" :class="themeClasses.textColor">
              {{ t('aiReading.generating') }}
            </p>
          </div>

          <!-- Rendered Map Cards & SVG Network -->
          <div v-if="currentMapData && !aiStore.isGeneratingMap" class="space-y-6">
            <!-- Summary Banner -->
            <div class="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/20 space-y-1">
              <h4 class="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                {{ t('aiReading.mapSummaryTitle') }}
              </h4>
              <p class="leading-relaxed opacity-90 text-xs" :class="themeClasses.textColor">
                {{ currentMapData.summary }}
              </p>
            </div>

            <!-- Visual SVG Relationship Graph (墨笺轻量图谱架构) -->
            <div class="p-5 rounded-xl border bg-black/[0.01] dark:bg-white/[0.01] space-y-3" :class="themeClasses.borderColor">
              <h4 class="font-bold text-xs flex items-center gap-1.5" :class="themeClasses.textColor">
                {{ t('aiReading.mapEdgesTitle') }}
              </h4>

              <!-- Visual Connections (带呼吸感的流式防挤压卡片) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div
                  v-for="(edge, eIdx) in currentMapData.edges"
                  :key="eIdx"
                  class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.02] transition-all hover:border-indigo-500/40"
                  :class="themeClasses.borderColor"
                >
                  <div class="flex items-center gap-2 flex-wrap max-w-full">
                    <span class="font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs shrink-0">
                      {{ edge.from }}
                    </span>
                    <span class="text-xs opacity-50 shrink-0 font-bold">➔</span>
                    <span class="font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                      {{ edge.to }}
                    </span>
                  </div>
                  <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-normal">
                    {{ edge.relation }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Character Nodes (Roles & Factions) -->
            <div class="p-5 rounded-xl border space-y-3" :class="themeClasses.borderColor">
              <h4 class="font-bold text-xs flex items-center gap-1.5" :class="themeClasses.textColor">
                {{ t('aiReading.mapNodesTitle') }}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div
                  v-for="(node, nIdx) in currentMapData.nodes"
                  :key="nIdx"
                  class="p-3 rounded-xl border space-y-1.5 bg-black/[0.01] dark:bg-white/[0.01]"
                  :class="themeClasses.borderColor"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs" :class="themeClasses.textColor">{{ node.name }}</span>
                    <span v-if="node.faction" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                      {{ node.faction }}
                    </span>
                  </div>
                  <p v-if="node.role" class="text-[11px] opacity-70 leading-snug" :class="themeClasses.textColor">
                    {{ node.role }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Plot Progression Timeline -->
            <div v-if="currentMapData.timeline?.length" class="p-5 rounded-xl border space-y-3" :class="themeClasses.borderColor">
              <h4 class="font-bold text-xs flex items-center gap-1.5" :class="themeClasses.textColor">
                {{ t('aiReading.mapTimelineTitle') }}
              </h4>
              <div class="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/30">
                <div
                  v-for="(item, tIdx) in currentMapData.timeline"
                  :key="tIdx"
                  class="relative space-y-1"
                >
                  <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-zinc-900"></span>
                  <div class="font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                    {{ item.stage }}
                  </div>
                  <p class="text-xs opacity-85 leading-relaxed" :class="themeClasses.textColor">
                    {{ item.event }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= TAB 3: 小聪章节测验 (Quiz) ================= -->
        <div v-if="activeTab === 'quiz'" class="space-y-5">
          <!-- Quiz Config Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]" :class="themeClasses.borderColor">
            <div class="flex flex-wrap items-center gap-3.5 text-xs">
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

              <!-- Count (100% i18n 规范) -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizCountLabel') }}:</span>
                <select
                  v-model="quizCount"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                  :disabled="aiStore.isGeneratingQuiz"
                >
                  <option :value="3" class="text-black">{{ t('aiReading.quizCountOption', { count: 3 }) }}</option>
                  <option :value="5" class="text-black">{{ t('aiReading.quizCountOption', { count: 5 }) }}</option>
                  <option :value="10" class="text-black">{{ t('aiReading.quizCountOption', { count: 10 }) }}</option>
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

              <!-- Feedback Mode (关键修复：纯前端无感切换，绝不刷接口) -->
              <div class="flex items-center gap-1.5">
                <span class="opacity-70" :class="themeClasses.textColor">{{ t('aiReading.quizModeLabel') }}:</span>
                <select
                  v-model="quizFeedbackMode"
                  class="px-2 py-1 rounded border text-xs bg-transparent"
                  :class="[themeClasses.borderColor, themeClasses.textColor]"
                >
                  <option value="instant" class="text-black">{{ t('aiReading.quizModeInstant') }}</option>
                  <option value="submit" class="text-black">{{ t('aiReading.quizModeSubmit') }}</option>
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
            <!-- Score Banner (when revealed) -->
            <div
              v-if="shouldRevealAnswers"
              class="flex items-center justify-between p-3.5 rounded-xl border animate-fadeIn"
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

                  <!-- On Reveal: Check or Cross Icon -->
                  <template v-if="shouldRevealQuestion(q)">
                    <span v-if="opt.key === q.answer" class="text-emerald-500 font-bold ml-auto">✓</span>
                    <span v-else-if="q.userAnswer === opt.key && opt.key !== q.answer" class="text-red-500 font-bold ml-auto">✗</span>
                  </template>
                  <!-- On Submit Mode (Unrevealed): Selected Indicator -->
                  <template v-else-if="q.userAnswer === opt.key">
                    <span class="w-2 h-2 rounded-full bg-blue-500 ml-auto"></span>
                  </template>
                </button>
              </div>

              <!-- Xiao Cong Teacher Explanation -->
              <div
                v-if="shouldRevealQuestion(q)"
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

            <!-- Submit Button for Submit Mode -->
            <div v-if="isSubmitMode && !aiStore.currentQuizData.isSubmitted" class="pt-2 text-center space-y-2">
              <button
                @click="aiStore.submitQuizAnswers()"
                :disabled="answeredCount < totalQuestions"
                class="px-6 py-2.5 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md"
              >
                {{ t('aiReading.submitQuizBtn') }}
              </button>
              <p class="text-[11px] opacity-60">
                {{ t('aiReading.submitQuizTip', { total: totalQuestions }) }} ({{ answeredCount }}/{{ totalQuestions }})
              </p>
            </div>
          </div>
        </div>

        <!-- ================= TAB 4: 答题历史与逐题复盘成绩单 (Reports & Detailed Review) ================= -->
        <div v-if="activeTab === 'history'" class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b" :class="themeClasses.borderColor">
            <div class="flex items-center gap-3">
              <button
                v-if="expandedHistoryIds.length > 0"
                @click="expandedHistoryIds = []"
                class="px-2.5 py-1 text-xs rounded-lg border font-medium bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1"
              >
                <span>{{ t('aiReading.historyBackToList') }}</span>
              </button>
              <h3 class="text-sm font-bold flex items-center gap-2" :class="themeClasses.textColor">
                <span>📊</span>
                <span>{{ t('aiReading.historyTitle') }}</span>
              </h3>
            </div>
            <button
              v-if="aiStore.quizHistory.length > 0"
              @click="clearHistory"
              class="text-[11px] text-red-500 hover:underline"
            >
              {{ t('aiReading.clearHistoryBtn') }}
            </button>
          </div>

          <!-- Empty History -->
          <div v-if="aiStore.quizHistory.length === 0" class="py-12 text-center space-y-3">
            <div class="text-4xl opacity-30">📈</div>
            <p class="text-xs opacity-60 max-w-sm mx-auto" :class="themeClasses.textColor">
              {{ t('aiReading.historyEmpty') }}
            </p>
          </div>

          <!-- History Records List with Detailed Review Toggle -->
          <div v-else class="space-y-3.5">
            <div
              v-for="record in aiStore.quizHistory"
              :key="record.id"
              class="p-4 rounded-xl border space-y-3 bg-black/[0.01] dark:bg-white/[0.01] transition-all"
              :class="themeClasses.borderColor"
            >
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <h4 class="text-xs font-bold leading-tight" :class="themeClasses.textColor">
                    {{ record.chapterTitle || t('aiReading.quizScopeChapter') }}
                  </h4>
                  <p class="text-[11px] opacity-60 font-mono">
                    {{ formatTimestamp(record.timestamp) }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <span
                      class="text-sm font-black font-mono"
                      :class="record.percent >= 80 ? 'text-emerald-500' : record.percent >= 60 ? 'text-blue-500' : 'text-amber-500'"
                    >
                      {{ record.score }}/{{ record.total }}
                    </span>
                    <span class="text-[11px] opacity-70 ml-1 font-mono">({{ record.percent }}%)</span>
                  </div>
                  <!-- Review Details Toggle Button -->
                  <button
                    @click="toggleHistoryDetail(record.id)"
                    class="px-2.5 py-1 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-colors flex items-center gap-1"
                    :class="[themeClasses.borderColor, themeClasses.textColor]"
                  >
                    <span>{{ expandedHistoryIds.includes(record.id) ? t('aiReading.hideHistoryDetail') : t('aiReading.viewHistoryDetail') }}</span>
                  </button>
                </div>
              </div>

              <!-- Badges -->
              <div class="flex items-center gap-2 text-[10.5px]">
                <span class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-75">
                  {{ record.feedbackMode === 'instant' ? t('aiReading.quizModeInstant') : t('aiReading.quizModeSubmit') }}
                </span>
                <span class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-75">
                  {{ record.level === 'detail' ? t('aiReading.quizLevelDetail') : t('aiReading.quizLevelInfer') }}
                </span>
                <span class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-75">
                  {{ record.scope === 'book' ? t('aiReading.quizScopeBook') : t('aiReading.quizScopeChapter') }}
                </span>
              </div>

              <!-- Detailed Questions & Answers Breakdown (逐题复盘) -->
              <div
                v-if="expandedHistoryIds.includes(record.id)"
                class="pt-3 border-t space-y-3 animate-fadeIn"
                :class="themeClasses.borderColor"
              >
                <div
                  v-for="(hq, hIdx) in record.questions"
                  :key="hq.id || hIdx"
                  class="p-3 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02] space-y-2 text-xs"
                  :class="themeClasses.borderColor"
                >
                  <div class="font-bold flex items-start gap-1.5" :class="themeClasses.textColor">
                    <span class="text-blue-500 shrink-0">{{ t('aiReading.historyQuestionIndex', { n: hIdx + 1 }) }}:</span>
                    <span>{{ hq.question }}</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-[11.5px]">
                    <div
                      v-for="opt in hq.options"
                      :key="opt.key"
                      class="flex items-center gap-1.5 p-1 rounded"
                      :class="opt.key === hq.answer ? 'text-emerald-600 dark:text-emerald-400 font-bold' : (hq.userAnswer === opt.key ? 'text-red-500 line-through' : 'opacity-70')"
                    >
                      <span class="w-4 text-center font-bold">{{ opt.key }}.</span>
                      <span>{{ opt.text }}</span>
                      <span v-if="opt.key === hq.answer" class="text-emerald-500 text-xs">✓</span>
                      <span v-else-if="hq.userAnswer === opt.key" class="text-red-500 text-xs">✗</span>
                    </div>
                  </div>

                  <!-- Explanation -->
                  <div class="p-2 rounded bg-emerald-500/5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                    <strong>{{ t('aiReading.explanationTitle') }}</strong> {{ hq.explanation }}
                  </div>
                </div>
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
import { X, Sparkles, RotateCw, Volume2, Copy, Award, Loader2, Network } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useTheme } from '@/composables/useTheme'
import { useAiReadingStore } from '@/stores/aiReadingStore'
import { useLLMStore } from '@/stores/llmStore'
import { useTTSStore } from '@/stores/ttsStore'
import type { BlinkistLevel, SummaryLanguageMode, QuizCount, QuizScope, QuizLevel, QuizFeedbackMode, QuizQuestion } from '@/types/aiReading'

const props = defineProps<{
  visible: boolean
  bookId: string
  bookTitle?: string
  chapterHref: string
  chapterTitle: string
  chapterText: string
  fullBookText?: string
  isChineseBook?: boolean
}>()

const emit = defineEmits(['close'])

const { t } = useI18n()
const { themeClasses } = useTheme()
const aiStore = useAiReadingStore()
const llmStore = useLLMStore()
const ttsStore = useTTSStore()

const activeTab = ref<'summary' | 'map' | 'quiz' | 'history'>('summary')
const summaryScope = ref<QuizScope>('chapter')
const mapScope = ref<QuizScope>('chapter')
const quizScope = ref<QuizScope>('chapter')

const selectedRatio = ref<number>(30)
const selectedLevel = ref<BlinkistLevel>('standard')
const summaryLangMode = ref<SummaryLanguageMode>('bilingual')
const mapLangMode = ref<SummaryLanguageMode>('bilingual')

const quizCount = ref<QuizCount>(5)
const quizLevel = ref<QuizLevel>('detail')
const quizFeedbackMode = ref<QuizFeedbackMode>('instant')
const copySuccess = ref(false)
const expandedHistoryIds = ref<string[]>([])

// Font size setting (12px ~ 18px, default 13px, remembered in localStorage)
const fontSizePx = ref<number>(
  Number(localStorage.getItem('moreader-ai-reading-font-size')) || 13
)

const increaseFontSize = () => {
  if (fontSizePx.value < 18) {
    fontSizePx.value += 1
    localStorage.setItem('moreader-ai-reading-font-size', String(fontSizePx.value))
  }
}

const decreaseFontSize = () => {
  if (fontSizePx.value > 11) {
    fontSizePx.value -= 1
    localStorage.setItem('moreader-ai-reading-font-size', String(fontSizePx.value))
  }
}

const activeScope = computed(() => {
  if (activeTab.value === 'summary') return summaryScope.value
  if (activeTab.value === 'map') return mapScope.value
  if (activeTab.value === 'quiz') return quizScope.value
  return 'chapter'
})

const hasSummaryCache = computed(() => !!aiStore.currentSummaryData?.blinkist?.fullMarkdown)
const hasMapCache = computed(() => !!aiStore.currentSummaryData?.characterMap?.summary)
const hasQuizCache = computed(() => !!aiStore.currentQuizData?.questions?.length)

const currentMapData = computed(() => aiStore.currentSummaryData?.characterMap)

const totalQuestions = computed(() => aiStore.currentQuizData?.questions?.length || 0)
const answeredCount = computed(() => aiStore.currentQuizData?.questions?.filter((q) => !!q.userAnswer).length || 0)
const scoreCount = computed(() => aiStore.currentQuizData?.questions?.filter((q) => q.userAnswer === q.answer).length || 0)
const scorePercent = computed(() => (totalQuestions.value ? Math.round((scoreCount.value / totalQuestions.value) * 100) : 0))
const isCompleted = computed(() => totalQuestions.value > 0 && answeredCount.value === totalQuestions.value)

// 响应式模式：由当前选择的开关或当前题库模式决定
const isSubmitMode = computed(() => quizFeedbackMode.value === 'submit')

// 判断是否应该揭晓某题的答案与名师解析
const shouldRevealQuestion = (q: QuizQuestion): boolean => {
  if (!isSubmitMode.value) {
    return !!q.userAnswer
  }
  return !!aiStore.currentQuizData?.isSubmitted
}

// 顶部计分条是否显示
const shouldRevealAnswers = computed(() => {
  if (!isSubmitMode.value) return answeredCount.value > 0
  return !!aiStore.currentQuizData?.isSubmitted
})

// Markdown renderer
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
  if (isSubmitMode.value && aiStore.currentQuizData?.isSubmitted) {
    return
  }
  aiStore.answerQuestion(questionId, key)
}

const getOptionClass = (q: QuizQuestion, key: string) => {
  const isRevealed = shouldRevealQuestion(q)
  if (!q.userAnswer) {
    return 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent bg-black/[0.02] dark:bg-white/[0.02]'
  }

  if (isRevealed) {
    if (key === q.answer) {
      return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium'
    }
    if (q.userAnswer === key) {
      return 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
    }
    return 'opacity-40 border-transparent'
  }

  if (q.userAnswer === key) {
    return 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-medium'
  }
  return 'opacity-70 border-transparent'
}

const getOptionBadgeClass = (q: QuizQuestion, key: string) => {
  const isRevealed = shouldRevealQuestion(q)
  if (!q.userAnswer) {
    return 'border-black/20 dark:border-white/20'
  }

  if (isRevealed) {
    if (key === q.answer) {
      return 'bg-emerald-500 text-white border-emerald-500'
    }
    if (q.userAnswer === key) {
      return 'bg-red-500 text-white border-red-500'
    }
    return 'border-black/20 dark:border-white/20'
  }

  if (q.userAnswer === key) {
    return 'bg-blue-500 text-white border-blue-500'
  }
  return 'border-black/20 dark:border-white/20'
}

const getAnalysisText = (scope: QuizScope): string => {
  if (scope === 'book' && props.fullBookText && props.fullBookText.length >= 50) {
    return props.fullBookText
  }

  let text = (props.chapterText || '').trim()
  if (text.length >= 20) return text

  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (iframe?.contentDocument?.body) {
    text = (iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent || '').trim()
  }
  return text
}

const triggerGenerateSummary = async () => {
  const cfg = llmStore.config
  if (!cfg.apiKey && cfg.provider !== 'custom') {
    aiStore.errorMsg = t('aiReading.configureLlmHint')
    return
  }
  const text = getAnalysisText(summaryScope.value)
  if (!text || text.length < 20) {
    aiStore.errorMsg = t('aiReading.noChapterContent')
    return
  }
  try {
    await aiStore.generateBlinkistBook({
      bookId: props.bookId,
      chapterHref: props.chapterHref,
      chapterTitle: summaryScope.value === 'book' ? (props.bookTitle || 'Entire Book') : props.chapterTitle,
      chapterText: text,
      scope: summaryScope.value,
      ratio: selectedRatio.value,
      level: selectedLevel.value,
      langMode: summaryLangMode.value,
      sourceLang: cfg.sourceLang || 'auto',
      targetLang: cfg.targetLang || 'zh-CN',
    })
  } catch {}
}

const triggerGenerateMap = async () => {
  const cfg = llmStore.config
  if (!cfg.apiKey && cfg.provider !== 'custom') {
    aiStore.errorMsg = t('aiReading.configureLlmHint')
    return
  }
  const text = getAnalysisText(mapScope.value)
  if (!text || text.length < 20) {
    aiStore.errorMsg = t('aiReading.noChapterContent')
    return
  }
  try {
    await aiStore.generateCharacterMap({
      bookId: props.bookId,
      chapterHref: props.chapterHref,
      chapterTitle: mapScope.value === 'book' ? (props.bookTitle || 'Entire Book') : props.chapterTitle,
      chapterText: text,
      scope: mapScope.value,
      langMode: mapLangMode.value,
      sourceLang: cfg.sourceLang || 'auto',
      targetLang: cfg.targetLang || 'zh-CN',
    })
  } catch {}
}

const triggerGenerateQuiz = async () => {
  const cfg = llmStore.config
  if (!cfg.apiKey && cfg.provider !== 'custom') {
    aiStore.errorMsg = t('aiReading.configureLlmHint')
    return
  }
  const text = getAnalysisText(quizScope.value)
  if (!text || text.length < 20) {
    aiStore.errorMsg = t('aiReading.noChapterContent')
    return
  }
  try {
    await aiStore.generateQuiz({
      bookId: props.bookId,
      bookTitle: props.bookTitle,
      chapterHref: props.chapterHref,
      chapterTitle: quizScope.value === 'book' ? (props.bookTitle || 'Entire Book') : props.chapterTitle,
      chapterText: text,
      count: quizCount.value,
      scope: quizScope.value,
      level: quizLevel.value,
      feedbackMode: quizFeedbackMode.value,
      isChineseBook: props.isChineseBook,
    })
  } catch {}
}

const openHistoryTab = async () => {
  activeTab.value = 'history'
  if (props.bookId) {
    await aiStore.loadQuizHistory(props.bookId)
  }
}

const toggleHistoryDetail = (id: string) => {
  const idx = expandedHistoryIds.value.indexOf(id)
  if (idx >= 0) {
    expandedHistoryIds.value.splice(idx, 1)
  } else {
    expandedHistoryIds.value.push(id)
  }
}

const clearHistory = async () => {
  aiStore.quizHistory = []
  if (props.bookId) {
    await aiStore.loadQuizHistory(props.bookId)
  }
}

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const copyMarkdownContent = (md: string) => {
  if (!md) return
  navigator.clipboard.writeText(md)
  copySuccess.value = true
  setTimeout(() => {
    copySuccess.value = false
  }, 2000)
}

const playSummaryVoice = (md: string) => {
  if (!md) return
  const plainText = md.replace(/[#*•\-`]/g, '').trim()
  ttsStore.speakSelection(plainText)
}

const checkAndLoadCache = async () => {
  if (!props.bookId) return
  await aiStore.loadSummaryCache(props.bookId, props.chapterHref, summaryScope.value, selectedRatio.value, selectedLevel.value, summaryLangMode.value)
  await aiStore.loadMapCache(props.bookId, props.chapterHref, mapScope.value, mapLangMode.value)
  await aiStore.loadQuizCache(props.bookId, props.chapterHref, quizCount.value, quizScope.value, quizLevel.value)
  await aiStore.loadQuizHistory(props.bookId)
}

// 核心生命周期隔离：只要书籍改变，第一件事先无条件重置当前状态！
watch(
  () => props.bookId,
  (newId, oldId) => {
    if (newId !== oldId) {
      aiStore.resetActiveBookState()
      expandedHistoryIds.value = []
      if (props.visible) checkAndLoadCache()
    }
  }
)

watch(
  () => [props.chapterHref, summaryScope.value, selectedRatio.value, selectedLevel.value, summaryLangMode.value],
  () => {
    if (props.visible) checkAndLoadCache()
  }
)

watch(() => [mapScope.value, mapLangMode.value], () => {
  if (props.visible) aiStore.loadMapCache(props.bookId, props.chapterHref, mapScope.value, mapLangMode.value)
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

/* 动态字号穿透：强制覆盖子元素的固定类名，实现真正的 A- / A+ 缩放 */
.ai-modal-body {
  font-size: var(--ai-dynamic-font-size, 13px) !important;
}
.ai-modal-body p,
.ai-modal-body span,
.ai-modal-body button,
.ai-modal-body select,
.ai-modal-body input,
.ai-modal-body div {
  font-size: inherit;
}
.ai-modal-body h1 {
  font-size: calc(var(--ai-dynamic-font-size, 13px) * 1.35) !important;
}
.ai-modal-body h2 {
  font-size: calc(var(--ai-dynamic-font-size, 13px) * 1.2) !important;
}
.ai-modal-body h3,
.ai-modal-body h4 {
  font-size: calc(var(--ai-dynamic-font-size, 13px) * 1.1) !important;
}
</style>
