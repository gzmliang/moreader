import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import localforage from 'localforage'
import { createLogger } from '@/utils/logger'

const log = createLogger('vocabStore')

export interface VocabWord {
  id: string
  bookId: string
  word: string            // The word/phrase
  context: string         // Original sentence/context
  translation: string     // User-added translation
  phonetic?: string       // Phonetic transcription
  reviewCount: number     // Times reviewed
  nextReview: number      // Timestamp for next review
  interval: number        // Days until next review
  ease: number            // Ease factor (SM-2 algorithm)
  createdAt: number
}

// Separate IndexedDB store for vocabulary
const vocabDb = localforage.createInstance({
  name: 'mobi-reader-db',
  storeName: 'vocabulary',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

/**
 * SM-2 Spaced Repetition Algorithm
 * @param word - The vocab word to update
 * @param quality - User rating: 0=forgot, 1=hard, 2=good, 3=easy
 * @returns Updated word with new schedule
 */
const applySM2 = (word: VocabWord, quality: number): VocabWord => {
  const updated = { ...word }

  if (quality < 2) {
    // Forgot or hard - reset
    updated.reviewCount = 0
    updated.interval = 1
  } else {
    if (updated.reviewCount === 0) {
      updated.interval = 1
    } else if (updated.reviewCount === 1) {
      updated.interval = 6
    } else {
      updated.interval = Math.round(updated.interval * updated.ease)
    }
    updated.reviewCount++
  }

  // Update ease factor
  updated.ease = Math.max(1.3, updated.ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)))

  // Set next review date
  updated.nextReview = Date.now() + updated.interval * 24 * 60 * 60 * 1000

  log.debug('SM2 update', { word: updated.word, quality, interval: updated.interval, ease: updated.ease.toFixed(2) })
  return updated
}

export const useVocabStore = defineStore('vocab', () => {
  const words = ref<VocabWord[]>([])
  const currentBookWords = ref<VocabWord[]>([])

  // Load all vocabulary
  const loadVocabulary = async (bookId?: string) => {
    log.trace('loadVocabulary', { bookId })
    try {
      const keys = await vocabDb.keys()
      const all: VocabWord[] = []

      for (const key of keys) {
        const item = await vocabDb.getItem<VocabWord>(key)
        if (item) all.push(item)
      }

      words.value = all.sort((a, b) => b.createdAt - a.createdAt)
      if (bookId) {
        currentBookWords.value = all.filter(w => w.bookId === bookId)
      }
      log.done('loadVocabulary', { total: all.length, book: currentBookWords.value.length })
    } catch (err) {
      log.error('Failed to load vocabulary', err)
    }
  }

  // Add a new word
  const addWord = async (data: {
    bookId: string
    word: string
    context: string
    translation?: string
  }): Promise<string> => {
    log.trace('addWord', { word: data.word })

    // Check for duplicates
    const exists = words.value.find(w =>
      w.bookId === data.bookId && w.word.toLowerCase() === data.word.toLowerCase()
    )
    if (exists) {
      log.info('addWord: duplicate found', { id: exists.id })
      return exists.id
    }

    const id = crypto.randomUUID()
    const item: VocabWord = {
      id,
      bookId: data.bookId,
      word: data.word,
      context: data.context,
      translation: data.translation || '',
      reviewCount: 0,
      nextReview: Date.now(), // Review immediately
      interval: 0,
      ease: 2.5, // SM-2 default ease factor
      createdAt: Date.now(),
    }

    await vocabDb.setItem(id, item)
    words.value.unshift(item)
    currentBookWords.value.unshift(item)

    log.done('addWord', { id, word: item.word })
    return id
  }

  // Update translation
  const updateTranslation = async (id: string, translation: string) => {
    log.trace('updateTranslation', { id })
    const item = words.value.find(w => w.id === id)
    if (item) {
      item.translation = translation
      await vocabDb.setItem(id, item)
    }
  }

  // Review a word (SM-2 algorithm)
  const reviewWord = async (id: string, quality: 0 | 1 | 2 | 3): Promise<VocabWord | null> => {
    log.trace('reviewWord', { id, quality })
    const item = words.value.find(w => w.id === id)
    if (!item) return null

    const updated = applySM2(item, quality)
    Object.assign(item, updated)
    await vocabDb.setItem(id, updated)

    log.done('reviewWord', { word: item.word, nextInterval: item.interval })
    return updated
  }

  // Delete a word
  const deleteWord = async (id: string) => {
    log.trace('deleteWord', { id })
    await vocabDb.removeItem(id)
    words.value = words.value.filter(w => w.id !== id)
    currentBookWords.value = currentBookWords.value.filter(w => w.id !== id)
    log.done('deleteWord', { id })
  }

  // Get words due for review (across all books)
  const getDueWords = (): VocabWord[] => {
    const now = Date.now()
    return words.value.filter(w => w.nextReview <= now)
  }

  // Get words due for review in current book
  const getCurrentBookDueWords = (): VocabWord[] => {
    const now = Date.now()
    return currentBookWords.value.filter(w => w.nextReview <= now)
  }

  // Get study session words (random selection from due words)
  const getStudySession = (count: number = 20): VocabWord[] => {
    const due = getDueWords()
    // Shuffle and take 'count' items
    const shuffled = [...due].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // Get stats
  const getStats = () => {
    const total = words.value.length
    const due = getDueWords().length
    const mastered = words.value.filter(w => w.reviewCount >= 5 && w.interval >= 30).length
    const learning = words.value.filter(w => w.reviewCount > 0 && w.reviewCount < 5).length
    const newWords = words.value.filter(w => w.reviewCount === 0).length

    return { total, due, mastered, learning, newWords }
  }

  return {
    words: computed(() => words.value),
    currentBookWords: computed(() => currentBookWords.value),
    loadVocabulary,
    addWord,
    updateTranslation,
    reviewWord,
    deleteWord,
    getDueWords,
    getCurrentBookDueWords,
    getStudySession,
    getStats,
  }
})
