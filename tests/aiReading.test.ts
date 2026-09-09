import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiReadingStore } from '../src/stores/aiReadingStore'
import type { ChapterQuizData } from '../src/types/aiReading'

describe('AI Reading 双模式答题与历史归档测试 (aiReadingStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('即时反馈模式：答题实时判分并在答完全部时自动归档历史', async () => {
    const store = useAiReadingStore()

    const mockQuiz: ChapterQuizData = {
      bookId: 'book_instant_1',
      chapterHref: 'c1.html',
      chapterTitle: '第一章 玫瑰',
      scope: 'chapter',
      count: 3,
      level: 'detail',
      feedbackMode: 'instant',
      questions: [
        {
          id: 'q1',
          question: '玫瑰是什么颜色的？',
          options: [{ key: 'A', text: '红' }, { key: 'B', text: '白' }],
          answer: 'A',
          explanation: '文中是红玫瑰。',
        },
        {
          id: 'q2',
          question: '蜗牛在哪里？',
          options: [{ key: 'A', text: '花下' }, { key: 'B', text: '树上' }],
          answer: 'A',
          explanation: '蜗牛缩在花底下。',
        },
      ],
      updatedAt: Date.now(),
    }

    store.currentQuizData = mockQuiz

    // 答第 1 题
    await store.answerQuestion('q1', 'A')
    expect(store.currentQuizData.score).toBe(1)
    expect(store.currentQuizData.completedAt).toBeUndefined()

    // 答完第 2 题，自动归档
    await store.answerQuestion('q2', 'A')
    expect(store.currentQuizData.score).toBe(2)
    expect(store.currentQuizData.completedAt).toBeDefined()

    // 验证历史记录已生成
    const history = await store.loadQuizHistory('book_instant_1')
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].score).toBe(2)
    expect(history[0].percent).toBe(100)
  })

  it('完卷提交模式：答题不立即归档，直到主动触发 submitQuizAnswers 才揭晓并归档', async () => {
    const store = useAiReadingStore()

    const mockQuiz: ChapterQuizData = {
      bookId: 'book_submit_2',
      chapterHref: 'c2.html',
      chapterTitle: '第二章 蜗牛',
      scope: 'chapter',
      count: 3,
      level: 'detail',
      feedbackMode: 'submit',
      isSubmitted: false,
      questions: [
        {
          id: 'q1',
          question: '蜗牛背着什么？',
          options: [{ key: 'A', text: '硬壳' }, { key: 'B', text: '背包' }],
          answer: 'A',
          explanation: '自己坚硬的壳。',
        },
      ],
      updatedAt: Date.now(),
    }

    store.currentQuizData = mockQuiz

    // 选中答案，未提交前 isSubmitted 为 false
    await store.answerQuestion('q1', 'A')
    expect(store.currentQuizData.isSubmitted).toBe(false)
    expect(store.currentQuizData.completedAt).toBeUndefined()

    // 点击提交全卷
    await store.submitQuizAnswers()
    expect(store.currentQuizData.isSubmitted).toBe(true)
    expect(store.currentQuizData.completedAt).toBeDefined()
    expect(store.currentQuizData.score).toBe(1)

    // 验证历史成绩单
    const history = await store.loadQuizHistory('book_submit_2')
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].feedbackMode).toBe('submit')
    expect(history[0].score).toBe(1)
  })
})
