import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiReadingDb } from '@/utils/db'
import { useLLMStore } from '@/stores/llmStore'
import { callCustomLLM } from '@/services/llm'
import type {
  BlinkistRatio,
  BlinkistLevel,
  BlinkistBook,
  ChapterSummaryData,
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
  const currentSummaryData = ref<ChapterSummaryData | null>(null)
  const currentQuizData = ref<ChapterQuizData | null>(null)
  const quizHistory = ref<QuizHistoryRecord[]>([])
  const errorMsg = ref<string>('')

  // 1. 缓存读取与写入辅助函数
  const getSummaryCacheKey = (bookId: string, chapterHref: string, ratio: string, level: string) => {
    return `summary_${bookId}_${encodeURIComponent(chapterHref)}_${ratio}_${level}`
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
      const updated = [record, ...list.filter(r => r.id !== record.id)].slice(0, 50)
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
    ratio: BlinkistRatio = '50',
    level: BlinkistLevel = 'standard'
  ): Promise<ChapterSummaryData | null> => {
    try {
      const key = getSummaryCacheKey(bookId, chapterHref, ratio, level)
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

  // 2. 生成 Blinkist 简读本与核心要点
  const generateBlinkistBook = async (params: {
    bookId: string
    chapterHref: string
    chapterTitle: string
    chapterText: string
    ratio: BlinkistRatio
    level: BlinkistLevel
    isChineseBook?: boolean
    onChunk?: (text: string) => void
  }): Promise<ChapterSummaryData> => {
    isGeneratingSummary.value = true
    errorMsg.value = ''

    const isChinese = !!params.isChineseBook
    const ratioDesc =
      params.ratio === '20' ? '极简精炼（约原篇幅 20%，提炼骨干主线）' :
      params.ratio === '50' ? '标准精读（约原篇幅 50%，保留关键情节与生动对话）' :
      '详实浓缩（约原篇幅 70%，高度还原全貌）'

    const levelDesc =
      params.level === 'easy' ? '浅显易懂，适合青少年或初阶读者，语言生动形象' :
      params.level === 'advanced' ? '文学风貌，保留高阶辞藻与深度隐喻' :
      '标准雅致通读，条理分明'

    const langInstruction = isChinese
      ? '请使用优美自然的现代中文进行提炼与创作。'
      : 'Keep the original English flavor, but provide key terms/takeaways with bilingual Chinese glosses where helpful.'

    const systemPrompt = `你是一位世界顶级的图书精读专家（类似 Blinkist 创始团队首席主编）。
你的任务是将读者提供的书籍篇章，制作成一份结构极其清晰、富有洞见的【Blinkist 风格精读缩写读本】。

制作规范：
1. 压缩篇幅目标：${ratioDesc}。
2. 词汇与语言难度：${levelDesc}。
3. 语言指引：${langInstruction}。
4. 结构必须严格包含三个模块：
   - 【一句话核心洞察 (One-liner)】：高度概括本篇/本章最震撼或最本质的命题。
   - 【核心要点拆解 (Key Ideas & Story)】：划分为 3~5 个小标题，每个要点写一段生动扎实的叙事/论述。
   - 【行动启示与回味 (Key Takeaway)】：留给读者的思考题或启发。

请直接以清晰易读的 Markdown 格式输出，排版典雅，杜绝废话。`

    const userPrompt = `书籍篇章：${params.chapterTitle}
章节正文内容如下：
"""
${params.chapterText.slice(0, 18000)}
"""`

    try {
      const res = await callCustomLLM(
        llmStore.config,
        {
          systemPrompt,
          userPrompt,
          temperature: 0.3,
          max_tokens: 3500,
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
        ratio: params.ratio,
        level: params.level,
        createdAt: Date.now(),
      }

      const summaryData: ChapterSummaryData = {
        bookId: params.bookId,
        chapterHref: params.chapterHref,
        chapterTitle: params.chapterTitle,
        summaryBullets: bullets.length ? bullets : [params.chapterTitle],
        blinkist,
        updatedAt: Date.now(),
      }

      const cacheKey = getSummaryCacheKey(params.bookId, params.chapterHref, params.ratio, params.level)
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

  // 3. 生成小聪智能章节测验
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
        ? '重点考察章节中的核心事实细节、人物动作、关键物品、时间地点等。'
        : '重点考察情节因果关系、人物心理动机、故事逻辑推断等深层理解。'

    const systemPrompt = `你是一位专业且耐心的名师出题专家（辅助家长检验学生阅读理解）。
你的出题风格秉持【小聪阅读测验规范】：
1. 铁律：题目必须100%严格依据提供的故事原文出题，绝不能凭空想象或出无依据的题目。
2. 语言对齐：${langRule}
3. 选项设计：必须出 4 选 1 单选题（A/B/C/D）。干扰项必须看起来合理但明确被原文否定。
4. 正确答案分布打乱：正确答案（A、B、C、D）必须均匀分布，严禁全集中在同一字母！
5. 名师中文深度解析：【关键】无论原书语言，解析（explanation）统一使用母语中文撰写，必须明确指出考点及对应原文哪句话或哪个情节！
6. 请严格输出纯 JSON 格式数组，不要包含任何 markdown 标记或多余文字，结构如下：
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

    const userPrompt = `书籍篇章：${params.chapterTitle}
考查侧重：${levelRule}
题目数量：必须生成恰好 ${params.count} 道单选题。

正文内容：
"""
${params.chapterText.slice(0, 18000)}
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

  // 4. 提交某道题的作答记录
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
    currentSummaryData,
    currentQuizData,
    quizHistory,
    errorMsg,
    loadSummaryCache,
    loadQuizCache,
    loadQuizHistory,
    generateBlinkistBook,
    generateQuiz,
    answerQuestion,
    submitQuizAnswers,
    resetQuizAnswers,
  }
})
