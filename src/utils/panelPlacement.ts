/**
 * 【v2.10.3】划词翻译结果面板的就近定位算法（纯函数，便于自动化验证）
 *
 * 需求：翻译结果不要永远钉在页面底部，而要出现在**划词附近**，并且**绝不遮挡划词本身**。
 *
 * 规则：
 *   1. 优先放在划词正下方（视线自然下移），水平方向上与划词中心对齐；
 *   2. 下方空间不足（放不下最低可视高度）时，翻到划词上方；
 *   3. 面板高度上限 = 所选方向上的可用空间（保证面板矩形永远落在划词之外）；
 *   4. 水平方向夹紧在视口内（左右各留 10px）；
 *   5. 没有划词锚点时，回退为原来的「底部居中」。
 */

export interface SelectionAnchor {
  top: number
  bottom: number
  left: number
  width: number
}

export interface Viewport {
  width: number
  height: number
}

/** 面板与划词之间的最小间距 */
export const PANEL_GAP = 12
/** 面板左右安全边距 */
export const PANEL_EDGE = 10
/** 低于这个高度就没必要放下方/上方了 */
export const PANEL_MIN_HEIGHT = 120
/** 放下方所需的最低空间（低于此值优先考虑上方） */
export const PANEL_COMFORT_HEIGHT = 180
/** 面板最大宽度 */
export const PANEL_MAX_WIDTH = 520
/** 面板最小宽度 */
export const PANEL_MIN_WIDTH = 240

/** 原来的「底部居中」样式（非划词场景：TTS 录音、整本书 TTS 等） */
export const DEFAULT_RESULT_PANEL_STYLE: Record<string, string> = {
  left: '50%',
  right: 'auto',
  top: 'auto',
  bottom: '80px',
  transform: 'translateX(-50%)',
  width: '560px',
  maxWidth: '90vw',
  maxHeight: '70vh',
}

/**
 * 计算划词翻译面板的定位样式。
 * @param anchor 划词范围（视口坐标），传 null 则回退底部居中
 * @param viewport 视口尺寸
 */
export function computeResultPanelPlacement(
  anchor: SelectionAnchor | null | undefined,
  viewport: Viewport,
): Record<string, string> {
  if (!anchor) return { ...DEFAULT_RESULT_PANEL_STYLE }

  const vw = Math.max(1, viewport.width)
  const vh = Math.max(1, viewport.height)
  const width = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, vw - PANEL_EDGE * 2))
  const anchorTop = Math.max(0, anchor.top)
  const anchorBottom = Math.min(vh, anchor.bottom)

  const spaceBelow = vh - anchorBottom - PANEL_GAP - 8
  const spaceAbove = anchorTop - PANEL_GAP - 8
  const placeBelow = spaceBelow >= PANEL_COMFORT_HEIGHT || spaceBelow >= spaceAbove
  const maxHeight = Math.max(
    PANEL_MIN_HEIGHT,
    Math.min(Math.round(vh * 0.7), placeBelow ? spaceBelow : spaceAbove),
  )

  let left = anchor.left + anchor.width / 2 - width / 2
  left = Math.max(PANEL_EDGE, Math.min(left, Math.max(PANEL_EDGE, vw - width - PANEL_EDGE)))

  const base: Record<string, string> = {
    left: `${Math.round(left)}px`,
    right: 'auto',
    transform: 'none',
    width: `${width}px`,
    maxWidth: `${vw - PANEL_EDGE * 2}px`,
    maxHeight: `${Math.max(PANEL_MIN_HEIGHT, Math.round(maxHeight))}px`,
  }

  return placeBelow
    ? { ...base, top: `${Math.round(anchorBottom + PANEL_GAP)}px`, bottom: 'auto' }
    : { ...base, top: 'auto', bottom: `${Math.round(vh - anchorTop + PANEL_GAP)}px` }
}

/** 面板实际占据的矩形（用于自动化"不遮挡划词"断言） */
export function panelRectFromStyle(
  style: Record<string, string>,
  viewport: Viewport,
): { left: number; right: number; top: number; bottom: number } {
  const num = (v: string | undefined, fallback: number) => {
    if (!v || v === 'auto') return fallback
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : fallback
  }
  const width = num(style.width, viewport.width)
  const maxWidth = num(style.maxWidth, viewport.width)
  const w = Math.min(width, maxWidth)
  const maxHeight = num(style.maxHeight, viewport.height)
  const height = Math.min(maxHeight, viewport.height)

  let left = num(style.left, 0)
  if (style.transform === 'translateX(-50%)') left = left - w / 2

  let top: number
  if (style.top && style.top !== 'auto') top = num(style.top, 0)
  else top = viewport.height - num(style.bottom, 0) - height

  return { left, right: left + w, top, bottom: top + height }
}

/** 面板矩形是否与划词范围重叠（false = 不遮挡） */
export function overlapsAnchor(
  rect: { left: number; right: number; top: number; bottom: number },
  anchor: SelectionAnchor,
): boolean {
  const horizontal = rect.right > anchor.left && rect.left < anchor.left + anchor.width
  const vertical = rect.bottom > anchor.top && rect.top < anchor.bottom
  return horizontal && vertical
}
