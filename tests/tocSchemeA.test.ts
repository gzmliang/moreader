/**
 * 【方案A 验收】浏览器端目录自解析（与安卓 APP 端一致）
 *
 * 判据：同一本 EPUB，浏览器端自解析得到的目录，必须和安卓端一样「全、带层级」，
 *       而不是 epub.js 只给的那几个顶层条目。
 *
 * 用法：TOC_BOOK_DIR=/root/tmp-books npx vitest run tests/tocSchemeA.test.ts
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseNCXFromBinary } from '../src/utils/epubToc'

const BOOK_DIR = process.env.TOC_BOOK_DIR || '/root/tmp-books'
// 梁老师实测的那本（4 层 NCX，手机端显示 101 条）
const NIGHTS = '/mnt/win-e/swapfiles/books/The_Arabian_Nights_Tales_of_1,001_Night_Volume1.epub'

const LOCAL_BOOKS = [
  'Owls of the Eastern Ice.epub',
  'The_English_Patient_Michael_Ondaatje.epub',
  '伊索寓言补遗3篇_阅读理解题.epub',
  'Season_of_the_Sandstorms_Quiz_Bilingual.epub',
]

const readFile = (p: string): Uint8Array | null =>
  fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : null

describe('方案A：浏览器端自解析 EPUB 目录（对齐安卓端）', () => {
  for (const name of LOCAL_BOOKS) {
    it(`${name} → 能解析出条目且字段完整`, async () => {
      const data = readFile(path.join(BOOK_DIR, name))
      if (!data) return
      const items = await parseNCXFromBinary(data)
      console.log(`📚 ${name} → 自解析 ${items.length} 条`)
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(it.label.length).toBeGreaterThan(0)
        expect(it.href.length).toBeGreaterThan(0)
      }
    })
  }

  it('《一千零一夜》Vol.1：拿到 101 条（含 3 层缩进），不再是 epub.js 的 18 条顶层', async () => {
    const data = readFile(NIGHTS)
    if (!data) {
      console.warn('⏭ 未找到《一千零一夜》真书，跳过')
      return
    }
    const items = await parseNCXFromBinary(data)
    const dist: Record<number, number> = {}
    items.forEach(i => { dist[i.level || 0] = (dist[i.level || 0] || 0) + 1 })
    console.log(`📚 Arabian Nights → ${items.length} 条，level 分布 ${JSON.stringify(dist)}`)
    console.log(items.slice(10, 15).map(i => `   [${i.level}] ${i.label}`).join('\n'))

    expect(items.length).toBe(101)
    expect(items.filter(i => (i.level || 0) === 1).length).toBeGreaterThan(20)
    expect(items.filter(i => (i.level || 0) === 2).length).toBeGreaterThan(20)
  })

  it('坏数据不会抛异常：随便一段二进制必须安全返回空数组', async () => {
    const items = await parseNCXFromBinary(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBe(0)
  })
})
