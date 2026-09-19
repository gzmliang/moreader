import * as pdfjsLib from 'pdfjs-dist'
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

export { pdfjsLib }

export interface PdfInfo {
  title: string
  author: string
  pageCount: number
  coverBase64?: string
}

/**
 * 从 ArrayBuffer 提取 PDF 基础元数据及第一页缩略图封面
 */
export async function getPdfMetadataAndCover(arrayBuffer: ArrayBuffer, fileName: string): Promise<PdfInfo> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdfDoc = await loadingTask.promise
  const pageCount = pdfDoc.numPages

  let title = fileName.replace(/\.pdf$/i, '')
  let author = 'Unknown'

  try {
    const meta = await pdfDoc.getMetadata()
    const info = meta?.info as any
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim()) {
      title = info.Title.trim()
    }
    if (info?.Author && typeof info.Author === 'string' && info.Author.trim()) {
      author = info.Author.trim()
    }
  } catch (e) {
    console.warn('Failed to extract PDF metadata:', e)
  }

  let coverBase64: string | undefined
  try {
    const firstPage = await pdfDoc.getPage(1)
    const viewport = firstPage.getViewport({ scale: 0.5 }) // 缩略图
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      await firstPage.render({ canvasContext: ctx, viewport }).promise
      coverBase64 = canvas.toDataURL('image/jpeg', 0.8)
    }
  } catch (e) {
    console.warn('Failed to generate PDF cover preview:', e)
  }

  return { title, author, pageCount, coverBase64 }
}

/**
 * 提取全书所有页面的纯文本
 */
export async function extractAllPageTexts(
  arrayBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const pageTexts: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const textContent = await page.getTextContent()
    const textItems = textContent.items.map((item: any) => item.str || '')
    pageTexts.push(textItems.join(' '))
    onProgress?.(i, numPages)
  }

  return pageTexts
}
