import { describe, it, expect } from 'vitest'
import { repairHyphenation, stripCitations, mergeBrokenLines, cleanAndChunkPdfText } from '@/utils/pdfCleaner'

describe('PDF to Reflowable Flow Book Processing', () => {
  it('should clean complex multi-line text and strip headers and citations', () => {
    const rawPages = [
      `1
Chapter 1: The Quantum Realm
This is a funda-
mental theory of mod-
ern physics [1, 2].

It was widely dis-
cussed by researchers [3].
Page 2
Chapter 2: Future Applications
The potential is bound-
less for com-
puting [4-6].
`
    ]

    const chapters = cleanAndChunkPdfText(rawPages)
    expect(chapters.length).toBe(2)
    expect(chapters[0].title).toBe('Chapter 1: The Quantum Realm')
    expect(chapters[0].paragraphs[0]).toContain('fundamental theory of modern physics')
    expect(chapters[0].paragraphs[0]).not.toContain('[1, 2]')
    expect(chapters[0].paragraphs[1]).toContain('widely discussed by researchers')

    expect(chapters[1].title).toBe('Chapter 2: Future Applications')
    expect(chapters[1].paragraphs[0]).toContain('boundless for computing')
    expect(chapters[1].paragraphs[0]).not.toContain('[4-6]')
  })
})
