export type BlinkistRatio = number // 自由输入百分比数字，如 20, 30, 50 等
export type BlinkistLevel = 'easy' | 'standard' | 'advanced'
export type SummaryLanguageMode = 'bilingual' | 'original' | 'target'
export type QuizCount = 3 | 5 | 10
export type QuizScope = 'chapter' | 'book'
export type QuizLevel = 'detail' | 'infer'
export type QuizFeedbackMode = 'instant' | 'submit' // 即时闯关 vs 完卷提交

export interface CharacterRelationNode {
  name: string
  role?: string
  faction?: string // 所属阵营/家族，如 Stark / Lannister
}

export interface CharacterRelationEdge {
  from: string
  to: string
  relation: string // 关系：盟友 / 死敌 / 师徒 / 父子 / 恋人
}

export interface CharacterPlotMap {
  summary: string
  nodes: CharacterRelationNode[]
  edges: CharacterRelationEdge[]
  timeline: Array<{ stage: string; event: string }>
  fullMarkdown: string
  langMode?: SummaryLanguageMode
  createdAt: number
}

export interface BlinkistBook {
  oneLiner: string
  keyIdeas: Array<{ title: string; content: string }>
  takeaway: string
  fullMarkdown: string
  ratio: BlinkistRatio
  level: BlinkistLevel
  langMode?: SummaryLanguageMode
  sourceLang?: string
  targetLang?: string
  createdAt: number
}

export interface ChapterSummaryData {
  bookId: string
  chapterHref: string
  chapterTitle: string
  scope: QuizScope
  summaryBullets?: string[]
  blinkist?: BlinkistBook
  characterMap?: CharacterPlotMap
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
  explanation: string // 名师深度解析
  userAnswer?: 'A' | 'B' | 'C' | 'D' // 用户的点击作答
}

export interface QuizHistoryRecord {
  id: string
  bookId: string
  bookTitle?: string
  chapterHref: string
  chapterTitle: string
  scope: QuizScope
  count: number
  level: QuizLevel
  feedbackMode: QuizFeedbackMode
  score: number
  total: number
  percent: number
  timestamp: number
  questions: QuizQuestion[]
}

export interface ChapterQuizData {
  bookId: string
  chapterHref: string
  chapterTitle: string
  scope: QuizScope
  count: QuizCount
  level: QuizLevel
  feedbackMode: QuizFeedbackMode
  isSubmitted?: boolean // 完卷模式下是否已点击提交揭晓
  questions: QuizQuestion[]
  score?: number // 答对题数
  completedAt?: number
  updatedAt: number
}
