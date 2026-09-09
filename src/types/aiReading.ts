export type BlinkistRatio = '20' | '50' | '70'
export type BlinkistLevel = 'easy' | 'standard' | 'advanced'
export type QuizCount = 3 | 5 | 10
export type QuizScope = 'chapter' | 'book'
export type QuizLevel = 'detail' | 'infer'

export interface BlinkistBook {
  oneLiner: string
  keyIdeas: Array<{ title: string; content: string }>
  takeaway: string
  fullMarkdown: string
  ratio: BlinkistRatio
  level: BlinkistLevel
  createdAt: number
}

export interface ChapterSummaryData {
  bookId: string
  chapterHref: string
  chapterTitle: string
  summaryBullets?: string[]
  blinkist?: BlinkistBook
  updatedAt: number
}

export interface QuizOption {
  key: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string // 中文名师深度解析
  userAnswer?: 'A' | 'B' | 'C' | 'D' // 用户的点击作答
}

export interface ChapterQuizData {
  bookId: string
  chapterHref: string
  chapterTitle: string
  scope: QuizScope
  count: QuizCount
  level: QuizLevel
  questions: QuizQuestion[]
  score?: number // 答对题数
  completedAt?: number
  updatedAt: number
}
