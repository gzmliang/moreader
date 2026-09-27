import { describe, it, expect } from 'vitest'
import { repairHyphenation, removePageNumbers, stripCitations, mergeBrokenLines, cleanAndChunkPdfText } from '@/utils/pdfCleaner'

describe('PDF Cleaner Pipeline', () => {
  it('should repair cross-line hyphenations in English', () => {
    const raw = 'This is a funda-\nmental concept of read-\ning.'
    expect(repairHyphenation(raw)).toBe('This is a fundamental concept of reading.')
  })

  it('should remove isolated page numbers', () => {
    const lines = ['First line of text', '12', 'Page 13', '- 14 -', 'Second line of text']
    const cleaned = removePageNumbers(lines)
    expect(cleaned).toEqual(['First line of text', 'Second line of text'])
  })

  it('should strip academic citations', () => {
    const text = 'Recent studies [1] have shown great results [2-4, 7].'
    expect(stripCitations(text)).toBe('Recent studies  have shown great results .')
  })

  it('should merge broken lines in Chinese and English correctly', () => {
    const rawChinese = '这是一个非常精彩的\n中文段落叙述。'
    const paragraphsZh = mergeBrokenLines(rawChinese)
    expect(paragraphsZh).toEqual(['这是一个非常精彩的中文段落叙述。'])

    const rawEn = 'This is a paragraph\nthat was split into two lines.'
    const paragraphsEn = mergeBrokenLines(rawEn)
    expect(paragraphsEn).toEqual(['This is a paragraph that was split into two lines.'])
  })

  it('should chunk chapters properly', () => {
    const pages = [
      'Chapter 1: The Beginning\nIt was a dark and stormy night.\n\nChapter 2: The Journey\nThe road was long and winding.'
    ]
    const chapters = cleanAndChunkPdfText(pages)
    expect(chapters.length).toBe(2)
    expect(chapters[0].title).toBe('Chapter 1: The Beginning')
    expect(chapters[1].title).toBe('Chapter 2: The Journey')
  })
})
