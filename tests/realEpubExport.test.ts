import { describe, it, expect } from 'vitest'
import fs from 'fs'
import JSZip from 'jszip'
import { exportBilingualEpub } from '../src/utils/bilingualExporter'

describe('真实 EPUB 双语书生成端到端测试', () => {
  it('测试 Season_of_the_Sandstorms_Quiz.epub 真实生成双语 EPUB', async () => {
    const filePath = '/tmp/epub_test/Season_of_the_Sandstorms_Quiz.epub'
    const buffer = fs.readFileSync(filePath)
    const uint8 = new Uint8Array(buffer)

    console.log('开始真实导出测试，文件大小:', uint8.byteLength)

    const result = await exportBilingualEpub(
      uint8 as any,
      'Season of the Sandstorms Quiz',
      'zh-CN',
      'google_free',
      undefined,
      (p) => {
        console.log(`[进度 ${p.percent}%] 第 ${p.currentChapter}/${p.totalChapters} 章: ${p.chapterName} ${p.statusMessage || ''}`)
      }
    )

    expect(result).not.toBeNull()
    console.log('生成结果统计:', {
      totalChapters: result?.totalChapters,
      totalSentences: result?.totalSentences,
      blobSize: result?.blob.size
    })

    expect(result?.totalSentences).toBeGreaterThan(0)

    // 保存生成的双语 EPUB 到 /tmp/epub_test/ 下进行检验
    const outBlob = result!.blob
    const outBuffer = Buffer.from(await outBlob.arrayBuffer())
    fs.writeFileSync('/tmp/epub_test/Season_of_the_Sandstorms_Quiz_Bilingual.epub', outBuffer)
    console.log('已将生成的双语 EPUB 写入 /tmp/epub_test/Season_of_the_Sandstorms_Quiz_Bilingual.epub')

    // 解包检验内容
    const outZip = await JSZip.loadAsync(outBuffer)
    const ch1 = await outZip.file('OEBPS/ch01.xhtml')?.async('string')
    console.log('生成的第 1 章内容片段:')
    console.log(ch1?.slice(0, 1500))
    expect(ch1).toContain('moreader-bilingual-trans')
  }, 60000)
})
