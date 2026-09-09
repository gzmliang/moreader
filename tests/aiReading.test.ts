import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiReadingStore } from '../src/stores/aiReadingStore'
import type { ChapterQuizData } from '../src/types/aiReading'

describe('AI Reading & 小聪章节测验状态测试 (aiReadingStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态应为空', () => {
    const store = useAiReadingStore()
    expect(store.currentSummaryData).toBeNull()
    expect(store.currentQuizData).toBeNull()
    expect(store.isGeneratingSummary).toBe(false)
    expect(store.isGeneratingQuiz).toBe(false)
  })

  it('答题记录与得分计算应当准确无误', async () => {
    const store = useAiReadingStore()

    const mockQuiz: ChapterQuizData = {
      bookId: 'book_123',
      chapterHref: 'chapter_1.html',
      chapterTitle: '第一章',
      scope: 'chapter',
      count: 3,
      level: 'detail',
      questions: [
        {
          id: 'q1',
          question: '玫瑰花底下缩着什么动物？',
          options: [
            { key: 'A', text: '小鸟' },
            { key: 'B', text: '蜗牛' },
            { key: 'C', text: '小青蛙' },
            { key: 'D', text: '蝴蝶' },
          ],
          answer: 'B',
          explanation: '原文提到玫瑰花底下一只蜗牛缩在自己的硬壳里。',
        },
        {
          id: 'q2',
          question: '蜗牛想要作什么？',
          options: [
            { key: 'A', text: '睡觉' },
            { key: 'B', text: '开花' },
            { key: 'C', text: '更惊天动地的大事' },
            { key: 'D', text: '产奶' },
          ],
          answer: 'C',
          explanation: '蜗牛说自己要作一番惊天动地的大事。',
        },
        {
          id: 'q3',
          question: '花园中央种着什么？',
          options: [
            { key: 'A', text: '一株枝叶繁茂的玫瑰' },
            { key: 'B', text: '一棵苹果树' },
            { key: 'C', text: '一片草地' },
            { key: 'D', text: '向日葵' },
          ],
          answer: 'A',
          explanation: '原文第一句交代花园中央是一株枝叶繁茂的玫瑰。',
        },
      ],
      updatedAt: Date.now(),
    }

    store.currentQuizData = mockQuiz

    // 1. 回答第 1 题（答对）
    await store.answerQuestion('q1', 'B')
    expect(store.currentQuizData.questions[0].userAnswer).toBe('B')
    expect(store.currentQuizData.score).toBe(1)
    expect(store.currentQuizData.completedAt).toBeUndefined()

    // 2. 回答第 2 题（答错）
    await store.answerQuestion('q2', 'A')
    expect(store.currentQuizData.questions[1].userAnswer).toBe('A')
    expect(store.currentQuizData.score).toBe(1) // 依然是 1 分

    // 3. 回答第 3 题（答对，完成全卷）
    await store.answerQuestion('q3', 'A')
    expect(store.currentQuizData.questions[2].userAnswer).toBe('A')
    expect(store.currentQuizData.score).toBe(2) // 3 题答对 2 题
    expect(store.currentQuizData.completedAt).toBeDefined()

    // 4. 重置答题
    await store.resetQuizAnswers()
    expect(store.currentQuizData.questions[0].userAnswer).toBeUndefined()
    expect(store.currentQuizData.score).toBeUndefined()
    expect(store.currentQuizData.completedAt).toBeUndefined()
  })
})
