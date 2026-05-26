import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { bookmarkDb } from '@/utils/db'
import type { Bookmark } from '@/types/book'

export const useBookmarkStore = defineStore('bookmark', () => {
  const bookmarks = ref<Bookmark[]>([])
  const isLoading = ref(false)

  const loadBookmarks = async (bookId?: string) => {
    try {
      isLoading.value = true
      const keys = await bookmarkDb.keys()
      const list: Bookmark[] = []
      for (const key of keys) {
        const bm = await bookmarkDb.getItem<Bookmark>(key)
        if (bm && (!bookId || bm.bookId === bookId)) list.push(bm)
      }
      bookmarks.value = list.sort((a, b) => b.createdAt - a.createdAt)
    } catch (err) {
      console.error('Failed to load bookmarks:', err)
    } finally {
      isLoading.value = false
    }
  }

  const forBook = computed(() => (bookId: string) =>
    bookmarks.value.filter(b => b.bookId === bookId).sort((a, b) => b.createdAt - a.createdAt)
  )

  const add = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark> => {
    const id = crypto.randomUUID()
    const bm: Bookmark = { ...bookmark, id, createdAt: Date.now() }
    await bookmarkDb.setItem(id, bm)
    bookmarks.value.unshift(bm)
    return bm
  }

  const remove = async (id: string) => {
    await bookmarkDb.removeItem(id)
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
  }

  const exists = (cfi: string, bookId: string): boolean => {
    return bookmarks.value.some(b => b.cfi === cfi && b.bookId === bookId)
  }

  return { bookmarks, isLoading, loadBookmarks, forBook, add, remove, exists }
})
