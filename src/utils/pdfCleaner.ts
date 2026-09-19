/**
 * PDF 纯净文本清洗管道
 * 用于将 PDF 提取的非结构化文字清洗为适合流式排版和纯净朗读的自然文本
 */

export interface CleanedChapter {
  title: string
  content: string // HTML 或纯文本段落
  paragraphs: string[]
}

/**
 * 修复跨行英文断词 (Hyphenation)
 * 例如: "fundamen-\ntal" -> "fundamental"
 */
export function repairHyphenation(text: string): string {
  return text.replace(/([A-Za-z]{2,})-\s*(?:\r?\n)+\s*([A-Za-z]{2,})/g, '$1$2')
}

/**
 * 过滤孤立页码与常见纯数字页脚行
 */
export function removePageNumbers(lines: string[]): string[] {
  return lines.filter(line => {
    const trimmed = line.trim()
    if (/^(?:page\s+)?\d+$/i.test(trimmed)) return false
    if (/^[-–—]\s*\d+\s*[-–—]$/.test(trimmed)) return false
    return true
  })
}

/**
 * 过滤学术引用文献标记，避免 TTS 念出 "[1]", "[2-4]" 等杂音
 */
export function stripCitations(text: string): string {
  return text.replace(/\[\s*\d+(?:\s*[-–,]\s*\d+)*\s*\]/g, '')
}

/**
 * 清除扫描版 OCR 常见无意义噪点符号（如连续竖线、条形码乱码）
 */
export function stripScanArtifacts(text: string): string {
  return text
    .replace(/[\|│]{2,}/g, ' ')
    .replace(/\|\s*\|\s*[\}\]\)]\s*\|\s*\|+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 判断一行文本是否明显是独立的章节标题
 */
export function isHeadingLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 80) return false
  return /^(?:chapter\s+\d+|第[一二三四五六七八九十百\d]+[章节回卷]|part\s+\d+|section\s+\d+|[\d]+[\.、])/i.test(trimmed)
}

/**
 * 将 PDF 中的硬回车假断行智能接拢为自然段落
 */
export function mergeBrokenLines(rawText: string): string[] {
  const repairedText = repairHyphenation(rawText)
  const rawLines = repairedText.split(/\r?\n/)
  const filteredLines = removePageNumbers(rawLines)

  const paragraphs: string[] = []
  let currentParagraph = ''

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i].trim()
    if (!line) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim())
        currentParagraph = ''
      }
      continue
    }

    // 如果当前行是标题行，必须作为独立段落
    if (isHeadingLine(line)) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim())
        currentParagraph = ''
      }
      paragraphs.push(line)
      continue
    }

    if (!currentParagraph) {
      currentParagraph = line
    } else {
      const lastChar = currentParagraph.slice(-1)
      const isSentenceEnd = /[。！？!?…:：”"』」]\s*$/.test(lastChar)

      // 如果上一行是自然句号且本行大写或首行缩进，起新段
      if (isSentenceEnd) {
        paragraphs.push(currentParagraph.trim())
        currentParagraph = line
      } else {
        // 智能拼接
        const isPrevChinese = /[\u4e00-\u9fa5]/.test(lastChar)
        const isCurrChinese = /[\u4e00-\u9fa5]/.test(line.charAt(0))
        
        if (isPrevChinese && isCurrChinese) {
          currentParagraph += line
        } else {
          currentParagraph += ' ' + line
        }
      }
    }
  }

  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim())
  }

  return paragraphs
}

/**
 * 完整清洗并按章节切分（若无明显章节则按字数自动切分）
 */
export function cleanAndChunkPdfText(pageTexts: string[]): CleanedChapter[] {
  const fullText = pageTexts.join('\n\n')
  const paragraphs = mergeBrokenLines(fullText)

  const chapters: CleanedChapter[] = []
  let currentChapterTitle = ''
  let currentParagraphs: string[] = []

  const saveCurrentChapter = () => {
    if (currentParagraphs.length > 0 || currentChapterTitle) {
      const cleanParas = currentParagraphs
        .map(p => stripScanArtifacts(stripCitations(p)))
        .filter(p => p.length > 0)

      if (cleanParas.length > 0) {
        chapters.push({
          title: currentChapterTitle || `Section ${chapters.length + 1}`,
          content: cleanParas.map(p => `<p>${p}</p>`).join(''),
          paragraphs: cleanParas
        })
      }
      currentParagraphs = []
      currentChapterTitle = ''
    }
  }

  for (const para of paragraphs) {
    if (isHeadingLine(para)) {
      saveCurrentChapter()
      currentChapterTitle = para
    } else {
      currentParagraphs.push(para)
      if (currentParagraphs.length >= 40 && !currentChapterTitle) {
        saveCurrentChapter()
      }
    }
  }

  saveCurrentChapter()

  return chapters
}
