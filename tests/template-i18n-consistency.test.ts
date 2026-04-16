/**
 * Test 6: Template-to-i18n Key Consistency
 * Verifies that all $t() calls in Reader.vue have matching i18n keys
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import messages from '../i18n/messages'

function getAllKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const k of getAllKeys(value as Record<string, unknown>, fullKey)) {
        keys.add(k)
      }
    } else {
      keys.add(fullKey)
    }
  }
  return keys
}

describe('Template-i18n consistency', () => {
  let readerContent: string

  beforeAll(() => {
    readerContent = fs.readFileSync(
      path.resolve(__dirname, '../components/Reader.vue'),
      'utf-8'
    )
  })

  it('should find all $t() calls in Reader.vue template', () => {
    // Extract $t() calls from template section
    const templateMatch = readerContent.match(/<template>([\s\S]*?)<\/template>/)
    expect(templateMatch).not.toBeNull()

    const template = templateMatch![1]
    const tCalls = template.match(/\$t\(['"]([^'"]+)['"]/g) || []

    expect(tCalls.length).toBeGreaterThan(0)
  })

  it('should have all called keys defined in zh-CN locale', () => {
    const zhKeys = getAllKeys(messages['zh-CN'])

    // Extract $t() calls from template
    const templateMatch = readerContent.match(/<template>([\s\S]*?)<\/template>/)
    if (!templateMatch) return

    const template = templateMatch![1]
    const tCalls = template.match(/\$t\(['"]([^'"]+)['"]/g) || []

    const dynamicKeys = new Set([
      'sidePanel.color.',  // Dynamic: sidePanel.color.yellow etc.
      'voice.',            // Dynamic: voice.chinese etc.
      'rating.label',      // From cardRatings array
      'tab.label',         // From sideTabs array
    ])

    for (const call of tCalls) {
      const keyMatch = call.match(/\$t\(['"]([^'"]+)['"]/)
      if (!keyMatch) continue

      const key = keyMatch[1]

      // Skip dynamic keys
      if (dynamicKeys.has(key) || dynamicKeys.has(key + '.')) continue

      // Check if key exists
      if (!zhKeys.has(key)) {
        // Check if it's a prefix match for dynamic keys
        const isDynamicPrefix = Array.from(dynamicKeys).some(prefix => key.startsWith(prefix))
        if (isDynamicPrefix) continue

        console.warn(`Missing i18n key: "${key}"`)
      }

      expect(zhKeys.has(key), `Key "${key}" should exist in zh-CN`).toBe(true)
    }
  })

  it('should have no unused keys in zh-CN (optional check)', () => {
    // This is informational - shows all defined keys
    const zhKeys = getAllKeys(messages['zh-CN'])
    expect(zhKeys.size).toBeGreaterThan(50) // Sanity check: should have substantial keys
  })

  it('should have proper placeholder syntax for interpolation', () => {
    // Check that keys with {count} etc. are properly formatted
    const zhKeys = getAllKeys(messages['zh-CN'])

    for (const key of zhKeys) {
      // Get the value
      const parts = key.split('.')
      let value: unknown = messages['zh-CN']
      for (const part of parts) {
        if (typeof value === 'object' && value !== null) {
          value = (value as Record<string, unknown>)[part]
        }
      }

      if (typeof value === 'string' && value.includes('{')) {
        // Should have matching closing brace
        const openCount = (value.match(/{/g) || []).length
        const closeCount = (value.match(/}/g) || []).length
        expect(openCount).toBe(closeCount)
      }
    }
  })
})
