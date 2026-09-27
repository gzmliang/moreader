import JSZip from 'jszip'
import { extractAllPageTexts } from './pdfLoader'
import { cleanAndChunkPdfText, type CleanedChapter } from './pdfCleaner'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 将 PDF 转换为标准沉浸式 EPUB 电子书 Blob
 */
export async function convertPdfToEpubBlob(
  arrayBuffer: ArrayBuffer,
  title: string,
  author: string,
  onProgress?: (step: 'extracting' | 'packaging', current: number, total: number) => void
): Promise<Blob> {
  // 1. 提取全书文本
  const pageTexts = await extractAllPageTexts(arrayBuffer, (curr, total) => {
    onProgress?.('extracting', curr, total)
  })

  // 2. 纯净清洗与按章节分块
  const chapters: CleanedChapter[] = cleanAndChunkPdfText(pageTexts)
  if (chapters.length === 0) {
    chapters.push({
      title: 'Chapter 1',
      content: '<p>Empty content</p>',
      paragraphs: ['Empty content']
    })
  }

  // 3. 使用 JSZip 构建标准 EPUB 2.0 / 3.0 包
  const zip = new JSZip()
  const bookId = `urn:uuid:${crypto.randomUUID()}`
  const safeTitle = escapeXml(title || 'Converted PDF Book')
  const safeAuthor = escapeXml(author || 'Unknown Author')

  // (1) mimetype (必须存储且无压缩)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // (2) META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  // (3) 章节 XHTML 生成
  const manifestItems: string[] = [
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="style" href="style.css" media-type="text/css"/>'
  ]
  const spineItems: string[] = []
  const navPoints: string[] = []

  chapters.forEach((chapter, index) => {
    const chId = `chapter_${index + 1}`
    const fileName = `chapter_${index + 1}.xhtml`
    manifestItems.push(`<item id="${chId}" href="${fileName}" media-type="application/xhtml+xml"/>`)
    spineItems.push(`<itemref idref="${chId}"/>`)

    const navTitle = escapeXml(chapter.title)
    navPoints.push(`
    <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${navTitle}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`)

    const chapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${navTitle}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <h2>${navTitle}</h2>
  ${chapter.content}
</body>
</html>`

    zip.file(`OEBPS/${fileName}`, chapterHtml)
  })

  // (4) 样式表
  const css = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.8;
  padding: 5% 8%;
  color: #333;
}
h2 {
  font-size: 1.4em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 1em;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding-bottom: 0.4em;
}
p {
  margin-bottom: 1.2em;
  text-indent: 2em;
  text-align: justify;
}
`
  zip.file('OEBPS/style.css', css)

  // (5) OEBPS/content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`
  zip.file('OEBPS/content.opf', opf)

  // (6) OEBPS/toc.ncx
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    ${navPoints.join('')}
  </navMap>
</ncx>`
  zip.file('OEBPS/toc.ncx', ncx)

  onProgress?.('packaging', 1, 1)

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}
