import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiReadingDb } from '@/utils/db'
import { useLLMStore } from '@/stores/llmStore'
import { callCustomLLM } from '@/services/llm'
import type {
  BlinkistRatio,
  BlinkistLevel,
  SummaryLanguageMode,
  BlinkistBook,
  ChapterSummaryData,
  CharacterPlotMap,
  QuizCount,
  QuizScope,
  QuizLevel,
  QuizQuestion,
  QuizFeedbackMode,
  QuizHistoryRecord,
  ChapterQuizData,
} from '@/types/aiReading'

export const useAiReadingStore = defineStore('aiReading', () => {
  const llmStore = useLLMStore()

  const isGeneratingSummary = ref(false)
  const isGeneratingQuiz = ref(false)
  const isGeneratingMap = ref(false)
  const currentSummaryData = ref<ChapterSummaryData | null>(null)
  const currentQuizData = ref<ChapterQuizData | null>(null)
  const quizHistory = ref<QuizHistoryRecord[]>([])
  const errorMsg = ref<string>('')

  // 0. 彻底清理当前图书的内存状态（换书时强隔离生命周期）
  const resetActiveBookState = () => {
    currentSummaryData.value = null
    currentQuizData.value = null
    quizHistory.value = []
    errorMsg.value = ''
  }

  // 1. 缓存读取与写入辅助函数
  const getSummaryCacheKey = (bookId: string, chapterHref: string, scope: string, ratio: number, level: string, langMode: string) => {
    return `summary_${bookId}_${encodeURIComponent(chapterHref)}_${scope}_${ratio}_${level}_${langMode}`
  }

  const getMapCacheKey = (bookId: string, chapterHref: string, scope: string, langMode: string) => {
    return `map_${bookId}_${encodeURIComponent(chapterHref)}_${scope}_${langMode}`
  }

  const getQuizCacheKey = (bookId: string, chapterHref: string, count: number, scope: string, level: string) => {
    return `quiz_${bookId}_${encodeURIComponent(chapterHref)}_${scope}_${count}_${level}`
  }

  const getHistoryKey = (bookId: string) => `quiz_history_${bookId}`

  // 加载书籍历史自测成绩单
  const loadQuizHistory = async (bookId: string): Promise<QuizHistoryRecord[]> => {
    try {
      const records = await aiReadingDb.getItem<QuizHistoryRecord[]>(getHistoryKey(bookId))
      quizHistory.value = records || []
      return quizHistory.value
    } catch (e) {
      console.warn('[AI Reading] Failed to load quiz history:', e)
      quizHistory.value = []
      return []
    }
  }

  // 保存成绩记录到历史成绩单
  const saveQuizHistoryRecord = async (record: QuizHistoryRecord) => {
    try {
      const list = await loadQuizHistory(record.bookId)
      // 最多保留最近 50 次测验历史，新的排在前面
      const updated = [record, ...list.filter((r) => r.id !== record.id)].slice(0, 50)
      await aiReadingDb.setItem(getHistoryKey(record.bookId), updated)
      quizHistory.value = updated
    } catch (e) {
      console.warn('[AI Reading] Failed to save quiz history record:', e)
    }
  }

  // 加载缓存的摘要与 Blinkist
  const loadSummaryCache = async (
    bookId: string,
    chapterHref: string,
    scope: QuizScope = 'chapter',
    ratio: number = 30,
    level: BlinkistLevel = 'standard',
    langMode: SummaryLanguageMode = 'bilingual'
  ): Promise<ChapterSummaryData | null> => {
    try {
      const key = getSummaryCacheKey(bookId, chapterHref, scope, ratio, level, langMode)
      const data = await aiReadingDb.getItem<ChapterSummaryData>(key)
      if (data) {
        currentSummaryData.value = data
        return data
      }
    } catch (e) {
      console.warn('[AI Reading] Failed to load summary cache:', e)
    }
    return null
  }

  // 加载人物脉络与情节图谱缓存
  const loadMapCache = async (
    bookId: string,
    chapterHref: string,
    scope: QuizScope = 'chapter',
    langMode: SummaryLanguageMode = 'bilingual'
  ): Promise<CharacterPlotMap | null> => {
    try {
      const key = getMapCacheKey(bookId, chapterHref, scope, langMode)
      const data = await aiReadingDb.getItem<CharacterPlotMap>(key)
      if (data) {
        if (!currentSummaryData.value) {
          currentSummaryData.value = {
            bookId,
            chapterHref,
            chapterTitle: '',
            scope,
            characterMap: data,
            updatedAt: data.createdAt,
          }
        } else {
          currentSummaryData.value.characterMap = data
        }
        return data
      }
    } catch (e) {
      console.warn('[AI Reading] Failed to load map cache:', e)
    }
    return null
  }

  // 加载缓存的小聪测验
  const loadQuizCache = async (
    bookId: string,
    chapterHref: string,
    count: QuizCount = 5,
    scope: QuizScope = 'chapter',
    level: QuizLevel = 'detail'
  ): Promise<ChapterQuizData | null> => {
    try {
      const key = getQuizCacheKey(bookId, chapterHref, count, scope, level)
      const data = await aiReadingDb.getItem<ChapterQuizData>(key)
      if (data) {
        currentQuizData.value = data
        return data
      }
    } catch (e) {
      console.warn('[AI Reading] Failed to load quiz cache:', e)
    }
    return null
  }

  // 2. 生成 Blinkist 简读本与核心要点（严格对齐自由输入比例与 AI 设置语言对）
  const generateBlinkistBook = async (params: {
    bookId: string
    chapterHref: string
    chapterTitle: string
    chapterText: string
    scope: QuizScope
    ratio: number
    level: BlinkistLevel
    langMode: SummaryLanguageMode
    sourceLang: string
    targetLang: string
    onChunk?: (text: string) => void
  }): Promise<ChapterSummaryData> => {
    isGeneratingSummary.value = true
    errorMsg.value = ''

    const targetRatio = Math.max(10, Math.min(80, params.ratio || 30))
    const rawCharCount = params.chapterText.length
    // 严密计算足额目标输出字数（至少原篇幅的对应比例，不偷工减料）
    const minTargetWords = Math.max(400, Math.round((rawCharCount * targetRatio) / 100))

    const levelDesc =
      params.level === 'easy'
        ? '浅显易懂，适合青少年或初阶读者，语言生动形象'
        : params.level === 'advanced'
        ? '文学风貌，保留高阶辞藻与深度隐喻'
        : '标准雅致通读，条理分明'

    const scopeDesc =
      params.scope === 'book'
        ? '【全书全局宏观总览】：请跨越所有章节，提炼全书的世界观主线、关键转折与终局寓意。'
        : '【当前章节深度精读】：聚焦当前章节的人物行动与具体冲突。'

    let langInstruction = ''
    if (params.langMode === 'original') {
      langInstruction = `【语言要求】：100% 使用源语言（${params.sourceLang === 'auto' ? '原著语言' : params.sourceLang}）撰写全文，保留纯正原著语言风貌，不要翻译。`
    } else if (params.langMode === 'target') {
      langInstruction = `【语言要求】：100% 使用目标语言（${params.targetLang}）撰写全文，让读者以最熟悉的母语畅快速览。`
    } else {
      langInstruction = `【语言要求 - 双语对照】：对于每个核心要点和叙述段落，先给出源语言（${params.sourceLang === 'auto' ? '原著语言' : params.sourceLang}）精炼叙述，紧接着给出对应的目标语言（${params.targetLang}）翻译，格式清晰整齐。`
    }

    const systemPrompt = `你是一位世界顶级的图书精读专家（类似 Blinkist 创始团队首席主编）。
你的任务是将读者提供的书籍内容，制作成一份结构极其清晰、富有洞见的【Blinkist 风格精读缩写读本】。

制作铁律规范：
1. 分析范围侧重：${scopeDesc}
2. 篇幅目标严格要求：读者指定了浓缩比例为【${targetRatio}%】。原文字数约为 ${rawCharCount} 字，你的生成内容必须扎实充分展开，目标篇幅建议不少于 ${minTargetWords} 字/词，绝不能三两句话敷衍了事！
3. 词汇与语言难度：${levelDesc}。
4. ${langInstruction}
5. 结构必须严格包含三个模块：
   - 【一句话核心洞察 (One-liner)】：高度概括本篇/全书最本质的命题或故事核心。
   - 【核心要点拆解 (Key Ideas & Story)】：划分为 3~6 个小标题，每个要点按足额篇幅展开叙事、重要对话与因果转折。
   - 【行动启示与回味 (Key Takeaway)】：留给读者的思考题或核心启示。

请直接以清晰易读的 Markdown 格式输出，排版典雅，杜绝废话。`

    const userPrompt = `书籍篇章/范围：${params.chapterTitle} (${params.scope === 'book' ? '全书' : '当前章节'})
文本内容如下：
"""
${params.chapterText.slice(0, 24000)}
"""`

    try {
      const res = await callCustomLLM(
        llmStore.config,
        {
          systemPrompt,
          userPrompt,
          temperature: 0.3,
          max_tokens: 3800,
        },
        params.onChunk
      )

      if (!res.success || !res.text) {
        throw new Error(res.error || '未能生成精读本，请检查 AI 接口设置')
      }

      const lines = res.text.split('\n')
      const bullets = lines
        .filter((l) => /^[•\-*]|\d+\./.test(l.trim()))
        .map((l) => l.replace(/^[•\-*]|\d+\.\s*/, '').trim())
        .filter((l) => l.length >= 6)
        .slice(0, 5)

      const blinkist: BlinkistBook = {
        oneLiner: bullets[0] || params.chapterTitle,
        keyIdeas: [],
        takeaway: '',
        fullMarkdown: res.text,
        ratio: targetRatio,
        level: params.level,
        langMode: params.langMode,
        sourceLang: params.sourceLang,
        targetLang: params.targetLang,
        createdAt: Date.now(),
      }

      const summaryData: ChapterSummaryData = {
        bookId: params.bookId,
        chapterHref: params.chapterHref,
        chapterTitle: params.chapterTitle,
        scope: params.scope,
        summaryBullets: bullets.length ? bullets : [params.chapterTitle],
        blinkist,
        updatedAt: Date.now(),
      }

      const cacheKey = getSummaryCacheKey(
        params.bookId,
        params.chapterHref,
        params.scope,
        targetRatio,
        params.level,
        params.langMode
      )
      await aiReadingDb.setItem(cacheKey, summaryData)
      currentSummaryData.value = summaryData
      return summaryData
    } catch (e: any) {
      errorMsg.value = e.message || '生成精读本失败'
      throw e
    } finally {
      isGeneratingSummary.value = false
    }
  }

  // 3. 生成人物关系网与情节脉络图 (对齐源语言与目标语言对)
  const generateCharacterMap = async (params: {
    bookId: string
    chapterHref: string
    chapterTitle: string
    chapterText: string
    scope: QuizScope
    langMode: SummaryLanguageMode
    sourceLang: string
    targetLang: string
  }): Promise<CharacterPlotMap> => {
    isGeneratingMap.value = true
    errorMsg.value = ''

    let langRule = ''
    if (params.langMode === 'original') {
      langRule = `角色名称、阵营与关系描述全部使用源语言（${params.sourceLang === 'auto' ? '原著语言' : params.sourceLang}），不翻译。`
    } else if (params.langMode === 'target') {
      langRule = `角色名称使用读者习惯的目标语言（${params.targetLang}）或知名译名，关系说明全部使用目标语言。`
    } else {
      langRule = `【双语对齐】：角色名称与阵营若有不同语言表达，使用“源语言 / 目标语言”双语呈现（如 'Jon Snow / 琼恩·雪诺'），关系描述以目标语言（${params.targetLang}）为主，兼顾双语对照。`
    }

    const scopeRule =
      params.scope === 'book'
        ? '【全书全局视角】：梳理全书最核心的人物阵营/家族，以及贯穿全书的核心人物关系网和重大发展主线。'
        : '【当前章节微观视角】：梳理本章出场人物之间的相互作用、对话关系与本章情节推进点。'

    const systemPrompt = `你是一位文学结构与剧本编剧分析专家。
你的任务是将读者提供的书籍文本，解析出极其清晰的【人物关系网络与情节发展脉络】（参考《权力的游戏》人物图谱与思维导图）。

分析要求：
1. 范围：${scopeRule}
2. 语言规范：${langRule}
3. 必须输出严格的纯 JSON 格式对象，不要包含任何 markdown 包裹，JSON 结构如下：
{
  "summary": "一句话总述本篇人物格局与情节推进核心",
  "nodes": [
    {"name": "角色A", "role": "主角/身份", "faction": "所属阵营/家族/立场"},
    {"name": "角色B", "role": "对手/长辈", "faction": "所属阵营/家族/立场"}
  ],
  "edges": [
    {"from": "角色A", "to": "角色B", "relation": "盟友/死敌/父子/师徒/密谋"}
  ],
  "timeline": [
    {"stage": "起因/开局", "event": "具体发生的关键事件"},
    {"stage": "冲突/转折", "event": "核心矛盾爆发或决定性转折"},
    {"stage": "结果/伏笔", "event": "本段落局面走向或留下的悬念"}
  ]
}`

    const userPrompt = `书籍篇章/范围：${params.chapterTitle} (${params.scope === 'book' ? '全书' : '当前章节'})
文本内容如下：
"""
${params.chapterText.slice(0, 24000)}
"""`

    try {
      const res = await callCustomLLM(llmStore.config, {
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        max_tokens: 3000,
      })

      if (!res.success || !res.text) {
        throw new Error(res.error || '未能生成人物脉络，请检查 AI 接口设置')
      }

      let jsonText = res.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      }

      let parsed: any = {}
      try {
        parsed = JSON.parse(jsonText)
      } catch {
        const match = jsonText.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else throw new Error('人物脉络格式解析失败')
      }

      const characterMap: CharacterPlotMap = {
        summary: parsed.summary || '主要角色互动与情节推进脉络',
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
        fullMarkdown: res.text,
        createdAt: Date.now(),
      }

      const cacheKey = getMapCacheKey(params.bookId, params.chapterHref, params.scope, params.langMode)
      await aiReadingDb.setItem(cacheKey, characterMap)

      if (!currentSummaryData.value) {
        currentSummaryData.value = {
          bookId: params.bookId,
          chapterHref: params.chapterHref,
          chapterTitle: params.chapterTitle,
          scope: params.scope,
          characterMap,
          updatedAt: Date.now(),
        }
      } else {
        currentSummaryData.value.characterMap = characterMap
      }

      return characterMap
    } catch (e: any) {
      errorMsg.value = e.message || '生成人物脉络图谱失败'
      throw e
    } finally {
      isGeneratingMap.value = false
    }
  }

  // 4. 生成小聪智能章节测验
  const generateQuiz = async (params: {
    bookId: string
    bookTitle?: string
    chapterHref: string
    chapterTitle: string
    chapterText: string
    count: QuizCount
    scope: QuizScope
    level: QuizLevel
    feedbackMode: QuizFeedbackMode
    isChineseBook?: boolean
  }): Promise<ChapterQuizData> => {
    isGeneratingQuiz.value = true
    errorMsg.value = ''

    const isChinese = !!params.isChineseBook
    const langRule = isChinese
      ? '原书为中文，题干与选项必须使用中文。'
      : '原书为英文，题干（question）与选项（options）必须使用地道英语，保持英文阅读原貌。'

    const levelRule =
      params.level === 'detail'
        ? '重点考察文本中的核心事实细节、人物动作、关键物品、时间地点等。'
        : '重点考察情节因果关系、人物心理动机、故事逻辑推断等深层理解。'

    const scopeRule =
      params.scope === 'book'
        ? '【全书综合测验】：请覆盖全书核心人物命运走向、主线转折与整体主题。'
        : '【当前章节自测】：严格针对当前章节情节细节出题。'

    const systemPrompt = `你是一位专业且耐心的名师出题专家（辅助家长检验学生阅读理解）。
你的出题风格秉持【小聪阅读测验规范】：
1. 范围指引：${scopeRule}
2. 铁律：题目必须100%严格依据提供的文本内容出题，绝不能凭空想象或出无依据的题目。
3. 语言对齐：${langRule}
4. 选项设计：必须出 4 选 1 单选题（A/B/C/D）。干扰项必须看起来合理但明确被原文否定。
5. 正确答案分布打乱：正确答案（A、B、C、D）必须均匀分布，严禁全集中在同一字母！
6. 名师中文深度解析：【关键】无论原书语言，解析（explanation）统一使用母语中文撰写，必须明确指出考点及对应原文哪句话或哪个情节！
7. 请严格输出纯 JSON 格式数组，不要包含任何 markdown 标记或多余文字，结构如下：
[
  {
    "id": "q1",
    "question": "题干内容",
    "options": [
      {"key": "A", "text": "选项A内容"},
      {"key": "B", "text": "选项B内容"},
      {"key": "C", "text": "选项C内容"},
      {"key": "D", "text": "选项D内容"}
    ],
    "answer": "B",
    "explanation": "简明中文解析，指出根据原文某处说明了什么，为什么选B。"
  }
]`

    const userPrompt = `书籍篇章/范围：${params.chapterTitle} (${params.scope === 'book' ? '全书' : '当前章节'})
考查侧重：${levelRule}
题目数量：必须生成恰好 ${params.count} 道单选题。

正文内容：
"""
${params.chapterText.slice(0, 22000)}
"""`

    try {
      const res = await callCustomLLM(llmStore.config, {
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        max_tokens: 3000,
      })

      if (!res.success || !res.text) {
        throw new Error(res.error || '未能生成测验题目，请检查 AI 接口设置')
      }

      let jsonText = res.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      }

      let parsedQuestions: QuizQuestion[] = []
      try {
        parsedQuestions = JSON.parse(jsonText)
      } catch {
        const match = jsonText.match(/\[[\s\S]*\]/)
        if (match) {
          parsedQuestions = JSON.parse(match[0])
        } else {
          throw new Error('题目格式解析失败，模型未返回标准 JSON')
        }
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('未识别到有效测验题目')
      }

      const questions: QuizQuestion[] = parsedQuestions.map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question,
        options: q.options || [],
        answer: (q.answer || 'A').toUpperCase() as any,
        explanation: q.explanation || '请参考原文情节理解。',
      }))

      const quizData: ChapterQuizData = {
        bookId: params.bookId,
        chapterHref: params.chapterHref,
        chapterTitle: params.chapterTitle,
        scope: params.scope,
        count: params.count,
        level: params.level,
        feedbackMode: params.feedbackMode,
        isSubmitted: false,
        questions,
        updatedAt: Date.now(),
      }

      const cacheKey = getQuizCacheKey(params.bookId, params.chapterHref, params.count, params.scope, params.level)
      await aiReadingDb.setItem(cacheKey, quizData)
      currentQuizData.value = quizData
      return quizData
    } catch (e: any) {
      errorMsg.value = e.message || '生成测验题目失败'
      throw e
    } finally {
      isGeneratingQuiz.value = false
    }
  }

  // 5. 提交某道题的作答记录
  const answerQuestion = async (questionId: string, selectedKey: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuizData.value) return
    const q = currentQuizData.value.questions.find((item) => item.id === questionId)
    if (q) {
      q.userAnswer = selectedKey

      const answeredCount = currentQuizData.value.questions.filter((item) => !!item.userAnswer).length
      const correctCount = currentQuizData.value.questions.filter((item) => item.userAnswer === item.answer).length
      currentQuizData.value.score = correctCount

      // 即时模式下，答完最后一题自动归档成绩单
      if (currentQuizData.value.feedbackMode === 'instant' && answeredCount === currentQuizData.value.questions.length) {
        currentQuizData.value.completedAt = Date.now()
        await archiveCurrentQuizHistory()
      }

      currentQuizData.value.updatedAt = Date.now()
      const cacheKey = getQuizCacheKey(
        currentQuizData.value.bookId,
        currentQuizData.value.chapterHref,
        currentQuizData.value.count,
        currentQuizData.value.scope,
        currentQuizData.value.level
      )
      await aiReadingDb.setItem(cacheKey, currentQuizData.value)
    }
  }

  // 完卷模式：统一提交全卷并归档历史成绩
  const submitQuizAnswers = async () => {
    if (!currentQuizData.value) return
    currentQuizData.value.isSubmitted = true
    currentQuizData.value.completedAt = Date.now()

    const correctCount = currentQuizData.value.questions.filter((item) => item.userAnswer === item.answer).length
    currentQuizData.value.score = correctCount
    currentQuizData.value.updatedAt = Date.now()

    await archiveCurrentQuizHistory()

    const cacheKey = getQuizCacheKey(
      currentQuizData.value.bookId,
      currentQuizData.value.chapterHref,
      currentQuizData.value.count,
      currentQuizData.value.scope,
      currentQuizData.value.level
    )
    await aiReadingDb.setItem(cacheKey, currentQuizData.value)
  }

  // 将当前成绩归档至阅读战报历史
  const archiveCurrentQuizHistory = async () => {
    if (!currentQuizData.value) return
    const total = currentQuizData.value.questions.length
    const score = currentQuizData.value.score || 0
    const percent = total > 0 ? Math.round((score / total) * 100) : 0

    const record: QuizHistoryRecord = {
      id: `history_${Date.now()}`,
      bookId: currentQuizData.value.bookId,
      chapterHref: currentQuizData.value.chapterHref,
      chapterTitle: currentQuizData.value.chapterTitle,
      scope: currentQuizData.value.scope,
      count: currentQuizData.value.count,
      level: currentQuizData.value.level,
      feedbackMode: currentQuizData.value.feedbackMode,
      score,
      total,
      percent,
      timestamp: Date.now(),
      questions: JSON.parse(JSON.stringify(currentQuizData.value.questions)),
    }

    await saveQuizHistoryRecord(record)
  }

  // 重新作答（清除答案记录）
  const resetQuizAnswers = async () => {
    if (!currentQuizData.value) return
    currentQuizData.value.questions.forEach((q) => {
      delete q.userAnswer
    })
    delete currentQuizData.value.score
    delete currentQuizData.value.completedAt
    currentQuizData.value.isSubmitted = false
    currentQuizData.value.updatedAt = Date.now()

    const cacheKey = getQuizCacheKey(
      currentQuizData.value.bookId,
      currentQuizData.value.chapterHref,
      currentQuizData.value.count,
      currentQuizData.value.scope,
      currentQuizData.value.level
    )
    await aiReadingDb.setItem(cacheKey, currentQuizData.value)
  }

  return {
    isGeneratingSummary,
    isGeneratingQuiz,
    isGeneratingMap,
    currentSummaryData,
    currentQuizData,
    quizHistory,
    errorMsg,
    resetActiveBookState,
    loadSummaryCache,
    loadMapCache,
    loadQuizCache,
    loadQuizHistory,
    generateBlinkistBook,
    generateCharacterMap,
    generateQuiz,
    answerQuestion,
    submitQuizAnswers,
    resetQuizAnswers,
  }
})
