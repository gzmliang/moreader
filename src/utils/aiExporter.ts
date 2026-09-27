import JSZip from 'jszip'
import { marked } from 'marked'
import type { QuizQuestion } from '@/types/aiReading'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeForXml(html: string): string {
  return html
    .replace(/<br\s*>/gi, '<br/>')
    .replace(/<hr\s*>/gi, '<hr/>')
    .replace(/<img\s+([^>]*[^\/])>/gi, '<img $1/>')
    .replace(/<input\s+([^>]*[^\/])>/gi, '<input $1/>')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveEpubToBookshelf(
  blob: Blob,
  filename: string,
  bookStore: any
): Promise<string> {
  const safeFilename = filename.toLowerCase().endsWith('.epub') ? filename : `${filename}.epub`
  const file = new File([blob], safeFilename, { type: 'application/epub+zip' })
  return await bookStore.saveBook(file)
}

/**
 * 导出精读简写本为标准 EPUB 电子书
 */
export async function exportSummaryToEpub(options: {
  bookTitle: string
  chapterTitle: string
  markdownContent: string
}): Promise<Blob> {
  const zip = new JSZip()
  const bookId = `urn:uuid:${crypto.randomUUID()}`
  const docTitle = `${options.chapterTitle || 'Summary'} - ${options.bookTitle}`
  const renderedBody = sanitizeForXml(marked.parse(options.markdownContent) as string)

  // 1. mimetype (STORE)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  // 3. OEBPS/content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(docTitle)}</dc:title>
    <dc:creator>MoRead AI Companion</dc:creator>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`
  zip.file('OEBPS/content.opf', opf)

  // 4. OEBPS/toc.ncx (EPUB 2 backward compatibility)
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookId}"/></head>
  <docTitle><text>${escapeHtml(docTitle)}</text></docTitle>
  <navMap>
    <navPoint id="nav1" playOrder="1">
      <navLabel><text>${escapeHtml(options.chapterTitle || 'Summary')}</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  zip.file('OEBPS/toc.ncx', ncx)

  // 5. OEBPS/toc.xhtml (EPUB 3 NAV)
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="chapter1.xhtml">${escapeHtml(options.chapterTitle || 'Summary')}</a></li>
    </ol>
  </nav>
</body>
</html>`
  zip.file('OEBPS/toc.xhtml', nav)

  // 6. OEBPS/style.css
  const css = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif;
  line-height: 1.7;
  padding: 5% 7%;
  color: #1a1a1a;
}
h1 { font-size: 1.6em; margin-bottom: 0.4em; border-bottom: 2px solid #3b82f6; padding-bottom: 0.3em; }
h2 { font-size: 1.3em; margin: 1em 0 0.4em; }
h3 { font-size: 1.15em; margin: 0.8em 0 0.3em; }
p { margin: 0.6em 0; text-align: justify; }
blockquote {
  border-left: 3px solid #3b82f6;
  padding: 8px 14px;
  margin: 1em 0;
  background: #f0f7ff;
  border-radius: 0 6px 6px 0;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.2em 0;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: left;
  font-size: 0.92em;
}
th {
  background: #f5f5f5;
  font-weight: 600;
}
tr:nth-child(even) td {
  background: #fafafa;
}
ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
li { margin: 0.25em 0; }
code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
pre { background: #f3f4f6; padding: 10px; border-radius: 6px; overflow-x: auto; }
`
  zip.file('OEBPS/style.css', css)

  // 7. OEBPS/chapter1.xhtml
  const chapter1 = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeHtml(options.chapterTitle || 'Summary')}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeHtml(options.chapterTitle || 'Summary')}</h1>
  <p style="color: #666; font-size: 0.9em; margin-bottom: 1.5em;">📖 ${escapeHtml(options.bookTitle)} · Generated by MoRead AI</p>
  <div class="content">
    ${renderedBody}
  </div>
</body>
</html>`
  zip.file('OEBPS/chapter1.xhtml', chapter1)

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}

/**
 * 导出小聪自测题为标准 EPUB 电子书（支持空白卷与全解卷）
 */
export async function exportQuizToEpub(options: {
  bookTitle: string
  chapterTitle: string
  questions: QuizQuestion[]
  withAnswers: boolean
}): Promise<Blob> {
  const zip = new JSZip()
  const bookId = `urn:uuid:${crypto.randomUUID()}`
  const docTitle = `${options.withAnswers ? 'Quiz Solutions' : 'Quiz Practice'} - ${options.chapterTitle || options.bookTitle}`

  // 构建题目 HTML
  let quizBodyHtml = ''
  options.questions.forEach((q, idx) => {
    quizBodyHtml += `<div class="quiz-block">`
    quizBodyHtml += `<div class="quiz-question"><strong>Q${idx + 1}. ${escapeHtml(q.question)}</strong></div>`
    quizBodyHtml += `<div class="quiz-options">`
    q.options.forEach((opt) => {
      quizBodyHtml += `<div class="quiz-opt"><span class="opt-key">${opt.key}.</span> ${escapeHtml(opt.text)}</div>`
    })
    quizBodyHtml += `</div>`

    if (options.withAnswers) {
      quizBodyHtml += `<div class="quiz-answer-box">`
      quizBodyHtml += `<div class="ans-badge">✓ Standard Answer: <strong>${q.answer}</strong></div>`
      if (q.explanation) {
        quizBodyHtml += `<div class="ans-exp"><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</div>`
      }
      quizBodyHtml += `</div>`
    } else {
      quizBodyHtml += `<div class="quiz-blank-answer">My Answer: [ ____ ]</div>`
    }
    quizBodyHtml += `</div>`
  })

  // 1. mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  // 3. content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(docTitle)}</dc:title>
    <dc:creator>MoRead AI Quiz</dc:creator>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`
  zip.file('OEBPS/content.opf', opf)

  // 4. toc.ncx
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookId}"/></head>
  <docTitle><text>${escapeHtml(docTitle)}</text></docTitle>
  <navMap>
    <navPoint id="nav1" playOrder="1">
      <navLabel><text>${escapeHtml(docTitle)}</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  zip.file('OEBPS/toc.ncx', ncx)

  // 5. toc.xhtml
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <h1>${escapeHtml(docTitle)}</h1>
    <ol><li><a href="chapter1.xhtml">${escapeHtml(docTitle)}</a></li></ol>
  </nav>
</body>
</html>`
  zip.file('OEBPS/toc.xhtml', nav)

  // 6. style.css
  const css = `
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 5% 7%; color: #1a1a1a; }
h1 { font-size: 1.5em; border-bottom: 2px solid #4f46e5; padding-bottom: 0.3em; margin-bottom: 0.4em; }
.quiz-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 16px 0; background: #fafafa; }
.quiz-question { font-size: 1.05em; margin-bottom: 8px; color: #111; }
.quiz-opt { padding: 4px 8px; margin: 4px 0; font-size: 0.95em; }
.opt-key { font-weight: 600; color: #4f46e5; margin-right: 4px; }
.quiz-answer-box { margin-top: 10px; padding: 10px; border-radius: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 0.9em; }
.ans-badge { color: #15803d; font-weight: 600; margin-bottom: 4px; }
.ans-exp { color: #374151; font-size: 0.88em; line-height: 1.5; }
.quiz-blank-answer { margin-top: 10px; font-size: 0.9em; color: #6b7280; border-top: 1px dashed #d1d5db; padding-top: 6px; }
`
  zip.file('OEBPS/style.css', css)

  // 7. chapter1.xhtml
  const chapter1 = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeHtml(docTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeHtml(docTitle)}</h1>
  <p style="color: #666; font-size: 0.9em; margin-bottom: 1.5em;">📖 ${escapeHtml(options.bookTitle)} · ${options.questions.length} Questions</p>
  ${quizBodyHtml}
</body>
</html>`
  zip.file('OEBPS/chapter1.xhtml', chapter1)

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}

/**
 * 墨笺风格 PDF 纯净打印排版引擎
 */
export function exportToPdfViaPrint(options: {
  title: string
  subtitle?: string
  htmlContent: string
}) {
  const printWindow = window.open('', '_blank', 'width=840,height=900')
  if (!printWindow) {
    alert('Please allow popups to export PDF')
    return
  }

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.title)}</title>
  <style>
    @media print {
      @page { margin: 1.2cm; size: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
      .no-print { display: none !important; }
      .page-break-avoid { page-break-inside: avoid; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #111;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #555;
    }
    h1 { font-size: 18px; margin: 18px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; page-break-after: avoid; }
    h2 { font-size: 15px; margin: 16px 0 6px; page-break-after: avoid; }
    h3 { font-size: 13.5px; margin: 12px 0 4px; page-break-after: avoid; }
    p { margin: 6px 0; }
    blockquote {
      border-left: 3.5px solid #3b82f6;
      background: #f0f7ff;
      padding: 8px 14px;
      margin: 10px 0;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 7px 10px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    ul, ol { padding-left: 20px; margin: 6px 0; }
    li { margin: 3px 0; }
    .quiz-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      background: #fafafa;
      page-break-inside: avoid;
    }
    .quiz-q { font-weight: 600; margin-bottom: 6px; font-size: 13px; }
    .quiz-opt { padding: 3px 6px; margin: 3px 0; font-size: 12px; }
    .quiz-ans { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #d1d5db; font-size: 12px; color: #166534; }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      font-size: 11px;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(options.title)}</div>
    ${options.subtitle ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
  </div>
  <div class="content">
    ${options.htmlContent}
  </div>
  <div class="footer">
    <span>MoRead AI Companion</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(printHtml)
  printWindow.document.close()
  setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (e) {
      console.warn('Print trigger failed:', e)
    }
  }, 400)
}

export function exportSummaryToPdf(options: {
  bookTitle: string
  chapterTitle: string
  markdownContent: string
}) {
  const rendered = marked.parse(options.markdownContent) as string
  exportToPdfViaPrint({
    title: options.chapterTitle || 'Chapter Summary',
    subtitle: `Book: ${options.bookTitle} · MoRead AI Summary`,
    htmlContent: rendered,
  })
}

export function exportQuizToPdf(options: {
  bookTitle: string
  chapterTitle: string
  questions: QuizQuestion[]
  withAnswers: boolean
}) {
  let html = ''
  options.questions.forEach((q, idx) => {
    html += `<div class="quiz-card page-break-avoid">`
    html += `<div class="quiz-q">Q${idx + 1}. ${escapeHtml(q.question)}</div>`
    q.options.forEach((opt) => {
      html += `<div class="quiz-opt"><strong>${opt.key}.</strong> ${escapeHtml(opt.text)}</div>`
    })
    if (options.withAnswers) {
      html += `<div class="quiz-ans">`
      html += `<div><strong>✓ Answer: ${q.answer}</strong></div>`
      if (q.explanation) {
        html += `<div style="color: #374151; margin-top: 4px;"><em>Explanation:</em> ${escapeHtml(q.explanation)}</div>`
      }
      html += `</div>`
    } else {
      html += `<div style="margin-top: 8px; font-size: 11px; color: #6b7280; border-top: 1px dashed #ddd; padding-top: 4px;">My Answer: [ ______ ]</div>`
    }
    html += `</div>`
  })

  exportToPdfViaPrint({
    title: options.withAnswers ? 'Quiz Solutions & Explanations' : 'Quiz Practice Sheet',
    subtitle: `Book: ${options.bookTitle} · Chapter: ${options.chapterTitle || 'General'} · ${options.questions.length} Questions`,
    htmlContent: html,
  })
}
