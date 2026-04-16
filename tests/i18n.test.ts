/**
 * Test 1: i18n Messages - Verify all locales have consistent structure
 * Ensures no missing translations across zh-CN, en-US, pt-BR, ja-JP
 */

import { describe, it, expect } from 'vitest'
import messages from '../i18n/messages'

describe('i18n messages', () => {
  const LOCALES = ['zh-CN', 'en-US', 'pt-BR', 'ja-JP'] as const

  // Extract all dot-notation keys from an object recursively
  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value as Record<string, unknown>, fullKey))
      } else {
        keys.push(fullKey)
      }
    }
    return keys
  }

  it('should have all 4 locales defined', () => {
    for (const locale of LOCALES) {
      expect(messages[locale], `Locale ${locale} should exist`).toBeDefined()
    }
    expect(Object.keys(messages)).toHaveLength(4)
  })

  it('should have consistent keys across all locales', () => {
    const referenceKeys = getAllKeys(messages['zh-CN']).sort()

    for (const locale of LOCALES) {
      const localeKeys = getAllKeys(messages[locale]).sort()
      const missing = referenceKeys.filter(k => !localeKeys.includes(k))
      const extra = localeKeys.filter(k => !referenceKeys.includes(k))

      if (missing.length > 0) {
        console.log(`[${locale}] Missing keys:`, missing)
      }
      if (extra.length > 0) {
        console.log(`[${locale}] Extra keys:`, extra)
      }

      expect(missing, `${locale} missing keys`).toEqual([])
      expect(extra, `${locale} extra keys`).toEqual([])
    }
  })

  it('should have no empty string values', () => {
    function checkEmpty(obj: Record<string, unknown>, path = ''): string[] {
      const empty: string[] = []
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = path ? `${path}.${key}` : key
        if (typeof value === 'string' && value.trim() === '') {
          empty.push(fullKey)
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          empty.push(...checkEmpty(value as Record<string, unknown>, fullKey))
        }
      }
      return empty
    }

    for (const locale of LOCALES) {
      const emptyKeys = checkEmpty(messages[locale])
      expect(emptyKeys, `${locale} has empty values at`).toEqual([])
    }
  })

  it('should have required top-level sections', () => {
    const requiredSections = [
      'app', 'header', 'library', 'toc', 'theme', 'tts',
      'ttsSetup', 'voice', 'language', 'selection', 'sidePanel', 'reader'
    ]

    for (const locale of LOCALES) {
      for (const section of requiredSections) {
        expect(messages[locale][section], `${locale} missing section: ${section}`).toBeDefined()
      }
    }
  })

  it('should have voice keys matching i18n-compatible codes', () => {
    const voiceGroups = ['chinese', 'english', 'japanese', 'korean', 'french', 'german', 'spanish', 'italian', 'russian', 'portuguese', 'other']
    const genders = ['male', 'female', 'child']
    const allExpected = [...voiceGroups, ...genders]

    const zhVoiceKeys = Object.keys(messages['zh-CN'].voice)
    for (const expected of allExpected) {
      expect(zhVoiceKeys).toContain(expected)
    }
  })

  it('should have sidePanel keys for all features', () => {
    const sidePanelKeys = [
      'title', 'highlights', 'vocabulary', 'flashcard',
      'noHighlights', 'noVocab', 'noDueWords', 'startReview',
      'dueCount', 'reviews', 'tapToFlip', 'noTranslation',
      'forgot', 'hard', 'good', 'easy', 'color'
    ]

    for (const locale of LOCALES) {
      const keys = Object.keys(messages[locale].sidePanel)
      for (const expected of sidePanelKeys) {
        expect(keys).toContain(expected)
      }
    }
  })

  it('should have color translations for all highlight colors', () => {
    const colors = ['yellow', 'green', 'blue', 'pink']

    for (const locale of LOCALES) {
      const colorKeys = Object.keys(messages[locale].sidePanel.color)
      for (const color of colors) {
        expect(colorKeys).toContain(color)
      }
    }
  })
})
