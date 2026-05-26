import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { highlightDb } from '@/utils/db'
import type { Highlight } from '@/types/book'

export const useHighlightStore = defineStore('highlight', () => {
  const highlights = ref<Highlight[]>([])
  const isLoading = ref(false)

  const loadHighlights = async (bookId?: string) => {
    try {
      isLoading.value = true
      const keys = await highlightDb.keys()
      const list: Highlight[] = []
      for (const key of keys) {
        const hl = await highlightDb.getItem<Highlight>(key)
        if (hl && (!bookId || hl.bookId === bookId)) list.push(hl)
      }
      highlights.value = list.sort((a, b) => b.createdAt - a.createdAt)
    } catch (err) {
      console.error('Failed to load highlights:', err)
    } finally {
      isLoading.value = false
    }
  }

  const forBook = computed(() => (bookId: string) =>
    highlights.value.filter(h => h.bookId === bookId).sort((a, b) => b.createdAt - a.createdAt)
  )

  const add = async (h: Omit<Highlight, 'id' | 'createdAt'>): Promise<Highlight> => {
    const id = crypto.randomUUID()
    const hl: Highlight = { ...h, id, createdAt: Date.now() }
    await highlightDb.setItem(id, hl)
    highlights.value.unshift(hl)
    return hl
  }

  const remove = async (id: string) => {
    await highlightDb.removeItem(id)
    highlights.value = highlights.value.filter(h => h.id !== id)
  }

  return { highlights, isLoading, loadHighlights, forBook, add, remove }
})
