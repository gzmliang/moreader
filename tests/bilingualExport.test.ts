import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { exportBilingualEpub } from '../src/utils/bilingualExporter'

describe('双语 EPUB 导出功能完整性测试', () => {
  it('能够正确解析 EPUB 骨架并注入双语段落', async () => {
    const zip = new JSZip()
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`
    )

    zip.file(
      'OEBPS/content.opf',
      `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Test Book</dc:title>
        </metadata>
        <manifest>
          <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
          <item id="style" href="style.css" media-type="text/css"/>
        </manifest>
        <spine>
          <itemref idref="chapter1"/>
        </spine>
      </package>`
    )

    zip.file(
      'OEBPS/chapter1.xhtml',
      `<?xml version="1.0" encoding="utf-8"?>
      <!DOCTYPE html>
      <html xmlns="http://www.idpf.org/1999/xhtml">
        <head><title>Chapter 1</title></head>
        <body>
          <h1>Chapter 1</h1>
          <p>This is the first sentence. This is the second sentence.</p>
        </body>
      </html>`
    )

    zip.file('OEBPS/style.css', 'body { font-size: 16px; }')

    const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // 模拟 Google 翻译返回
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [
          { orig: 'Chapter 1\n', trans: '第一章\n' },
          { orig: 'This is the first sentence.\n', trans: '这是第一句话。\n' },
          { orig: 'This is the second sentence.', trans: '这是第二句话。' },
        ],
      }),
    })
    globalThis.fetch = fakeFetch as any

    const result = await exportBilingualEpub(epubBuffer, 'Test Book', 'zh-CN', 'google_free')

    expect(result).not.toBeNull()
    expect(result?.totalChapters).toBe(1)
    expect(result?.totalSentences).toBeGreaterThan(0)
    console.log('Result totalSentences:', result?.totalSentences)

    // 解开生成的 EPUB 检验
    const generatedZip = await JSZip.loadAsync(result!.blob)
    const newChapter = await generatedZip.file('OEBPS/chapter1.xhtml')?.async('string')
    console.log('Generated chapter content:', newChapter)
    expect(newChapter).toContain('moreader-bilingual-trans')
    expect(newChapter).toContain('这是第一句话。')
  })
})
