import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import JSZip from 'jszip'
import { inspectEpubChapters, exportBilingualEpub } from '../src/utils/bilingualExporter'

beforeAll(async () => {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(new ProxyAgent('http://192.168.199.158:7890'))
})

describe('按需指定章节导出双语 EPUB 测试', () => {
  const filePath = '/tmp/epub_test/Season_of_the_Sandstorms_Quiz.epub'
  const buffer = fs.readFileSync(filePath)
  const uint8 = new Uint8Array(buffer)

  it('能够成功解析章节清单', async () => {
    const chapters = await inspectEpubChapters(uint8)
    expect(chapters.length).toBe(12)
    console.log('解析到的章节列表前 5 项:', chapters.slice(0, 5))
    expect(chapters[1].href).toContain('ch01.xhtml')
  })

  it('仅选择单章（第 2 节 ch01.xhtml）快速导出双语 EPUB', async () => {
    const result = await exportBilingualEpub(
      uint8,
      'Season of the Sandstorms Quiz',
      'zh-CN',
      'google_free',
      undefined,
      (p) => {
        console.log(`[单章进度 ${p.percent}%] ${p.currentChapter}/${p.totalChapters} - ${p.chapterName}`)
      },
      undefined,
      [1] // 仅勾选索引 1 (ch01.xhtml)
    )

    expect(result).not.toBeNull()
    expect(result?.processedChaptersCount).toBe(1)
    expect(result?.totalSentences).toBeGreaterThan(0)
    console.log('单章导出统计:', {
      processedChapters: result?.processedChaptersCount,
      totalSentences: result?.totalSentences,
    })

    // 验证生成的 EPUB：选中的 ch01 包含双语，未选中的 ch02 保持纯原文
    const outZip = await JSZip.loadAsync(result!.blob)
    const ch01 = await outZip.file('OEBPS/ch01.xhtml')?.async('string')
    const ch02 = await outZip.file('OEBPS/ch02.xhtml')?.async('string')

    expect(ch01).toContain('moreader-bilingual-trans')
    expect(ch02).not.toContain('moreader-bilingual-trans')
  }, 30000)
})
