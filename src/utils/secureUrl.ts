/**
 * 明文 HTTP 传输安全治理（Chrome Web Store 数据安全合规 / "Data transmitting over HTTP"）
 *
 * 三条铁律：
 * 1. 官方 Edge-TTS 语音节点统一使用 HTTPS 加密传输；
 * 2. 历史版本遗留的明文节点（含用户浏览器里已保存的旧配置）自动平滑迁移到官方 HTTPS 节点；
 * 3. 用户自定义的公网 http 地址就地升级为 https，局域网 / 本机地址（RFC1918、localhost）
 *    原样保留，不影响用户自建 NAS、软路由等本地部署场景。
 */

/** 官方加密语音节点（唯一对外默认节点） */
export const OFFICIAL_TTS_ENDPOINT = 'https://liang-studio.duckdns.org/edge-tts'

/** 历史遗留的自家明文节点主机名：整段迁移到官方 HTTPS 节点 */
const LEGACY_TTS_HOSTS = ['p-plus.duckdns.org', 'powerplus.blogsyte.com']

/** 判断是否属于局域网 / 本机地址（这类地址允许保留明文，属用户自建场景） */
export function isPrivateHost(hostname: string): boolean {
  const h = (hostname || '').toLowerCase().replace(/^\[|\]$/g, '')
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true
  if (h.endsWith('.local') || h.endsWith('.localhost') || h.endsWith('.lan')) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  return false
}

/** 是否属于需要迁移的历史明文语音节点 */
export function isLegacyTtsEndpoint(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:') return false
    return LEGACY_TTS_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

/** 通用地址安全化：公网 http 就地升级为 https，内网 / 本机 http 保持原样 */
export function secureUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:') return url
    if (isPrivateHost(u.hostname)) return url
    u.protocol = 'https:'
    return u.toString().replace(/\/+$/, '')
  } catch {
    return url
  }
}

/** 语音节点安全化：历史明文节点迁移到官方 HTTPS 节点，其余走通用安全化 */
export function secureTtsEndpoint(url: string): string {
  if (!url) return OFFICIAL_TTS_ENDPOINT
  if (isLegacyTtsEndpoint(url)) return OFFICIAL_TTS_ENDPOINT
  return secureUrl(url)
}
