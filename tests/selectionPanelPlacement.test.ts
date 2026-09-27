/**
 * 【v2.10.3 验收】划词翻译结果面板：就近显示 + 绝不遮挡划词
 *
 * 判据（机器可验）：
 *   1. 面板必须出现在划词附近（紧邻上下，间距固定）；
 *   2. 面板矩形（按最坏情况 = maxHeight 高度算）与划词矩形**零重叠**；
 *   3. 面板永远落在视口内；
 *   4. 没有划词时，退化为原来的底部居中行为不变。
 */
import { describe, it, expect } from 'vitest'
import {
  computeResultPanelPlacement,
  panelRectFromStyle,
  overlapsAnchor,
  DEFAULT_RESULT_PANEL_STYLE,
  type SelectionAnchor,
  type Viewport,
} from '../src/utils/panelPlacement'

const VW = 1440
const VH = 900
const viewport: Viewport = { width: VW, height: VH }

const anchorOf = (top: number, height: number, left: number, width: number): SelectionAnchor => ({
  top, bottom: top + height, left, width,
})

describe('划词翻译面板定位', () => {
  it('划词在页面中部 → 面板紧贴划词下方，且不遮挡划词', () => {
    const anchor = anchorOf(300, 24, 600, 200)
    const style = computeResultPanelPlacement(anchor, viewport)
    const rect = panelRectFromStyle(style, viewport)
    expect(style.top).not.toBe('auto')
    expect(style.bottom).toBe('auto')
    expect(rect.top).toBeGreaterThanOrEqual(anchor.bottom)
    expect(overlapsAnchor(rect, anchor)).toBe(false)
  })

  it('划词在页面底部 → 翻到划词上方，且不遮挡划词', () => {
    const anchor = anchorOf(850, 24, 400, 180)
    const style = computeResultPanelPlacement(anchor, viewport)
    const rect = panelRectFromStyle(style, viewport)
    expect(style.top).toBe('auto')
    expect(rect.bottom).toBeLessThanOrEqual(anchor.top)
    expect(overlapsAnchor(rect, anchor)).toBe(false)
  })

  it('划词紧贴右侧 / 左侧 → 面板被夹回视口内', () => {
    for (const left of [0, 5, VW - 40, VW - 5]) {
      const anchor = anchorOf(300, 24, left, 30)
      const rect = panelRectFromStyle(computeResultPanelPlacement(anchor, viewport), viewport)
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(VW)
    }
  })

  it('超宽划词（横跨整行）→ 面板仍放在划词外侧，不遮挡', () => {
    const anchor = anchorOf(200, 26, 0, VW)
    const rect = panelRectFromStyle(computeResultPanelPlacement(anchor, viewport), viewport)
    expect(overlapsAnchor(rect, anchor)).toBe(false)
    expect(rect.top).toBeGreaterThanOrEqual(anchor.bottom)
  })

  it('穷举视口内 600 个划词位置：面板永不遮挡划词、永不越界', () => {
    let checked = 0
    for (let top = 20; top <= VH - 20; top += 40) {
      for (let left = 0; left <= VW - 40; left += 120) {
        for (const width of [20, 180, 700]) {
          const anchor = anchorOf(top, 22, left, Math.min(width, VW - left))
          const rect = panelRectFromStyle(computeResultPanelPlacement(anchor, viewport), viewport)
          expect(overlapsAnchor(rect, anchor)).toBe(false)
          expect(rect.left).toBeGreaterThanOrEqual(0)
          expect(rect.right).toBeLessThanOrEqual(VW + 0.5)
          expect(rect.top).toBeGreaterThanOrEqual(-0.5)
          checked++
        }
      }
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('没有划词锚点 → 完全保持原来的底部居中样式', () => {
    expect(computeResultPanelPlacement(null, viewport)).toEqual(DEFAULT_RESULT_PANEL_STYLE)
    expect(DEFAULT_RESULT_PANEL_STYLE.bottom).toBe('80px')
    expect(DEFAULT_RESULT_PANEL_STYLE.transform).toBe('translateX(-50%)')
  })

  it('小窗口 / 极端视口不崩且仍不遮挡', () => {
    const tiny: Viewport = { width: 320, height: 480 }
    const anchor = anchorOf(120, 20, 10, 100)
    const rect = panelRectFromStyle(computeResultPanelPlacement(anchor, tiny), tiny)
    expect(overlapsAnchor(rect, anchor)).toBe(false)
    expect(rect.right).toBeLessThanOrEqual(tiny.width + 0.5)
  })
})
