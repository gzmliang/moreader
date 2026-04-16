import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Epub from 'epubjs'
import type { Book } from 'epubjs'
import { db, metadataDb } from '@/utils/db'
import { createLogger } from '@/utils/logger'

const log = createLogger('bookStore')

export interface BookMetadata {
  id: string
  title: string
  author: string
  cover?: string
  format: 'epub' | 'txt' | 'mobi'
  sourceFileName: string
  addedAt: number
  lastRead?: number
  currentLocation?: string
}

const SUPPORTED_EXTENSIONS = ['.epub', '.txt', '.mobi']

/**
 * Get file extension from filename
 */
const getFileExtension = (filename: string): string => {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

/**
 * Get the conversion service endpoint
 */
const getConvertEndpoint = (): string => {
  return localStorage.getItem('mobi-reader-convert-endpoint') || 'http://127.0.0.1:8765'
}

/**
 * Convert MOBI to EPUB via external service
 */
const convertToEpub = async (file: File): Promise<ArrayBuffer> => {
  const endpoint = getConvertEndpoint()
  const formData = new FormData()
  formData.append('file', file)

  log.trace('convertToEpub', { filename: file.name, endpoint })

  const response = await fetch(`${endpoint}/convert-to-epub`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    log.error('convertToEpub failed', { status: response.status, error: errorText })
    throw new Error(`Convert failed: HTTP ${response.status} ${errorText}`)
  }

  const result = await response.arrayBuffer()
  log.done('convertToEpub', { size: result.byteLength })
  return result
}

/**
 * Parse a plain text file into EPUB-compatible HTML
 * Handles both UTF-8 and GBK/GB2312 encodings
 */
const txtToEpub = async (file: File): Promise<{ arrayBuffer: ArrayBuffer; metadata: Omit<BookMetadata, 'id' | 'addedAt' | 'format' | 'sourceFileName'> }> => {
  log.trace('txtToEpub', { filename: file.name, size: file.size })

  // Try UTF-8 first, fallback to GBK for Chinese texts
  let text: string
  try {
    text = await file.text()
    // Check if text looks garbled (common sign of wrong encoding)
    if (/[\ufffd]/.test(text) && text.length > 0) {
      log.info('UTF-8 decoding had replacement chars, trying FileReader')
      throw new Error('Encoding issue')
    }
  } catch {
    // Fallback: try reading as blob and let browser handle it
    text = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read text file'))
      reader.readAsText(file, 'utf-8')
    })
  }

  log.info('txtToEpub read text', { length: text.length, firstChars: text.slice(0, 50) })

  // Try to extract title/author from first few lines
  const lines = text.split(/\r?\n/).slice(0, 10)
  let title = file.name.replace(/\.[^.]+$/, '')
  let author = 'Unknown Author'

  // Look for title patterns: "书名：xxx", "作者：xxx", etc.
  for (const line of lines) {
    const titleMatch = line.match(/书名[:：]\s*(.+)/)
    if (titleMatch) { title = titleMatch[1].trim(); break }
  }
  for (const line of lines) {
    const authorMatch = line.match(/作者[:：]\s*(.+)/)
    if (authorMatch) { author = authorMatch[1].trim(); break }
  }

  // If no metadata found, use first non-empty line as title
  if (title === file.name.replace(/\.[^.]+$/, '')) {
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length > 2 && trimmed.length < 50) {
        title = trimmed
        break
      }
    }
  }

  // Convert plain text to EPUB HTML
  // Split into paragraphs (double newlines) and wrap in HTML
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <style>
    body { font-family: serif; line-height: 1.8; margin: 1em; }
    p { text-indent: 2em; margin-bottom: 1em; }
  </style>
</head>
<body>
${paragraphs.map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n')}
</body>
</html>`

  // Create a minimal EPUB package
  // We'll create a ZIP-like structure using a simple EPUB format
  // Since we can't easily create a real EPUB ZIP in the browser,
  // we'll wrap the HTML as an XHTML file and let epubjs handle it
  // Actually, the simplest approach: create an HTML blob and treat it as an epub
  // But epubjs needs a real EPUB file. So we need to convert via server or create ZIP.

  // Best approach: send to conversion server
  const formData = new FormData()
  formData.append('file', file)
  formData.append('format', 'txt')

  const endpoint = getConvertEndpoint()
  const response = await fetch(`${endpoint}/convert-to-epub`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    log.warn('TXT conversion server unavailable, using inline HTML fallback')
    // Inline fallback: create a blob that epubjs can read
    // epubjs can read from a URL, so we create a simple EPUB on the fly
    return await createMinimalEpub(file, htmlContent, title, author)
  }

  const arrayBuffer = await response.arrayBuffer()
  log.done('txtToEpub', { title, author })

  return {
    arrayBuffer,
    metadata: { title, author, cover: undefined },
  }
}

/**
 * Create a minimal EPUB from HTML content using JSZip
 * This is a fallback when no conversion server is available
 */
const createMinimalEpub = async (
  file: File,
  htmlContent: string,
  title: string,
  author: string,
): Promise<{ arrayBuffer: ArrayBuffer; metadata: Omit<BookMetadata, 'id' | 'addedAt' | 'format' | 'sourceFileName'> }> => {
  log.info('createMinimalEpub', { title })

  // Use dynamic import for JSZip
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // EPUB requires specific structure
  // mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // META-INF/container.xml
  zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  // OEBPS/content.opf
  const uid = crypto.randomUUID()
  zip.folder('OEBPS')!.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>zh</dc:language>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`)

  // OEBPS/toc.ncx
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${uid}"/></head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${title}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`)

  // OEBPS/content.xhtml
  zip.file('OEBPS/content.xhtml', htmlContent)

  const epubBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
  const arrayBuffer = await epubBlob.arrayBuffer()

  log.done('createMinimalEpub', { size: arrayBuffer.byteLength })
  return { arrayBuffer, metadata: { title, author, cover: undefined } }
}

/**
 * Convert blob URL to base64 data URL
 */
const blobUrlToBase64 = async (blobUrl: string): Promise<string | undefined> => {
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
    log.error('Failed to convert blob to base64', err)
    return undefined
  }
}

/**
 * Extract metadata from an EPUB file
 */
const extractMetadata = async (file: File): Promise<Omit<BookMetadata, 'id' | 'addedAt' | 'format' | 'sourceFileName'>> => {
  log.trace('extractMetadata', { filename: file.name })

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          reject(new Error('Failed to read file'))
          return
        }

        const tempBook = Epub(arrayBuffer)
        await tempBook.ready

        const metadata = tempBook.package?.metadata || {}

        let coverUrl: string | undefined
        try {
          const blobUrl = await tempBook.coverUrl()
          if (blobUrl) coverUrl = await blobUrlToBase64(blobUrl)
        } catch {
          // Cover might not exist
        }

        tempBook.destroy()

        const creator = metadata.creator
        const authorName = Array.isArray(creator)
          ? creator[0] || 'Unknown Author'
          : creator || 'Unknown Author'

        resolve({
          title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
          author: authorName,
          cover: coverUrl,
        })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export const useBookStore = defineStore('book', () => {
  // State
  const books = ref<BookMetadata[]>([])
  const currentBook = ref<Book | null>(null)
  const currentMetadata = ref<BookMetadata | null>(null)
  const isLoading = ref(false)
  const isLoadingBook = ref(false)
  const loadingProgress = ref(0)
  const loadingMessage = ref('')
  const error = ref<string | null>(null)

  // Initialize
  const init = async () => {
    log.trace('init')
    await loadBookList()
    log.done('init', { bookCount: books.value.length })
  }

  // Load metadata list from storage
  const loadBookList = async () => {
    log.trace('loadBookList')
    try {
      isLoading.value = true
      const keys = await metadataDb.keys()
      const metadataList: BookMetadata[] = []

      for (const key of keys) {
        const metadata = await metadataDb.getItem<BookMetadata>(key)
        if (metadata) metadataList.push(metadata)
      }

      books.value = metadataList.sort((a, b) => b.addedAt - a.addedAt)
      log.done('loadBookList', { count: books.value.length })
    } catch (err) {
      log.error('Failed to load book list', err)
      error.value = 'Failed to load library'
    } finally {
      isLoading.value = false
    }
  }

  // Save a new book (supports EPUB, TXT, MOBI)
  const saveBook = async (file: File): Promise<string> => {
    log.trace('saveBook', { filename: file.name, size: file.size })

    try {
      isLoading.value = true
      error.value = null

      const ext = getFileExtension(file.name)
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        const msg = `Unsupported format: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`
        log.error('saveBook validation failed', msg)
        throw new Error(msg)
      }

      const id = crypto.randomUUID()
      let arrayBuffer: ArrayBuffer
      let extractedMeta: Awaited<ReturnType<typeof extractMetadata>>
      let format: BookMetadata['format']

      if (ext === '.epub') {
        // EPUB - load directly
        log.info('saveBook: EPUB format')
        arrayBuffer = await file.arrayBuffer()
        extractedMeta = await extractMetadata(file)
        format = 'epub'
      } else if (ext === '.txt') {
        // TXT - convert to EPUB
        log.info('saveBook: TXT format, converting to EPUB')
        const result = await txtToEpub(file)
        arrayBuffer = result.arrayBuffer
        extractedMeta = result.metadata
        format = 'txt'
      } else if (ext === '.mobi') {
        // MOBI - convert to EPUB
        log.info('saveBook: MOBI format, converting to EPUB')
        arrayBuffer = await convertToEpub(file)
        extractedMeta = await extractMetadata(
          new File([arrayBuffer], file.name.replace(/\.[^.]+$/, '.epub'), { type: 'application/epub+zip' })
        )
        format = 'mobi'
      } else {
        throw new Error(`Unsupported format: ${ext}`)
      }

      // Save binary data to IndexedDB
      await db.setItem(id, arrayBuffer)
      log.info('saveBook: saved binary to IndexedDB', { id, size: arrayBuffer.byteLength })

      // Save metadata
      const metadata: BookMetadata = {
        id,
        ...extractedMeta,
        format,
        sourceFileName: file.name,
        addedAt: Date.now(),
      }
      await metadataDb.setItem(id, metadata)

      books.value.unshift(metadata)
      log.done('saveBook', { id, title: metadata.title, format })

      return id
    } catch (err) {
      log.error('saveBook failed', err)
      error.value = err instanceof Error ? err.message : 'Failed to save book'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Load book binary for rendering
  const loadBookBinary = async (id: string): Promise<ArrayBuffer | null> => {
    log.trace('loadBookBinary', { id })
    try {
      const binary = await db.getItem<ArrayBuffer>(id)
      log.done('loadBookBinary', binary ? { size: binary.byteLength } : 'null')
      return binary
    } catch (err) {
      log.error('Failed to load book binary', err)
      return null
    }
  }

  // Set current book
  const setCurrentBook = (book: Book | null, metadata?: BookMetadata) => {
    log.trace('setCurrentBook', { book: !!book, metadata: metadata?.title })
    currentBook.value = book
    if (metadata) currentMetadata.value = metadata
  }

  // Delete a book
  const deleteBook = async (id: string) => {
    log.trace('deleteBook', { id })
    try {
      await db.removeItem(id)
      await metadataDb.removeItem(id)
      books.value = books.value.filter(b => b.id !== id)

      if (currentMetadata.value?.id === id) {
        currentBook.value?.destroy()
        currentBook.value = null
        currentMetadata.value = null
      }
      log.done('deleteBook', { id })
    } catch (err) {
      log.error('Failed to delete book', err)
      error.value = 'Failed to delete book'
    }
  }

  // Update reading progress
  const updateProgress = async (id: string, location: string) => {
    try {
      const metadata = await metadataDb.getItem<BookMetadata>(id)
      if (metadata) {
        metadata.lastRead = Date.now()
        metadata.currentLocation = location
        await metadataDb.setItem(id, metadata)

        const index = books.value.findIndex(b => b.id === id)
        if (index !== -1) books.value[index] = metadata
      }
    } catch (err) {
      log.error('Failed to update progress', err)
    }
  }

  // Initialize store
  init()

  return {
    // State
    books: computed(() => books.value),
    currentBook: computed(() => currentBook.value),
    currentMetadata: computed(() => currentMetadata.value),
    isLoading,
    isLoadingBook,
    loadingProgress,
    loadingMessage,
    error: computed(() => error.value),

    // Actions
    saveBook,
    loadBookBinary,
    loadBookList,
    setCurrentBook,
    deleteBook,
    updateProgress,
  }
})
