import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Epub from 'epubjs'
import type { Book } from 'epubjs'
import { db, metadataDb } from '@/utils/db'
import type { BookMetadata } from '@/types/book'

export const useBookStore = defineStore('book', () => {
  const books = ref<BookMetadata[]>([])
  const currentBook = ref<Book | null>(null)
  const currentMetadata = ref<BookMetadata | null>(null)
  const isLoading = ref(false)
  const isLoadingBook = ref(false)
  const loadingProgress = ref(0)
  const loadingMessage = ref('')
  const error = ref<string | null>(null)

  const blobToBase64 = async (blobUrl: string): Promise<string | undefined> => {
    try {
      const response = await fetch(blobUrl)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      console.error('Failed to convert blob to base64:', err)
      return undefined
    }
  }

  const extractMetadata = async (file: File): Promise<Omit<BookMetadata, 'id' | 'addedAt'>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          if (!arrayBuffer) { reject(new Error('Failed to read file')); return }
          const tempBook = Epub(arrayBuffer)
          await tempBook.ready
          const metadata = tempBook.package?.metadata || {}
          let coverUrl: string | undefined
          try {
            const blobUrl = await tempBook.coverUrl()
            if (blobUrl) coverUrl = await blobToBase64(blobUrl)
          } catch {}
          tempBook.destroy()
          const author = Array.isArray(metadata.creator) ? (metadata.creator[0] || 'Unknown Author') : (metadata.creator || 'Unknown Author')
          resolve({ title: metadata.title || file.name.replace(/\.epub$/i, ''), author, cover: coverUrl })
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const loadBookList = async () => {
    try {
      isLoading.value = true
      const keys = await metadataDb.keys()
      const list: BookMetadata[] = []
      for (const key of keys) {
        const m = await metadataDb.getItem<BookMetadata>(key)
        if (m) list.push(m)
      }
      books.value = list.sort((a, b) => (b.lastRead || b.addedAt) - (a.lastRead || a.addedAt))
    } catch (err) {
      console.error('Failed to load book list:', err)
      error.value = 'Failed to load library'
    } finally {
      isLoading.value = false
    }
  }

  const saveBook = async (file: File): Promise<string> => {
    if (!file.name.toLowerCase().endsWith('.epub')) throw new Error('Only .epub files are supported')
    const id = crypto.randomUUID()
    const extracted = await extractMetadata(file)
    const arrayBuffer = await file.arrayBuffer()
    await db.setItem(id, arrayBuffer)
    const metadata: BookMetadata = { id, ...extracted, addedAt: Date.now() }
    await metadataDb.setItem(id, metadata)
    books.value.unshift(metadata)
    return id
  }

  const saveBooks = async (files: File[], onProgress?: (current: number, total: number) => void): Promise<{ success: number; failed: number }> => {
    let success = 0
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      try {
        await saveBook(files[i])
        success++
      } catch (err) {
        console.error(`Failed to import ${files[i].name}:`, err)
        failed++
      }
      onProgress?.(i + 1, files.length)
    }
    books.value.sort((a, b) => (b.lastRead || b.addedAt) - (a.lastRead || a.addedAt))
    return { success, failed }
  }

  const loadBookBinary = async (id: string): Promise<ArrayBuffer | null> => {
    try { return await db.getItem<ArrayBuffer>(id) }
    catch (err) { console.error('Failed to load book binary:', err); return null }
  }

  const setCurrentBook = (book: Book | null, metadata?: BookMetadata) => {
    currentBook.value = book
    if (metadata) currentMetadata.value = metadata
  }

  const deleteBook = async (id: string) => {
    await db.removeItem(id)
    await metadataDb.removeItem(id)
    books.value = books.value.filter(b => b.id !== id)
    if (currentMetadata.value?.id === id) {
      currentBook.value?.destroy()
      currentBook.value = null
      currentMetadata.value = null
    }
  }

  const updateProgress = async (id: string, location: string) => {
    try {
      const metadata = await metadataDb.getItem<BookMetadata>(id)
      if (metadata) {
        metadata.lastRead = Date.now()
        metadata.currentLocation = location
        await metadataDb.setItem(id, metadata)
        const index = books.value.findIndex(b => b.id === id)
        if (index !== -1) books.value[index] = { ...metadata }
      }
    } catch (err) { console.error('Failed to update progress:', err) }
  }

  loadBookList()

  return {
    books: computed(() => books.value),
    currentBook: computed(() => currentBook.value),
    currentMetadata: computed(() => currentMetadata.value),
    isLoading, isLoadingBook, loadingProgress, loadingMessage,
    error: computed(() => error.value),
    saveBook, saveBooks, loadBookBinary, loadBookList, setCurrentBook, deleteBook, updateProgress,
  }
})
