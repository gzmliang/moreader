<template>
  <div class="h-screen flex flex-col overflow-hidden transition-colors duration-300"
       :class="currentTheme.containerClass">

    <!-- Loading Overlay -->
    <div v-if="bookStore.isLoadingBook"
         class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl min-w-[300px]">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-full border-4 border-gray-300 dark:border-gray-600
                      border-t-blue-500 animate-spin"></div>
          <p class="text-gray-700 dark:text-gray-200 font-medium">
            {{ bookStore.loadingMessage || $t('app.loading') }}
          </p>
          <div v-if="bookStore.loadingProgress > 0"
               class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all duration-300"
                 :style="{ width: bookStore.loadingProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <header class="flex-none h-14 border-b transition-colors duration-300 z-50"
            :class="currentTheme.headerClass">
      <div class="h-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <BookOpen class="w-5 h-5 opacity-60" :class="currentTheme.textColor" />
          <h1 class="text-base font-medium tracking-tight" :class="currentThemeTextColor">{{ $t('header.title') }}</h1>
        </div>

        <div class="flex items-center gap-1" v-if="currentBook">
          <!-- Layout Toggle -->
          <button @click="toggleLayout" class="p-2 rounded transition-colors"
                  :class="[isFullWidth ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="isFullWidth ? $t('header.toggleLayout.narrow') : $t('header.toggleLayout.full')">
            <Maximize2 v-if="!isFullWidth" class="w-4 h-4" :class="currentTheme.textColor" />
            <Minimize2 v-else class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- TOC Button -->
          <button @click="toggleToc" class="p-2 rounded transition-colors"
                  :class="[showToc ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="$t('header.toc')">
            <List class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- Back Button -->
          <button @click="goBack" class="p-2 rounded transition-colors"
                  :class="[canGoBack ? currentTheme.buttonHoverClass : 'opacity-30 cursor-not-allowed']"
                  :disabled="!canGoBack"
                  :title="$t('header.back')">
            <ArrowLeft class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- Theme Button -->
          <button @click="toggleThemeMenu" class="p-2 rounded transition-colors"
                  :class="[showThemeMenu ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="$t('header.theme')">
            <Palette class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- TTS Play/Pause Button -->
          <button @click="handleTTSPlayPause" class="p-2 rounded transition-colors"
                  :class="[ttsStore.isPlaying ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="ttsStore.isPaused ? $t('header.tts.resume') : (ttsStore.isPlaying ? $t('header.tts.pause') : $t('header.tts.play'))">
            <Volume2 v-if="!ttsStore.isPlaying && !ttsStore.isPaused" class="w-4 h-4" :class="currentTheme.textColor" />
            <Play v-else-if="ttsStore.isPaused" class="w-4 h-4" :class="currentTheme.textColor" />
            <Pause v-else class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- Recording Mode Toggle -->
          <button @click="ttsStore.setRecordingMode(!ttsStore.recordingMode)" class="p-2 rounded transition-colors"
                  :class="[ttsStore.recordingMode ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="ttsStore.recordingMode ? $t('tts.recordingOn') : $t('tts.recordingOff')">
            <Mic class="w-4 h-4" :class="ttsStore.recordingMode ? 'text-red-500' : currentTheme.textColor" />
          </button>

          <!-- TTS Stop Button -->
          <button @click="handleTTSStop" class="p-2 rounded transition-colors"
                  :class="[(!ttsStore.isPlaying && !ttsStore.isPaused) ? 'opacity-30 cursor-not-allowed' : currentTheme.buttonHoverClass]"
                  :disabled="!ttsStore.isPlaying && !ttsStore.isPaused"
                  :title="$t('header.tts.stop')">
            <Square v-if="ttsStore.isPlaying || ttsStore.isPaused" class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- Highlights/Vocab Panel Toggle -->
          <button @click="showSidePanel = !showSidePanel" class="p-2 rounded transition-colors"
                  :class="[showSidePanel ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="$t('sidePanel.title')">
            <Bookmark class="w-4 h-4" :class="currentThemeTextColor" />
          </button>

          <!-- TTS Settings Button -->
          <button @click="showTTSSettings = !showTTSSettings" class="p-2 rounded transition-colors"
                  :class="[showTTSSettings ? currentTheme.activeButtonClass : '', currentTheme.buttonHoverClass]"
                  :title="$t('header.ttsSettings')">
            <Settings class="w-4 h-4" :class="currentTheme.textColor" />
          </button>

          <!-- Close Button -->
          <button @click="closeBook" class="p-2 rounded transition-colors"
                  :class="currentTheme.buttonHoverClass"
                  :title="$t('header.close')">
            <X class="w-4 h-4" :class="currentTheme.textColor" />
          </button>
        </div>
      </div>
    </header>

    <!-- Selection Toolbar -->
    <transition name="fade">
      <div v-if="showSelectionToolbar"
           class="selection-toolbar fixed z-[100] flex flex-col gap-2 p-3 rounded-lg shadow-xl border min-w-[200px]"
           :class="[currentTheme.menuBgClass, currentTheme.borderColor]"
           :style="{ top: `${toolbarPosition.top}px`, left: `${toolbarPosition.left}px` }"
           @mousedown.stop>
        <!-- Dictionary -->
        <div class="flex items-center gap-2">
          <span class="text-xs opacity-60 whitespace-nowrap" :class="currentThemeTextColor">{{ $t('selection.dictionary') }}:</span>
          <button @click="lookupWithYoudao" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">{{ $t('selection.youdao') }}</button>
          <button @click="lookupWithCambridge" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">{{ $t('selection.cambridge') }}</button>
          <button @click="lookupWithOxford" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">{{ $t('selection.oxford') }}</button>
        </div>
        <!-- Translation -->
        <div class="flex items-center gap-2">
          <span class="text-xs opacity-60 whitespace-nowrap" :class="currentThemeTextColor">{{ $t('selection.translate') }}:</span>
          <button @click="translateWithDeepL" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">DeepL</button>
          <button @click="translateWithGoogle" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">Google</button>
          <button @click="translateWithBaidu" class="px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors" :class="currentThemeTextColor">{{ $t('selection.baidu') }}</button>
        </div>
        <div class="w-full h-px bg-current opacity-20 my-1"></div>
        <!-- Annotation & Vocab -->
        <div class="flex items-center gap-2">
          <button @click="addHighlightFromSelection" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="currentThemeTextColor">
            🖍️ {{ $t('selection.highlight') }}
          </button>
          <button @click="addVocabFromSelection" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="currentThemeTextColor">
            📖 {{ $t('selection.addVocab') }}
          </button>
        </div>
        <!-- Other actions -->
        <div class="flex items-center gap-2">
          <button @click="speakSelection" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="currentThemeTextColor">
            🔊 {{ $t('selection.speak') }}
          </button>
          <button @click="copySelection" class="flex-1 px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-center gap-1" :class="currentThemeTextColor">
            📋 {{ $t('selection.copy') }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Highlight Color Picker -->
    <transition name="fade">
      <div v-if="showColorPicker"
           class="fixed z-[110] flex flex-col gap-1 p-2 rounded-lg shadow-xl border"
           :class="[currentTheme.menuBgClass, currentTheme.borderColor]"
           :style="{ top: `${colorPickerPosition.top}px`, left: `${colorPickerPosition.left}px` }"
           @mousedown.stop>
        <button v-for="color in highlightColors" :key="color.id"
                @click="confirmHighlight(color.id)"
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                :style="{ backgroundColor: color.bg, borderColor: color.border }"
                :title="$t('sidePanel.color.' + color.id)">
        </button>
      </div>
    </transition>

    <!-- TTS Settings Panel -->
    <transition name="fade">
      <div v-if="showTTSSettings"
           class="fixed top-14 right-4 z-[99] w-80 max-h-[80vh] overflow-y-auto p-4 rounded-lg shadow-xl border"
           :class="[currentTheme.menuBgClass, currentTheme.borderColor]"
           @mousedown.stop>
        <div class="flex flex-col gap-4">
          <!-- TTS Provider Selection -->
          <div>
            <label class="text-sm font-medium mb-2 block" :class="currentThemeTextColor">{{ $t('tts.title') }}</label>
            <div class="flex gap-2">
              <button @click="ttsStore.setTTSProvider('browser')"
                      class="flex-1 px-3 py-2 text-xs rounded border transition-colors"
                      :class="[ttsStore.ttsProvider === 'browser'
                        ? (currentThemeId === 'dark' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                        : currentTheme.borderColor + ' ' + currentThemeTextColor]">
                {{ $t('tts.browser') }}
              </button>
              <button @click="ttsStore.setTTSProvider('edge')"
                      class="flex-1 px-3 py-2 text-xs rounded border transition-colors"
                      :class="[ttsStore.ttsProvider === 'edge'
                        ? (currentThemeId === 'dark' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                        : currentTheme.borderColor + ' ' + currentThemeTextColor]">
                {{ $t('tts.edge') }}
              </button>
            </div>
            <!-- Server status -->
            <div v-if="ttsStore.ttsProvider === 'edge'" class="mt-2 flex items-center gap-2 text-xs">
              <span :class="currentThemeTextColor">{{ $t('tts.server') }}:</span>
              <span :class="ttsStore.edgeTTSAvailable ? 'text-green-500' : 'text-red-500'" class="font-medium">
                {{ ttsStore.edgeTTSAvailable ? `✓ ${$t('tts.connected')}` : `✗ ${$t('tts.disconnected')}` }}
              </span>
              <button @click="ttsStore.checkEdgeTTSServer()"
                      class="ml-2 px-2 py-0.5 text-xs rounded border opacity-70 hover:opacity-100"
                      :class="[currentTheme.borderColor, currentThemeTextColor]">
                {{ $t('app.refresh') }}
              </button>
            </div>
            <p v-if="ttsStore.ttsProvider === 'edge' && !ttsStore.edgeTTSAvailable"
               class="text-xs text-orange-500 mt-1">
              ⚠️ {{ $t('tts.notAvailable') }}
              <a href="#" @click.prevent="showEdgeTTSSetup = true" class="underline ml-1">{{ $t('tts.howToSetup') }}</a>
            </p>
          </div>

          <!-- Edge TTS Server Config -->
          <div v-if="showEdgeTTSSetup" class="p-3 rounded-lg text-xs"
               :class="currentThemeId === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'">
            <p class="font-medium mb-2" :class="currentThemeTextColor">{{ $t('ttsSetup.title') }}</p>
            <ol class="list-decimal list-inside space-y-1 mb-3" :class="currentThemeTextColor">
              <li>{{ $t('ttsSetup.install') }}
                <code class="px-1 py-0.5 rounded bg-black/10">pip install edge-tts flask flask-cors</code>
              </li>
              <li>{{ $t('ttsSetup.run') }}
                <code class="px-1 py-0.5 rounded bg-black/10">python edge-tts-server.py</code>
              </li>
              <li>{{ $t('ttsSetup.endpoint') }}
                <input v-model="ttsStore.edgeTTSEndpoint"
                       @change="ttsStore.setEdgeTTSEndpoint(ttsStore.edgeTTSEndpoint)"
                       class="w-full mt-1 px-2 py-1 rounded border text-xs"
                       :class="[currentTheme.borderColor, currentThemeTextColor, currentTheme.menuBgClass]" />
              </li>
              <li>API Key ({{ $t('tts.optional') }})
                <input v-model="ttsStore.edgeTTSApiKey"
                       @change="ttsStore.setEdgeTTSApiKey(ttsStore.edgeTTSApiKey)"
                       type="password" :placeholder="$t('ttsSetup.apiKeyPlaceholder')"
                       class="w-full mt-1 px-2 py-1 rounded border text-xs"
                       :class="[currentTheme.borderColor, currentThemeTextColor, currentTheme.menuBgClass]" />
                <p class="text-xs opacity-60 mt-0.5">{{ $t('ttsSetup.apiKeyHint') }}</p>
              </li>
            </ol>
            <button @click="showEdgeTTSSetup = false"
                    class="px-3 py-1 rounded text-xs border"
                    :class="[currentTheme.borderColor, currentThemeTextColor]">
              {{ $t('ttsSetup.close') }}
            </button>
          </div>

          <!-- Edge TTS Voice Selection (with gender) -->
          <div v-if="ttsStore.ttsProvider === 'edge'">
            <label class="text-sm font-medium mb-2 block" :class="currentThemeTextColor">
              {{ $t('tts.voiceSelect') }} ({{ $t('tts.voiceCount', { count: ttsStore.edgeTTSVoices.length }) }})
            </label>
            <select :value="ttsStore.edgeTTSVoice"
                    @change="ttsStore.setEdgeVoice(($event.target as HTMLSelectElement).value)"
                    class="w-full p-2 text-sm rounded border bg-transparent"
                    :class="[currentTheme.borderColor, currentThemeTextColor]">
              <optgroup v-for="(voices, langKey) in edgeTTSVoiceGroups" :key="langKey"
                        v-if="voices.length > 0" :label="$t('voice.' + langKey)">
                <option v-for="voice in voices" :key="voice.id" :value="voice.id">
                  {{ voice.name }} ({{ $t('voice.' + voice.gender) }})
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Browser Voice Selection -->
          <div v-else>
            <label class="text-sm font-medium mb-2 block" :class="currentThemeTextColor">{{ $t('tts.voiceSelect') }}</label>
            <select :value="ttsStore.selectedVoiceURI || ''"
                    @change="ttsStore.setVoice(($event.target as HTMLSelectElement).value || null)"
                    class="w-full p-2 text-sm rounded border bg-transparent"
                    :class="[currentTheme.borderColor, currentThemeTextColor]">
              <option value="">{{ $t('tts.autoSelect') }}</option>
              <option v-for="voice in ttsStore.availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
          </div>

          <!-- Speech Rate -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium" :class="currentThemeTextColor">{{ $t('tts.speechRate') }}</span>
              <span class="text-xs opacity-60" :class="currentThemeTextColor">{{ ttsStore.speechRate.toFixed(1) }}x</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.1"
                   :value="ttsStore.speechRate"
                   @input="ttsStore.setRate(parseFloat(($event.target as HTMLInputElement).value))"
                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div class="flex justify-between mt-1 text-xs opacity-50" :class="currentThemeTextColor">
              <span>{{ $t('tts.slow') }}</span>
              <span>{{ $t('tts.normal') }}</span>
              <span>{{ $t('tts.fast') }}</span>
            </div>
          </div>

          <!-- Speech Pitch -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium" :class="currentThemeTextColor">{{ $t('tts.speechPitch') }}</span>
              <span class="text-xs opacity-60" :class="currentThemeTextColor">{{ ttsStore.speechPitch.toFixed(1) }}</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.1"
                   :value="ttsStore.speechPitch"
                   @input="ttsStore.setPitch(parseFloat(($event.target as HTMLInputElement).value))"
                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div class="flex justify-between mt-1 text-xs opacity-50" :class="currentThemeTextColor">
              <span>{{ $t('tts.low') }}</span>
              <span>1.0</span>
              <span>{{ $t('tts.high') }}</span>
            </div>
          </div>

          <!-- Custom TTS (Reserved) -->
          <div class="pt-2 border-t" :class="currentTheme.borderColor">
            <div class="flex items-center gap-2 mb-2">
              <input type="checkbox" id="use-custom-tts"
                     :checked="ttsStore.useCustomTTS"
                     @change="ttsStore.useCustomTTS = ($event.target as HTMLInputElement).checked"
                     class="w-4 h-4" />
              <label for="use-custom-tts" class="text-sm" :class="currentThemeTextColor">{{ $t('tts.customTTS') }}</label>
            </div>
            <div v-if="ttsStore.useCustomTTS" class="flex flex-col gap-2 mt-2">
              <input type="text" :placeholder="$t('tts.apiEndpoint')"
                     :value="ttsStore.customTTSEndpoint"
                     @input="ttsStore.customTTSEndpoint = ($event.target as HTMLInputElement).value"
                     class="w-full p-2 text-sm rounded border bg-transparent"
                     :class="currentTheme.borderColor" />
              <input type="password" :placeholder="$t('tts.apiKey')"
                     :value="ttsStore.customTTSApiKey"
                     @input="ttsStore.customTTSApiKey = ($event.target as HTMLInputElement).value"
                     class="w-full p-2 text-sm rounded border bg-transparent"
                     :class="currentTheme.borderColor" />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Main Content Area -->
    <main class="flex-1 relative overflow-hidden" :class="currentTheme.mainBgClass">
      <!-- Library View -->
      <div v-if="!currentBook" class="h-full overflow-y-auto">
        <div class="max-w-2xl mx-auto px-6 py-12">
          <!-- Upload Section -->
          <div class="text-center mb-12">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors"
                 :class="currentTheme.uploadIconBgClass">
              <Upload class="w-8 h-8 opacity-50" :class="currentThemeTextColor" />
            </div>
            <h2 class="text-xl font-bold mb-2" :class="currentThemeTextColor">{{ $t('library.title') }}</h2>
            <p class="text-sm mb-6 opacity-60" :class="currentThemeTextColor">{{ $t('library.subtitle') }}</p>

            <label class="inline-flex items-center gap-2 px-5 py-2.5 rounded transition-opacity cursor-pointer"
                   :class="currentTheme.uploadButtonClass">
              <Plus class="w-4 h-4" />
              <span class="text-sm font-medium">{{ $t('library.openBook') }}</span>
              <input ref="fileInput" type="file" accept=".epub,.txt,.mobi,application/epub+zip,text/plain,application/x-mobipocket-ebook"
                     class="hidden" @change="handleFileUpload" :disabled="bookStore.isLoading" />
            </label>

            <!-- Search -->
            <div class="mt-4 flex justify-center gap-2">
              <input v-model="searchQuery" type="text"
                     :placeholder="$t('library.searchPlaceholder')"
                     class="px-3 py-2 text-sm rounded border bg-transparent"
                     :class="[currentTheme.borderColor, currentThemeTextColor]" />
              <select v-model="sortMode"
                      class="px-3 py-2 text-sm rounded border bg-transparent"
                      :class="[currentTheme.borderColor, currentThemeTextColor]">
                <option value="all">{{ $t('library.sortAll') }}</option>
                <option value="recent">{{ $t('library.sortRecent') }}</option>
                <option value="unread">{{ $t('library.sortUnread') }}</option>
              </select>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="bookStore.isLoading" class="text-center py-8">
            <div class="w-6 h-6 mx-auto mb-2 border rounded-full animate-spin"
                 :class="[currentTheme.borderColor, currentTheme.borderTopColor]"></div>
            <p class="text-sm opacity-60" :class="currentThemeTextColor">{{ $t('app.importing') }}</p>
          </div>

          <!-- Library -->
          <div v-if="filteredBooks.length > 0">
            <h3 class="text-sm font-medium mb-3 opacity-60 flex items-center gap-2" :class="currentThemeTextColor">
              <Library class="w-4 h-4" />
              {{ $t('library.bookshelf') }}
              <span class="text-xs">({{ filteredBooks.length }})</span>
            </h3>

            <div class="space-y-2">
              <div v-for="book in filteredBooks" :key="book.id"
                   class="group p-3 rounded border transition-all cursor-pointer"
                   :class="[currentTheme.bookItemClass, currentTheme.bookItemHoverClass]"
                   @click="openBook(book.id)">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-14 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                       :class="currentTheme.coverBgClass">
                    <BookOpen v-if="!book.cover" class="w-5 h-5 opacity-30" :class="currentThemeTextColor" />
                    <img v-else :src="book.cover" class="w-full h-full object-cover rounded" :alt="book.title" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium truncate" :class="currentThemeTextColor">{{ book.title }}</h4>
                    <p class="text-xs opacity-60" :class="currentThemeTextColor">{{ book.author }}</p>
                    <p class="text-xs opacity-40 mt-0.5" :class="currentThemeTextColor">
                      {{ formatDate(book.addedAt) }}
                    </p>
                  </div>
                  <button @click.stop="deleteBook(book.id)"
                          class="p-1.5 opacity-0 group-hover:opacity-100 rounded transition-all"
                          :class="currentTheme.deleteButtonClass">
                    <Trash2 class="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!bookStore.isLoading && filteredBooks.length === 0" class="text-center py-8">
            <p class="text-sm opacity-60" :class="currentThemeTextColor">{{ $t('library.empty') }}</p>
          </div>
        </div>
      </div>

      <!-- Reader View -->
      <div v-else class="h-full flex">
        <!-- TOC Drawer -->
        <transition name="slide">
          <aside v-if="showToc"
                 class="flex-none w-64 border-r overflow-y-auto transition-colors"
                 :class="[currentTheme.tocBgClass, currentTheme.borderColor]">
            <div class="p-4 border-b transition-colors" :class="currentTheme.borderColor">
              <h3 class="text-sm font-medium" :class="currentThemeTextColor">{{ $t('toc.title') }}</h3>
            </div>
            <nav class="p-2">
              <div v-for="(item, index) in tocItems" :key="index"
                   class="text-sm py-2 px-3 rounded cursor-pointer transition-colors"
                   :class="[currentChapter === item.href ? currentTheme.tocActiveClass : currentTheme.tocItemClass]"
                   :style="{ paddingLeft: `${12 + (item.level || 0) * 16}px` }"
                   @click="navigateToChapter(item.href)">
                {{ item.label }}
              </div>
            </nav>
          </aside>
        </transition>

        <!-- Side Panel: Highlights & Vocabulary -->
        <transition name="slide">
          <aside v-if="showSidePanel && currentBook"
                 class="flex-none w-80 border-r overflow-y-auto transition-colors"
                 :class="[currentTheme.tocBgClass, currentTheme.borderColor]">
            <!-- Panel Tabs -->
            <div class="flex border-b" :class="currentTheme.borderColor">
              <button v-for="tab in sideTabs" :key="tab.id"
                      @click="activeSideTab = tab.id"
                      class="flex-1 py-3 text-xs font-medium transition-colors"
                      :class="[activeSideTab === tab.id
                        ? currentTheme.tocActiveClass
                        : currentTheme.tocItemClass]">
                {{ $t(tab.label) }}
                <span v-if="tab.badge" class="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                      :class="activeSideTab === tab.id ? 'bg-white/20' : 'bg-black/10'">
                  {{ tab.badge }}
                </span>
              </button>
            </div>

            <!-- Highlights Tab -->
            <div v-if="activeSideTab === 'highlights'" class="p-3">
              <div v-if="highlightStore.currentBookHighlights.length === 0"
                   class="text-center py-8 text-sm opacity-60" :class="currentThemeTextColor">
                {{ $t('sidePanel.noHighlights') }}
              </div>
              <div v-for="hl in highlightStore.currentBookHighlights" :key="hl.id"
                   class="mb-3 p-3 rounded border cursor-pointer transition-colors"
                   :class="[currentTheme.bookItemClass, currentTheme.bookItemHoverClass]"
                   @click="navigateToHighlight(hl.cfi)">
                <div class="flex items-start justify-between mb-1">
                  <span class="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                        :style="{ backgroundColor: getHighlightColor(hl.color).bg }"></span>
                  <button @click.stop="deleteHighlight(hl.id)"
                          class="ml-2 opacity-50 hover:opacity-100 text-red-500 text-xs">✕</button>
                </div>
                <p class="text-sm leading-relaxed mb-1" :class="currentThemeTextColor">{{ hl.text }}</p>
                <p v-if="hl.note" class="text-xs opacity-60 italic" :class="currentThemeTextColor">{{ hl.note }}</p>
                <p class="text-xs opacity-40 mt-1">{{ formatDate(hl.createdAt) }}</p>
              </div>
            </div>

            <!-- Vocabulary Tab -->
            <div v-if="activeSideTab === 'vocabulary'" class="p-3">
              <div v-if="vocabStore.currentBookWords.length === 0"
                   class="text-center py-8 text-sm opacity-60" :class="currentThemeTextColor">
                {{ $t('sidePanel.noVocab') }}
              </div>
              <div v-for="word in vocabStore.currentBookWords" :key="word.id"
                   class="mb-3 p-3 rounded border transition-colors"
                   :class="[currentTheme.bookItemClass, currentTheme.bookItemHoverClass]">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm font-medium" :class="currentThemeTextColor">{{ word.word }}</p>
                    <p v-if="word.phonetic" class="text-xs opacity-50">{{ word.phonetic }}</p>
                  </div>
                  <button @click="deleteVocab(word.id)"
                          class="opacity-50 hover:opacity-100 text-red-500 text-xs">✕</button>
                </div>
                <p class="text-xs opacity-70 mt-1" :class="currentThemeTextColor">{{ word.context }}</p>
                <p v-if="word.translation" class="text-sm mt-1 font-medium text-blue-500">{{ word.translation }}</p>
                <div class="flex items-center justify-between mt-2 text-xs opacity-40">
                  <span>{{ $t('sidePanel.reviews') }}: {{ word.reviewCount }}</span>
                  <span v-if="word.interval > 0">{{ word.interval }}d</span>
                </div>
              </div>
            </div>

            <!-- Flashcard Tab -->
            <div v-if="activeSideTab === 'flashcard'" class="p-4">
              <div v-if="studySession.length === 0" class="text-center">
                <p class="text-sm opacity-60 mb-4" :class="currentThemeTextColor">
                  {{ vocabStore.getDueWords().length > 0
                    ? $t('sidePanel.startReview')
                    : $t('sidePanel.noDueWords') }}
                </p>
                <button @click="startStudySession"
                        class="px-4 py-2 rounded text-sm font-medium transition-colors"
                        :class="currentTheme.uploadButtonClass"
                        :disabled="vocabStore.getDueWords().length === 0">
                  {{ vocabStore.getDueWords().length > 0
                    ? $t('sidePanel.startReview')
                    : $t('sidePanel.noDueWords') }}
                </button>
                <div class="mt-4 text-xs opacity-60" :class="currentThemeTextColor">
                  <p>{{ $t('sidePanel.dueCount', { count: vocabStore.getDueWords().length }) }}</p>
                </div>
              </div>
              <div v-else>
                <!-- Progress -->
                <div class="text-center mb-4">
                  <span class="text-xs opacity-60" :class="currentThemeTextColor">
                    {{ currentCardIndex + 1 }} / {{ studySession.length }}
                  </span>
                  <div class="w-full h-1 bg-gray-200 rounded mt-1">
                    <div class="h-full bg-blue-500 rounded transition-all"
                         :style="{ width: ((currentCardIndex + 1) / studySession.length * 100) + '%' }"></div>
                  </div>
                </div>

                <!-- Flashcard -->
                <div class="relative cursor-pointer" @click="isCardFlipped = !isCardFlipped">
                  <div class="p-6 rounded-lg border min-h-[200px] flex flex-col items-center justify-center text-center"
                       :class="[currentTheme.bookItemClass, currentTheme.borderColor]">
                    <!-- Front -->
                    <template v-if="!isCardFlipped">
                      <p class="text-xl font-bold mb-2" :class="currentThemeTextColor">{{ currentCard?.word }}</p>
                      <p v-if="currentCard?.context" class="text-sm opacity-60 italic" :class="currentThemeTextColor">
                        {{ currentCard.context }}
                      </p>
                      <p class="text-xs opacity-40 mt-4">{{ $t('sidePanel.tapToFlip') }}</p>
                    </template>
                    <!-- Back -->
                    <template v-else>
                      <p class="text-sm opacity-60 mb-2" :class="currentThemeTextColor">{{ currentCard?.word }}</p>
                      <p class="text-lg font-bold text-blue-500 mb-2">
                        {{ currentCard?.translation || $t('sidePanel.noTranslation') }}
                      </p>
                      <p v-if="currentCard?.phonetic" class="text-sm opacity-50">{{ currentCard.phonetic }}</p>
                    </template>
                  </div>
                </div>

                <!-- Rating Buttons -->
                <div v-if="isCardFlipped" class="mt-4 grid grid-cols-4 gap-2">
                  <button v-for="rating in cardRatings" :key="rating.value"
                          @click="rateCard(rating.value)"
                          class="py-2 rounded text-xs font-medium transition-colors"
                          :class="rating.class">
                    {{ $t(rating.label) }}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </transition>
        <transition name="fade">
          <div v-if="showThemeMenu"
               class="absolute top-14 right-4 z-50 w-48 rounded-lg border shadow-lg overflow-hidden"
               :class="[currentTheme.menuBgClass, currentTheme.borderColor]">
            <div class="p-3 border-b" :class="currentTheme.borderColor">
              <span class="text-xs font-medium opacity-60" :class="currentThemeTextColor">{{ $t('theme.title') }}</span>
            </div>
            <div class="p-2 space-y-1">
              <button v-for="theme in themes" :key="theme.id"
                      @click="selectTheme(theme.id)"
                      class="w-full flex items-center gap-3 px-3 py-2 rounded transition-colors"
                      :class="[currentThemeId === theme.id ? currentTheme.activeButtonClass : 'hover:bg-black/5']">
                <div class="w-6 h-6 rounded border flex-shrink-0"
                     :class="theme.id === 'dark' ? 'border-gray-600' : 'border-gray-300'"
                     :style="{ backgroundColor: theme.previewBg }"></div>
                <span class="text-sm" :class="currentThemeTextColor">{{ $t('theme.' + theme.id) }}</span>
              </button>
            </div>
          </div>
        </transition>

        <!-- Reading Area -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Book Info -->
          <div class="flex-none px-4 py-2 border-b transition-colors"
               :class="[currentTheme.bookInfoBgClass, currentTheme.borderColor]">
            <h2 class="text-sm font-medium truncate" :class="currentThemeTextColor">
              {{ bookStore.currentMetadata?.title }}
            </h2>
            <p class="text-xs opacity-60 truncate" :class="currentThemeTextColor">
              {{ bookStore.currentMetadata?.author }}
            </p>
          </div>

          <!-- EPUB Viewer -->
          <div class="flex-1 relative overflow-hidden">
            <!-- Navigation Arrows -->
            <button @click="prevPage"
                    class="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors"
                    :class="[canGoPrev ? currentTheme.navArrowClass : 'opacity-30 cursor-not-allowed']"
                    :disabled="!canGoPrev">
              <ChevronLeft class="w-5 h-5" :class="currentTheme.textColor" />
            </button>

            <button @click="nextPage"
                    class="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors"
                    :class="[canGoNext ? currentTheme.navArrowClass : 'opacity-30 cursor-not-allowed']"
                    :disabled="!canGoNext">
              <ChevronRight class="w-5 h-5" :class="currentTheme.textColor" />
            </button>

            <!-- Render Container -->
            <div id="epub-reader" class="h-full w-full overflow-hidden"></div>
          </div>

          <!-- Progress Bar -->
          <div class="flex-none h-12 border-t transition-colors"
               :class="[currentTheme.progressBgClass, currentTheme.borderColor]">
            <div class="h-full max-w-5xl mx-auto px-4 flex items-center gap-4">
              <span class="text-xs w-12 opacity-60" :class="currentThemeTextColor">{{ progressPercent }}%</span>
              <input type="range" min="0" max="100" step="0.1"
                     v-model="progressSlider"
                     @input="handleProgressInput"
                     @change="handleProgressChange"
                     class="flex-1 h-1 rounded-lg appearance-none cursor-pointer slider"
                     :class="currentTheme.sliderBgClass" />
              <span class="text-xs w-24 text-right opacity-60" :class="currentThemeTextColor">
                {{ currentLocation }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Epub from 'epubjs'
import type { Book, Rendition, NavItem } from 'epubjs'
import { useBookStore } from '@/stores/bookStore'
import { useTTSStore, type EdgeVoice } from '@/stores/ttsStore'
import { useHighlightStore, HIGHLIGHT_COLORS } from '@/stores/highlightStore'
import type { Highlight } from '@/stores/highlightStore'
import type { VocabWord } from '@/stores/vocabStore'
import { useVocabStore } from '@/stores/vocabStore'
import { createLogger } from '@/utils/logger'
import {
  BookOpen, Upload, Plus, Library, Trash2,
  ChevronLeft, ChevronRight, Volume2, Pause, Play, Square, X, List, Palette,
  Maximize2, Minimize2, Settings, ArrowLeft, Mic, Bookmark
} from 'lucide-vue-next'

const log = createLogger('Reader')

const { t, locale } = useI18n()

// Themes
const themes = [
  { id: 'default', name: '默认白', previewBg: '#FFFFFF', containerBg: '#F7F7F7', textColor: '#1A1A1A', readerBg: '#FFFFFF', readerText: '#1A1A1A' },
  { id: 'parchment', name: '护眼黄', previewBg: '#F4ECD8', containerBg: '#F0E8D4', textColor: '#332D22', readerBg: '#F4ECD8', readerText: '#332D22' },
  { id: 'gray', name: '墨水灰', previewBg: '#E5E5E5', containerBg: '#E8E8E8', textColor: '#222222', readerBg: '#E5E5E5', readerText: '#222222' },
  { id: 'dark', name: '深夜黑', previewBg: '#1A1A1A', containerBg: '#121212', textColor: '#CCCCCC', readerBg: '#1A1A1A', readerText: '#CCCCCC' }
]

const currentThemeId = ref('default')

const loadSavedTheme = () => {
  const saved = localStorage.getItem('boox-reader-theme')
  if (saved && themes.find(t => t.id === saved)) currentThemeId.value = saved
}

const selectTheme = (themeId: string) => {
  currentThemeId.value = themeId
  localStorage.setItem('boox-reader-theme', themeId)
  showThemeMenu.value = false
  if (rendition.value) updateRenditionTheme()
}

const currentTheme = computed(() => {
  const theme = themes.find(th => th.id === currentThemeId.value) ?? themes[0]
  const isDark = theme.id === 'dark'

  return {
    containerClass: isDark ? 'bg-[#121212]' : (theme.id === 'parchment' ? 'bg-[#F0E8D4]' : (theme.id === 'gray' ? 'bg-[#E8E8E8]' : 'bg-[#F7F7F7]')),
    headerClass: isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white/80 border-gray-200',
    mainBgClass: isDark ? 'bg-[#121212]' : (theme.id === 'parchment' ? 'bg-[#F0E8D4]' : (theme.id === 'gray' ? 'bg-[#E8E8E8]' : 'bg-[#F7F7F7]')),
    textColor: isDark ? 'text-gray-300' : (theme.id === 'parchment' ? 'text-[#332D22]' : 'text-gray-900'),
    buttonHoverClass: isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
    activeButtonClass: isDark ? 'bg-white/20' : 'bg-black/10',
    uploadIconBgClass: isDark ? 'bg-white/10' : 'bg-black/5',
    uploadButtonClass: isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-900 text-white',
    bookItemClass: isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-200',
    bookItemHoverClass: isDark ? 'hover:border-gray-600' : 'hover:border-gray-400',
    coverBgClass: isDark ? 'bg-gray-800' : 'bg-gray-100',
    deleteButtonClass: isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50',
    tocBgClass: isDark ? 'bg-[#1A1A1A]' : 'bg-white',
    tocItemClass: isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-black/5',
    tocActiveClass: isDark ? 'font-medium bg-white/20 text-white' : 'font-medium bg-black/10 text-gray-900',
    menuBgClass: isDark ? 'bg-[#1A1A1A]' : 'bg-white',
    bookInfoBgClass: isDark ? 'bg-[#1A1A1A]/50' : 'bg-white/50',
    progressBgClass: isDark ? 'bg-[#1A1A1A]' : 'bg-[#F7F7F7]',
    navArrowClass: isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white/80 hover:bg-white',
    sliderBgClass: isDark ? 'bg-gray-700' : 'bg-gray-300',
    borderColor: isDark ? 'border-gray-800' : 'border-gray-200',
    borderTopColor: isDark ? 'border-t-gray-500' : 'border-t-gray-900'
  }
})

const currentThemeTextColor = computed(() => {
  const t = themes.find(th => th.id === currentThemeId.value) ?? themes[0]
  return t.id === 'dark' ? 'text-gray-300' : (t.id === 'parchment' ? 'text-[#332D22]' : 'text-gray-900')
})

const updateRenditionTheme = () => {
  if (!rendition.value) return
  const theme = themes.find(t => t.id === currentThemeId.value) ?? themes[0]
  const isDark = theme.id === 'dark'
  const textColor = isDark ? '#FFFFFF' : '#000000'
  const horizontalPadding = isFullWidth.value ? '40px' : '20px'
  const maxWidth = isFullWidth.value ? 'none' : '900px'

  rendition.value.themes.register('current', {
    '*': { 'color': `${textColor} !important`, 'white-space': 'normal !important', 'word-break': 'break-word !important' },
    body: {
      'font-family': 'Georgia, Cambria, "Times New Roman", Times, serif !important',
      'font-size': '18px !important', 'line-height': '1.8 !important',
      'color': `${textColor} !important`, 'background': `${theme.readerBg} !important`,
      'margin': '0 auto !important', 'padding': `20px ${horizontalPadding} !important`,
      'max-width': `${maxWidth} !important`, 'overflow-x': 'hidden !important', 'box-sizing': 'border-box !important'
    },
    html: { 'overflow-x': 'hidden !important', 'color': `${textColor} !important` },
    p: { 'text-align': 'justify !important', 'text-indent': '2em !important', 'margin-bottom': '1.2em !important', 'color': `${textColor} !important` },
    'h1, h2, h3, h4, h5, h6': { 'font-family': 'Georgia, Cambria, "Times New Roman", Times, serif !important', 'color': `${textColor} !important`, 'margin-top': '1.5em !important', 'margin-bottom': '0.8em !important' },
    img: { 'max-width': '100% !important', 'max-height': '70vh !important', 'height': 'auto !important', 'object-fit': 'contain !important', 'display': 'block !important', 'margin': '1em auto !important' },
    'code, pre': { 'font-family': 'monospace !important', 'background': `${isDark ? '#333' : '#f5f5f5'} !important`, 'color': `${textColor} !important` },
    blockquote: { 'border-left': `3px solid ${isDark ? '#444' : '#ddd'} !important`, 'padding-left': '1em !important', 'color': `${isDark ? '#CCC' : '#666'} !important` },
    a: { 'color': `${isDark ? '#66b3ff' : '#0066cc'} !important` },
  })
  rendition.value.themes.select('current')
}

// Stores
const bookStore = useBookStore()
const ttsStore = useTTSStore()
const highlightStore = useHighlightStore()
const vocabStore = useVocabStore()

// Edge TTS voice groups
const edgeTTSVoiceGroups = computed(() => {
  const voices: EdgeVoice[] = ttsStore.edgeTTSVoices
  const groups: Record<string, EdgeVoice[]> = {
    'chinese': [], 'english': [], 'japanese': [], 'korean': [], 'french': [],
    'german': [], 'spanish': [], 'italian': [], 'russian': [], 'portuguese': [], 'other': []
  }
  voices.forEach(v => {
    const lang = v.lang || v.locale
    if (lang.includes('中文') || v.id.startsWith('zh-')) groups['chinese'].push(v)
    else if (lang.includes('English') || v.id.startsWith('en-')) groups['english'].push(v)
    else if (lang.includes('日本語') || v.id.startsWith('ja-')) groups['japanese'].push(v)
    else if (lang.includes('한국어') || v.id.startsWith('ko-')) groups['korean'].push(v)
    else if (lang.includes('Français') || v.id.startsWith('fr-')) groups['french'].push(v)
    else if (lang.includes('Deutsch') || v.id.startsWith('de-')) groups['german'].push(v)
    else if (lang.includes('Español') || v.id.startsWith('es-')) groups['spanish'].push(v)
    else if (lang.includes('Italiano') || v.id.startsWith('it-')) groups['italian'].push(v)
    else if (lang.includes('Русский') || v.id.startsWith('ru-')) groups['russian'].push(v)
    else if (lang.includes('Português') || v.id.startsWith('pt-')) groups['portuguese'].push(v)
    else groups['other'].push(v)
  })
  return groups
})

// Refs
const fileInput = ref<HTMLInputElement | null>(null)
const bookInstance = ref<Book | null>(null)
const rendition = ref<Rendition | null>(null)

// State
const currentBook = computed(() => bookStore.currentBook)
const tocItems = ref<NavItem[]>([])
const showToc = ref(false)
const showThemeMenu = ref(false)
const showTTSSettings = ref(false)
const showEdgeTTSSetup = ref(false)
const currentChapter = ref('')
const currentLocation = ref('')
const canGoPrev = ref(false)
const canGoNext = ref(true)
const readingProgress = ref(0)
const progressSlider = ref(0)
const isDraggingProgress = ref(false)
const navigationHistory = ref<string[]>([])
const isFullWidth = ref(false)
const selectedText = ref('')
const toolbarPosition = ref({ top: 0, left: 0 })
const showSelectionToolbar = ref(false)

// Side panel (highlights & vocabulary)
const showSidePanel = ref(false)
const activeSideTab = ref<'highlights' | 'vocabulary' | 'flashcard'>('highlights')
const sideTabs = computed(() => [
  { id: 'highlights' as const, label: 'sidePanel.highlights', badge: highlightStore.currentBookHighlights.length },
  { id: 'vocabulary' as const, label: 'sidePanel.vocabulary', badge: vocabStore.currentBookWords.length },
  { id: 'flashcard' as const, label: 'sidePanel.flashcard', badge: vocabStore.getDueWords().length > 0 ? vocabStore.getDueWords().length : undefined },
])

// Highlight color picker
const showColorPicker = ref(false)
const colorPickerPosition = ref({ top: 0, left: 0 })
const pendingHighlightText = ref('')
const pendingHighlightCfi = ref('')
const highlightColors = HIGHLIGHT_COLORS

// Flashcard study session
const studySession = ref<VocabWord[]>([])
const currentCardIndex = ref(0)
const isCardFlipped = ref(false)
const currentCard = computed(() => studySession.value[currentCardIndex.value] || null)
const cardRatings = [
  { value: 0, label: 'sidePanel.forgot', class: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 1, label: 'sidePanel.hard', class: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { value: 2, label: 'sidePanel.good', class: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 3, label: 'sidePanel.easy', class: 'bg-green-100 text-green-700 hover:bg-green-200' },
]

// Search & sort
const searchQuery = ref('')
const sortMode = ref('all')

const filteredBooks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let books = [...bookStore.books]
  if (query) {
    books = books.filter(b =>
      (b.title || '').toLowerCase().includes(query) ||
      (b.author || '').toLowerCase().includes(query)
    )
  }
  if (sortMode.value === 'recent') {
    books.sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0) || b.addedAt - a.addedAt)
  } else if (sortMode.value === 'unread') {
    books = books.filter(b => !b.lastRead)
  }
  return books
})

const progressPercent = computed(() => Math.round(readingProgress.value * 100))
const canGoBack = computed(() => navigationHistory.value.length > 0)

// Layout
const toggleLayout = () => {
  isFullWidth.value = !isFullWidth.value
  localStorage.setItem('boox-reader-layout', isFullWidth.value ? 'full' : 'normal')
  if (rendition.value) { updateRenditionTheme(); setTimeout(() => rendition.value?.resize(), 100) }
}
const loadLayoutPreference = () => {
  const saved = localStorage.getItem('boox-reader-layout')
  isFullWidth.value = saved === 'full'
}

// Toggle menus
const toggleToc = () => { showToc.value = !showToc.value; showThemeMenu.value = false }
const toggleThemeMenu = () => { showThemeMenu.value = !showThemeMenu.value; showToc.value = false }
const closeMenus = () => { showToc.value = false; showThemeMenu.value = false }

// File upload
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const bookId = await bookStore.saveBook(file)
    if (fileInput.value) fileInput.value.value = ''
    await openBook(bookId)
  } catch (err) {
    console.error('Failed to upload book:', err)
  }
}

// Open book
const openBook = async (bookId: string) => {
  try {
    bookStore.isLoadingBook = true
    bookStore.loadingProgress = 0
    bookStore.loadingMessage = t('app.loading')

    const arrayBuffer = await bookStore.loadBookBinary(bookId)
    if (!arrayBuffer) return

    bookStore.loadingProgress = 20
    bookStore.loadingMessage = t('reader.preparingReader')

    if (rendition.value) { rendition.value.destroy(); rendition.value = null }
    if (bookInstance.value) bookInstance.value.destroy()

    const book = Epub(arrayBuffer)
    bookInstance.value = book
    const metadata = bookStore.books.find(b => b.id === bookId)

    await book.ready
    bookStore.loadingProgress = 40
    bookStore.loadingMessage = t('reader.preparingReader')

    await book.locations.generate(1000)
    bookStore.loadingProgress = 60
    bookStore.loadingMessage = t('header.toc')

    const navigation = await book.navigation
    tocItems.value = navigation.toc || []

    bookStore.setCurrentBook(book, metadata)
    await nextTick()

    // Load highlights and vocabulary for this book
    await highlightStore.loadHighlights(bookId)
    await vocabStore.loadVocabulary(bookId)
    log.info('openBook: loaded highlights and vocabulary', {
      highlights: highlightStore.currentBookHighlights.length,
      vocab: vocabStore.currentBookWords.length,
    })

    const container = document.getElementById('epub-reader')
    if (!container) return

    const availableHeight = `calc(100vh - 153px)`
    bookStore.loadingProgress = 80
    bookStore.loadingMessage = t('reader.preparingReader')

    rendition.value = book.renderTo('epub-reader', {
      width: '100%', height: availableHeight, spread: 'none',
      flow: 'scrolled-doc', allowScriptedContent: true,
    })
    updateRenditionTheme()

    const startCfi = metadata?.currentLocation
    await rendition.value.display(startCfi || 0)

    bookStore.loadingProgress = 100
    bookStore.loadingMessage = t('app.loading')
    setTimeout(() => { bookStore.isLoadingBook = false; bookStore.loadingProgress = 0 }, 300)

    // Setup iframe events
    const setupAfterLoad = () => {
      let attempts = 0
      const maxAttempts = 25
      const trySetup = () => {
        attempts++
        const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
        if (!iframe) { if (attempts < maxAttempts) setTimeout(trySetup, 200); return }
        const iframeDoc = iframe.contentDocument || (iframe.contentWindow as any)?.document
        if (!iframeDoc?.body) { if (attempts < maxAttempts) setTimeout(trySetup, 200); return }
        if ((iframeDoc as any).__selectionSetup) return

        const bodyText = iframeDoc.body.textContent?.trim()
        if ((!bodyText || bodyText.length < 10) && attempts < maxAttempts) {
          setTimeout(trySetup, 200); return
        }

        const handleSelection = () => {
          setTimeout(() => {
            const selection = iframeDoc.getSelection()
            const text = selection?.toString()?.trim()
            if (text?.length > 0) {
              selectedText.value = text
              const range = selection?.getRangeAt(0)
              if (range) {
                const rect = range.getBoundingClientRect()
                const iframeRect = iframe.getBoundingClientRect()
                toolbarPosition.value = {
                  top: Math.max(70, iframeRect.top + rect.top - 60),
                  left: Math.max(10, Math.min(iframeRect.left + rect.left + rect.width / 2 - 110, window.innerWidth - 230))
                }
                showSelectionToolbar.value = true
              }
            }
          }, 50)
        }

        iframeDoc.addEventListener('mouseup', handleSelection)
        iframeDoc.addEventListener('mousedown', () => {
          if (!iframeDoc.getSelection()?.toString()?.trim()) hideSelectionToolbar()
        })

        // Intercept internal links
        iframeDoc.addEventListener('click', (event: MouseEvent) => {
          const link = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
          if (!link) return
          const href = link.getAttribute('href')
          if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return

          try {
            const rend = rendition.value as any
            let currentCfi: string | undefined
            if (rend?.location?.start?.cfi) currentCfi = rend.location.start.cfi
            if (!currentCfi && typeof rend?.currentLocation === 'function') {
              const loc = rend.currentLocation()
              if (loc?.start?.cfi) currentCfi = loc.start.cfi
            }
            if (currentCfi && navigationHistory.value[navigationHistory.value.length - 1] !== currentCfi) {
              navigationHistory.value.push(currentCfi)
            }
          } catch (e) { console.warn('[Link] Failed to save position:', e) }
        }, true)

        ;(iframeDoc as any).__selectionSetup = true
      }
      setTimeout(trySetup, 200)
    }

    rendition.value.on('relocated', () => setupAfterLoad())
    setTimeout(() => setupAfterLoad(), 1000)
    setTimeout(() => rendition.value?.resize(), 200)

    rendition.value.on('relocated', (location: any) => {
      canGoPrev.value = !location.atStart
      canGoNext.value = !location.atEnd
      const current = location.start?.displayed?.page || 1
      const total = location.start?.displayed?.total || 1
      currentLocation.value = `${current}/${total}`
      readingProgress.value = location.start?.percentage || 0
      if (!isDraggingProgress.value) progressSlider.value = Math.round(readingProgress.value * 1000) / 10
      currentChapter.value = location.start?.href || ''
      if (metadata) bookStore.updateProgress(metadata.id, location.start.cfi)
    })
  } catch (err) {
    console.error('Failed to open book:', err)
    bookStore.isLoadingBook = false
    bookStore.loadingProgress = 0
    bookStore.loadingMessage = ''
  }
}

// Selection toolbar
const hideSelectionToolbar = () => { showSelectionToolbar.value = false; selectedText.value = '' }

const lookupWithYoudao = () => {
  if (!selectedText.value) return
  window.open(`https://dict.youdao.com/result?word=${encodeURIComponent(selectedText.value.trim())}&lang=en`, '_blank')
  hideSelectionToolbar()
}
const lookupWithCambridge = () => {
  if (!selectedText.value) return
  const text = selectedText.value.trim()
  const url = text.includes(' ')
    ? `https://dictionary.cambridge.org/zhs/词典/英语-汉语-简体/${encodeURIComponent(text.toLowerCase().replace(/ /g, '-'))}`
    : `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(text.toLowerCase())}`
  window.open(url, '_blank')
  hideSelectionToolbar()
}
const lookupWithOxford = () => {
  if (!selectedText.value) return
  window.open(`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(selectedText.value.trim().toLowerCase())}`, '_blank')
  hideSelectionToolbar()
}
const translateWithDeepL = () => {
  if (!selectedText.value) return
  window.open(`https://www.deepl.com/translator#en/zh/${encodeURIComponent(selectedText.value.trim())}`, '_blank')
  hideSelectionToolbar()
}
const translateWithGoogle = () => {
  if (!selectedText.value) return
  window.open(`https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(selectedText.value.trim())}`, '_blank')
  hideSelectionToolbar()
}
const translateWithBaidu = () => {
  if (!selectedText.value) return
  window.open(`https://fanyi.baidu.com/#en/zh/${encodeURIComponent(selectedText.value.trim())}`, '_blank')
  hideSelectionToolbar()
}
const speakSelection = () => {
  if (!selectedText.value) return
  ttsStore.speakSelection(selectedText.value)
  hideSelectionToolbar()
}
const copySelection = () => {
  if (!selectedText.value) return
  navigator.clipboard.writeText(selectedText.value)
  hideSelectionToolbar()
}

// ============ Highlights ============
const addHighlightFromSelection = () => {
  if (!selectedText.value || !currentBook.value) return
  log.trace('addHighlightFromSelection', { text: selectedText.value.slice(0, 30) })

  // Get current CFI from rendition
  let cfi = ''
  try {
    const rend = rendition.value as any
    if (rend?.location?.start?.cfi) cfi = rend.location.start.cfi
    if (!cfi && typeof rend?.currentLocation === 'function') {
      const loc = rend.currentLocation()
      if (loc?.start?.cfi) cfi = loc.start.cfi
    }
  } catch (e) { log.error('Failed to get CFI for highlight', e) }

  if (!cfi) {
    log.warn('No CFI available for highlight')
    return
  }

  // Show color picker at selection position
  pendingHighlightText.value = selectedText.value
  pendingHighlightCfi.value = cfi
  showColorPicker.value = true
  colorPickerPosition.value = {
    top: Math.max(70, toolbarPosition.value.top - 50),
    left: toolbarPosition.value.left
  }
  hideSelectionToolbar()
}

const confirmHighlight = async (color: string) => {
  if (!pendingHighlightText.value || !bookStore.currentMetadata) return

  log.info('confirmHighlight', { color, text: pendingHighlightText.value.slice(0, 30) })

  await highlightStore.addHighlight({
    bookId: bookStore.currentMetadata.id,
    cfi: pendingHighlightCfi.value,
    text: pendingHighlightText.value,
    color,
  })

  // Apply visual highlight in the iframe
  applyVisualHighlight(pendingHighlightText.value, color)

  showColorPicker.value = false
  pendingHighlightText.value = ''
  pendingHighlightCfi.value = ''
}

const applyVisualHighlight = (text: string, colorId: string) => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (!iframe?.contentDocument?.body) return

  const color = getHighlightColor(colorId)
  const body = iframe.contentDocument.body
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
  let node: Node | null

  while ((node = walker.nextNode())) {
    if (node.textContent?.includes(text)) {
      const span = iframe.contentDocument.createElement('span')
      span.className = 'mobi-highlight'
      span.style.backgroundColor = color.bg
      span.style.borderLeft = `3px solid ${color.border}`
      span.style.paddingLeft = '4px'
      span.textContent = node.textContent
      node.parentNode?.replaceChild(span, node)
      break
    }
  }
}

const getHighlightColor = (colorId: string) => {
  return HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0]
}

const deleteHighlight = async (id: string) => {
  log.info('deleteHighlight', { id })
  await highlightStore.deleteHighlight(id)
}

const navigateToHighlight = async (cfi: string) => {
  if (!rendition.value) return
  log.info('navigateToHighlight', { cfi: cfi.slice(0, 50) })
  try {
    await rendition.value.display(cfi)
    setTimeout(() => rendition.value?.resize(), 100)
  } catch (e) {
    log.error('Failed to navigate to highlight', e)
  }
}

// ============ Vocabulary ============
const addVocabFromSelection = async () => {
  if (!selectedText.value || !bookStore.currentMetadata) return

  const word = selectedText.value.trim()
  log.info('addVocabFromSelection', { word })

  // Get context from surrounding text in iframe
  let context = ''
  try {
    const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
    if (iframe?.contentDocument?.body) {
      const selection = iframe.contentDocument.getSelection()
      const range = selection?.getRangeAt(0)
      if (range) {
        const paragraph = range.commonAncestorContainer.parentElement?.closest('p')
        if (paragraph) context = paragraph.textContent?.trim() || ''
      }
    }
  } catch (e) { log.warn('Failed to get context for vocab', e) }

  await vocabStore.addWord({
    bookId: bookStore.currentMetadata.id,
    word,
    context: context.length > 200 ? context.slice(0, 200) + '...' : context,
  })

  hideSelectionToolbar()
  log.done('addVocabFromSelection', { word })
}

const deleteVocab = async (id: string) => {
  log.info('deleteVocab', { id })
  await vocabStore.deleteWord(id)
}

// ============ Flashcard Study Session ============
const startStudySession = () => {
  const due = vocabStore.getDueWords()
  if (due.length === 0) return

  studySession.value = vocabStore.getStudySession(20)
  currentCardIndex.value = 0
  isCardFlipped.value = false
  log.info('startStudySession', { count: studySession.value.length })
}

const rateCard = async (quality: 0 | 1 | 2 | 3) => {
  if (!currentCard.value) return

  log.info('rateCard', { word: currentCard.value.word, quality })
  await vocabStore.reviewWord(currentCard.value.id, quality)

  // Move to next card
  if (currentCardIndex.value < studySession.value.length - 1) {
    currentCardIndex.value++
    isCardFlipped.value = false
  } else {
    // Session complete
    log.info('studySession complete')
    studySession.value = []
    currentCardIndex.value = 0
    isCardFlipped.value = false
  }
}

// Navigation
const prevPage = () => { rendition.value?.prev(); closeMenus(); hideSelectionToolbar() }
const nextPage = () => { rendition.value?.next(); closeMenus(); hideSelectionToolbar() }

const navigateToChapter = async (href: string) => {
  if (!rendition.value) return
  let currentCfi: string | undefined
  try {
    const rend = rendition.value as any
    if (rend?.location?.start?.cfi) currentCfi = rend.location.start.cfi
    if (!currentCfi && typeof rend?.currentLocation === 'function') {
      const loc = rend.currentLocation()
      if (loc?.start?.cfi) currentCfi = loc.start.cfi
    }
  } catch (e) { console.warn('Failed to get CFI:', e) }
  if (currentCfi && currentCfi !== href) navigationHistory.value.push(currentCfi)

  await rendition.value.display(href)
  setTimeout(() => rendition.value?.resize(), 100)
  closeMenus(); hideSelectionToolbar()
}

// Progress
const handleProgressInput = () => { isDraggingProgress.value = true }
const handleProgressChange = async () => {
  if (!rendition.value || !bookInstance.value) return
  const cfi = bookInstance.value.locations.cfiFromPercentage(progressSlider.value / 100)
  if (cfi) {
    await rendition.value.display(cfi)
    setTimeout(() => rendition.value?.resize(), 100)
  }
  isDraggingProgress.value = false
  closeMenus(); hideSelectionToolbar()
}

// Go back
const goBack = async () => {
  if (navigationHistory.value.length > 0 && rendition.value) {
    const lastPos = navigationHistory.value.pop()!
    try {
      await rendition.value.display(lastPos)
      setTimeout(() => rendition.value?.resize(), 100)
    } catch (e) {
      try { await rendition.value.display(lastPos.split('#')[0]) } catch {}
    }
    closeMenus(); hideSelectionToolbar()
  }
}

// Close book
const closeBook = () => {
  ttsStore.stop(); closeMenus(); hideSelectionToolbar()
  tocItems.value = []
  if (rendition.value) { rendition.value.destroy(); rendition.value = null }
  if (bookInstance.value) { bookInstance.value.destroy(); bookInstance.value = null }
  bookStore.setCurrentBook(null)
  currentLocation.value = ''; readingProgress.value = 0; progressSlider.value = 0
  navigationHistory.value = []
}

// Delete book
const deleteBook = async (bookId: string) => {
  if (confirm(t('library.deleteConfirm'))) {
    if (bookStore.currentMetadata?.id === bookId) closeBook()
    await bookStore.deleteBook(bookId)
  }
}

// TTS
const handleTTSPlayPause = () => {
  if (ttsStore.isPaused) resumeTTS()
  else if (ttsStore.isPlaying) ttsStore.pause()
  else startTTS()
}
const handleTTSStop = () => { ttsStore.stop(); clearTTSHighlight() }

const startTTS = () => {
  const paragraphs = getParagraphsFromIframe()
  if (!paragraphs || paragraphs.length === 0) return
  ttsStore.start(paragraphs, 0)
}

const resumeTTS = () => {
  const paragraphs = getParagraphsFromIframe()
  if (!paragraphs || paragraphs.length === 0) return
  const idx = Math.min(ttsStore.pausedIndex, paragraphs.length - 1)
  ttsStore.start(paragraphs, idx)
}

const getParagraphsFromIframe = (): HTMLElement[] => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (!iframe?.contentDocument?.body) return []
  clearTTSHighlight()
  return Array.from(iframe.contentDocument.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div[class*="para"], section'))
    .filter(el => el.textContent?.trim().length > 10) as HTMLElement[]
}

const clearTTSHighlight = () => {
  const iframe = document.querySelector('#epub-reader iframe') as HTMLIFrameElement
  if (iframe?.contentDocument?.body) {
    iframe.contentDocument.body.querySelectorAll('.tts-highlight').forEach(el => {
      el.classList.remove('tts-highlight'); (el as HTMLElement).style.backgroundColor = ''
    })
  }
}

watch(() => ttsStore.isPlaying, (v) => { if (!v) clearTTSHighlight() })

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })

// Keyboard & click outside
const handleKeydown = (e: KeyboardEvent) => {
  if (!currentBook.value) return
  if (e.key === 'ArrowLeft') prevPage()
  else if (e.key === 'ArrowRight') nextPage()
  else if (e.key === 'Escape') {
    if (showToc.value || showThemeMenu.value || showSelectionToolbar.value) { closeMenus(); hideSelectionToolbar() }
    else closeBook()
  }
}
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('aside') && !target.closest('button') && !target.closest('.selection-toolbar')) closeMenus()
}

onMounted(() => {
  loadSavedTheme()
  loadLayoutPreference()
  setTimeout(() => {
    const voices = window.speechSynthesis.getVoices()
    console.log('Available TTS Voices:')
    voices.forEach(v => console.log(`  - ${v.name} (${v.lang}) ${v.localService ? '[local]' : '[remote]'}`))
  }, 1000)
  ttsStore.fetchEdgeVoices().then(ok => {
    console.log(`[Edge TTS] Loaded ${ttsStore.edgeTTSVoices.length} voices, success: ${ok}`)
  })
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
  closeBook()
})
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }

.slider { height: 3px; border-radius: 2px; outline: none; }
.slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
.slider::-moz-range-thumb { width: 12px; height: 12px; background: currentColor; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }

:deep(#epub-reader) { overflow: hidden !important; }
:deep(#epub-reader iframe) { border: none; max-width: 100% !important; overflow-x: hidden !important; pointer-events: auto !important; }
.selection-toolbar { pointer-events: auto !important; user-select: none; }
:deep(.tts-active-paragraph) { background-color: rgba(59, 130, 246, 0.15) !important; border-left: 4px solid #3b82f6 !important; padding-left: 12px !important; }
</style>
