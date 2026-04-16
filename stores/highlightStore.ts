import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { metadataDb } from '@/utils/db'
import { createLogger } from '@/utils/logger'

const log = createLogger('highlightStore')

// Highlight color options
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'rgba(255, 235, 59, 0.35)', border: '#FDD835', label: 'yellow' },
  { id: 'green', bg: 'rgba(76, 175, 80, 0.35)', border: '#4CAF50', label: 'green' },
  { id: 'blue', bg: 'rgba(33, 150, 243, 0.35)', border: '#2196F3', label: 'blue' },
  { id: 'pink', bg: 'rgba(233, 30, 99, 0.35)', border: '#E91E63', label: 'pink' },
] as const

export interface Highlight {
  id: string
  bookId: string
  cfi: string          // EPUB location
  text: string         // Highlighted text
  color: string        // Color id
  note?: string        // User note
  createdAt: number
}

// Separate IndexedDB store for highlights
import localforage from 'localforage'
const highlightsDb = localforage.createInstance({
  name: 'mobi-reader-db',
  storeName: 'highlights',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

export const useHighlightStore = defineStore('highlight', () => {
  const highlights = ref<Highlight[]>([])
  const currentBookHighlights = ref<Highlight[]>([])

  // Load all highlights for a book
  const loadHighlights = async (bookId: string) => {
    log.trace('loadHighlights', { bookId })
    try {
      const keys = await highlightsDb.keys()
      const all: Highlight[] = []

      for (const key of keys) {
        const item = await highlightsDb.getItem<Highlight>(key)
        if (item) all.push(item)
      }

      highlights.value = all.sort((a, b) => a.createdAt - b.createdAt)
      currentBookHighlights.value = all.filter(h => h.bookId === bookId)
      log.done('loadHighlights', { total: all.length, book: currentBookHighlights.value.length })
    } catch (err) {
      log.error('Failed to load highlights', err)
    }
  }

  // Add a new highlight
  const addHighlight = async (highlight: Omit<Highlight, 'id' | 'createdAt'>): Promise<string> => {
    log.trace('addHighlight', { bookId: highlight.bookId, text: highlight.text.slice(0, 30) })
    const id = crypto.randomUUID()
    const item: Highlight = { ...highlight, id, createdAt: Date.now() }

    await highlightsDb.setItem(id, item)
    highlights.value.push(item)
    currentBookHighlights.value.push(item)

    log.done('addHighlight', { id })
    return id
  }

  // Update highlight note
  const updateHighlightNote = async (id: string, note: string) => {
    log.trace('updateHighlightNote', { id, note: note.slice(0, 30) })
    const item = highlights.value.find(h => h.id === id)
    if (item) {
      item.note = note
      await highlightsDb.setItem(id, item)
    }
  }

  // Delete a highlight
  const deleteHighlight = async (id: string) => {
    log.trace('deleteHighlight', { id })
    await highlightsDb.removeItem(id)
    highlights.value = highlights.value.filter(h => h.id !== id)
    currentBookHighlights.value = currentBookHighlights.value.filter(h => h.id !== id)
    log.done('deleteHighlight', { id })
  }

  // Get highlights by color
  const getHighlightsByColor = (color: string) => {
    return currentBookHighlights.value.filter(h => h.color === color)
  }

  return {
    highlights: computed(() => highlights.value),
    currentBookHighlights: computed(() => currentBookHighlights.value),
    loadHighlights,
    addHighlight,
    updateHighlightNote,
    deleteHighlight,
    getHighlightsByColor,
  }
})
