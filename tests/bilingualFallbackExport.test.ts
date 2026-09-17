import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { exportBilingualEpub } from '../src/utils/bilingualExporter'

describe('双语 EPUB 导出：免翻墙备用源无缝容灾测试', () => {
  it('当 Google 通道受阻或超时时，自动无缝切换到备用源，确保翻译成功完成', async () => {
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
    zip.file('c1.xhtml', `<html><body><p>Call me Ishmael. Some years ago.</p></body></html>`)
    const epubBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // 模拟 Google GTX 接口超时失败（国内无代理现象），但备用接口 MyMemory 成功返回
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('translate.googleapis.com')) {
        throw new Error('Failed to fetch (Blocked in CN)')
      }
      if (url.includes('api.mymemory.translated.net')) {
        return {
          ok: true,
          json: async () => ({
            responseData: {
              translatedText: '叫我以实玛利。',
            },
          }),
        }
      }
      return { ok: false }
    })

    const result = await exportBilingualEpub(epubBuffer, 'Test Book', 'zh-CN', 'google_free')

    expect(result).not.toBeNull()
    expect(result?.totalSentences).toBeGreaterThan(0)

    const generatedZip = await JSZip.loadAsync(result!.blob)
    const newHtml = await generatedZip.file('c1.xhtml')?.async('string')
    expect(newHtml).toContain('moreader-bilingual-trans')
    expect(newHtml).toContain('叫我以实玛利。')
  })
})
