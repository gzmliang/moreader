import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { exportBilingualEpub } from '../src/utils/bilingualExporter'

describe('双语 EPUB 导出：网络阻断拦截场景', () => {
  it('当网络完全断开导致翻译全部失败时，必须严密阻断抛错，严禁假装成功', async () => {
    const zip = new JSZip()
    zip.file(
      'META-INF/container.xml',
      `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
      </container>`
    )
    zip.file(
      'content.opf',
      `<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
        <manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>
        <spine><itemref idref="c1"/></spine>
      </package>`
    )
    zip.file('c1.xhtml', `<html><body><p>Hello world. This is test.</p></body></html>`)
    const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // 模拟完全断网抛错
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

    await expect(
      exportBilingualEpub(epubBuffer, 'Test Book', 'zh-CN', 'google_free')
    ).rejects.toThrow('NO_TRANSLATIONS_PRODUCED')
  })
})
