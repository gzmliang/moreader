import type { NavItem } from 'epubjs'

type Logger = (msg: string) => void

const noop: Logger = () => {}

/**
 * 【方案A · 与安卓 APP 端完全一致】直接从 EPUB 二进制里自解析目录（NCX）。
 *
 * 背景：epubjs 的 `book.navigation` 只返回「顶层」条目 —— 一本 NCX 里 101 条的
 * 目录（4 层：书名 → Cover/Introduction → Nights 1 to 20 → Page 35）只吐出 18 条，
 * 于是浏览器端目录看起来「不详细」。而安卓端向来是自己读 zip：
 *
 *   META-INF/container.xml → OPF →（spine[toc] 指定的 id）→ manifest → NCX，
 *   命名空间感知解析所有 navPoint，产物「拍平 + 带 level 缩进」。
 *
 * 这里把同一套逻辑搬到浏览器端，两端目录从此一模一样。
 * 为兼容畸形 EPUB，主路径未命中时会全盘查找任意 `.ncx`（对应安卓端的硬编码路径兜底）。
 *
 * @returns 解析成功返回拍平后的目录条目；任何一步失败返回空数组（调用方原样保留旧目录）
 */
export async function parseNCXFromBinary(
  input: ArrayBuffer | Uint8Array,
  log: Logger = noop,
): Promise<NavItem[]> {
  try {
    log('📑 NCX: 开始自解析目录（方案A，与安卓端一致）...')
    log(`📑 NCX: ✓ 书本数据已载入, ${input.byteLength} bytes`)

    const JSZip = (await import('jszip')).default
    // 统一转成 Uint8Array 再交给 JSZip（浏览器零拷贝视图；同时避开个别运行环境对 ArrayBuffer 的跨 realm 判定问题）
    const data = input instanceof Uint8Array ? input : new Uint8Array(input)
    const zip = await JSZip.loadAsync(data)
    log(`📑 NCX: ✓ JSZip opened, files: ${Object.keys(zip.files).length}`)

    // Step 1: read container.xml to find OPF path
    const containerFile = zip.file('META-INF/container.xml')
    if (!containerFile) { log('📑 NCX: ❌ container.xml not found'); return [] }
    const containerXml = await containerFile.async('string')
    const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml')
    const rootfile = containerDoc.querySelector('rootfile')
      || containerDoc.getElementsByTagNameNS('*', 'rootfile')[0]
    if (!rootfile) { log('📑 NCX: ❌ rootfile not found in container'); return [] }
    const opfPath = rootfile.getAttribute('full-path') || ''
    if (!opfPath) { log('📑 NCX: ❌ opfPath empty'); return [] }
    log(`📑 NCX: ✓ OPF path = ${opfPath}`)

    // Step 2: read OPF to find NCX
    const opfFile = zip.file(opfPath)
    if (!opfFile) { log('📑 NCX: ❌ OPF file not found'); return [] }
    const opfXml = await opfFile.async('string')
    const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml')

    // Get NCX id from spine toc attribute
    const spineEl = opfDoc.querySelector('spine')
      || opfDoc.getElementsByTagNameNS('*', 'spine')[0]
    const ncxId = spineEl?.getAttribute('toc')
    if (!ncxId) log('📑 NCX: ⚠️ ncxId not found in spine toc（转兜底查找）')
    else log(`📑 NCX: ✓ ncxId = ${ncxId}`)

    // Find NCX href in manifest
    const items = opfDoc.querySelectorAll('item')
      || opfDoc.getElementsByTagNameNS('*', 'item')
    let ncxHref = ''
    for (const item of Array.from(items)) {
      if (ncxId && item.getAttribute('id') === ncxId) {
        ncxHref = item.getAttribute('href') || ''
        break
      }
    }
    if (ncxHref) log(`📑 NCX: ✓ ncxHref = ${ncxHref}`)

    // Step 3: resolve NCX path (relative to OPF directory) and read NCX
    const opfDir = opfPath.replace(/[/][^/]+$/, '')
    const ncxFullPath = ncxHref ? (opfDir ? `${opfDir}/${ncxHref}` : ncxHref) : ''
    if (ncxFullPath) log(`📑 NCX: 尝试读取 NCX: ${ncxFullPath}`)
    let ncxFile = ncxFullPath ? zip.file(ncxFullPath) : null
    if (!ncxFile) {
      // 与安卓端一致：畸形 EPUB 走兜底路径（全盘查找任意 .ncx）
      const loose = Object.keys(zip.files).filter(f => /\.ncx$/i.test(f))
      log(`📑 NCX: 主路径未命中，兜底候选: ${loose.join(', ') || '无'}`)
      if (loose.length) ncxFile = zip.file(loose[0])
    }
    if (!ncxFile) { log('📑 NCX: ❌ 未找到任何 NCX 文件'); return [] }
    const ncxXml = await ncxFile.async('string')
    log(`📑 NCX: ✓ NCX loaded, ${ncxXml.length} chars`)
    const ncxDoc = new DOMParser().parseFromString(ncxXml, 'text/xml')

    // Step 4: parse navPoints (namespace-aware, like Android version)
    const navPoints = ncxDoc.querySelectorAll('navPoint').length
      ? ncxDoc.querySelectorAll('navPoint')
      : ncxDoc.getElementsByTagNameNS('*', 'navPoint')
    log(`📑 NCX: navPoints found = ${(navPoints as any).length || 0}`)
    const tocItems: NavItem[] = []
    for (const np of Array.from(navPoints)) {
      const npEl = np as Element
      const textEl = npEl.querySelector('text')
        || npEl.getElementsByTagNameNS('*', 'text')[0]
      const label = textEl?.textContent?.trim() || ''
      const contentEl = npEl.querySelector('content')
        || npEl.getElementsByTagNameNS('*', 'content')[0]
      const src = contentEl?.getAttribute('src') || ''
      if (label && src) {
        // countDepth: count ancestor navPoints to get nesting level
        let depth = 0
        let p = npEl.parentElement
        while (p) {
          if (p.localName === 'navPoint' || p.nodeName === 'navPoint'
              || (p.nodeName && p.nodeName.endsWith(':navPoint'))) depth++
          p = p.parentElement
        }
        tocItems.push({ label, href: src, level: depth })
      }
    }
    log(`📑 NCX: ✅ 最终解析 ${tocItems.length} 个章节`)
    if (tocItems.length > 0) log(`📑 NCX: 前3项: ${tocItems.slice(0, 3).map(i => i.label).join(', ')}`)
    return tocItems
  } catch (e) {
    log(`📑 NCX: ❌ 异常: ${e}`)
    return []
  }
}
