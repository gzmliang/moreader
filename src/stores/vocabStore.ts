import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { vocabDb } from '@/utils/db'
import type { VocabWord } from '@/types/book'

export const useVocabStore = defineStore('vocab', () => {
  const words = ref<VocabWord[]>([])
  const isLoading = ref(false)

  const loadWords = async (bookId?: string) => {
    try {
      isLoading.value = true
      const keys = await vocabDb.keys()
      const list: VocabWord[] = []
      for (const key of keys) {
        const vw = await vocabDb.getItem<VocabWord>(key)
        if (vw && (!bookId || vw.bookId === bookId)) list.push(vw)
      }
      words.value = list.sort((a, b) => b.createdAt - a.createdAt)
    } catch (err) {
      console.error('Failed to load vocab:', err)
    } finally {
      isLoading.value = false
    }
  }

  const forBook = computed(() => (bookId: string) =>
    words.value.filter(w => w.bookId === bookId).sort((a, b) => b.createdAt - a.createdAt)
  )

  const allWords = computed(() => words.value)

  const add = async (v: Omit<VocabWord, 'id' | 'createdAt'>): Promise<VocabWord> => {
    const id = crypto.randomUUID()
    const vw: VocabWord = { ...v, id, createdAt: Date.now() }
    await vocabDb.setItem(id, vw)
    words.value.unshift(vw)
    return vw
  }

  const remove = async (id: string) => {
    await vocabDb.removeItem(id)
    words.value = words.value.filter(w => w.id !== id)
  }

  const existsByWord = (word: string, bookId: string): boolean => {
    return words.value.some(w => w.word.toLowerCase() === word.toLowerCase() && w.bookId === bookId)
  }

  return { words, isLoading, loadWords, forBook, allWords, add, remove, existsByWord }
})
