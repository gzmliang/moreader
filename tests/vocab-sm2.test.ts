/**
 * Test 3: VocabStore SM-2 Algorithm
 * Tests the spaced repetition scheduling logic independently
 */

import { describe, it, expect } from 'vitest'

// Replicate the SM-2 algorithm from vocabStore for isolated testing
interface VocabWord {
  id: string
  word: string
  reviewCount: number
  interval: number
  ease: number
  nextReview: number
}

function applySM2(word: VocabWord, quality: number): VocabWord {
  const updated = { ...word }

  if (quality < 2) {
    updated.reviewCount = 0
    updated.interval = 1
  } else {
    if (updated.reviewCount === 0) {
      updated.interval = 1
    } else if (updated.reviewCount === 1) {
      updated.interval = 6
    } else {
      updated.interval = Math.round(updated.interval * updated.ease)
    }
    updated.reviewCount++
  }

  updated.ease = Math.max(1.3, updated.ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)))
  updated.nextReview = Date.now() + updated.interval * 24 * 60 * 60 * 1000

  return updated
}

describe('SM-2 Algorithm', () => {
  const createWord = (overrides = {}): VocabWord => ({
    id: 'test-1',
    word: 'test',
    reviewCount: 0,
    interval: 0,
    ease: 2.5,
    nextReview: Date.now(),
    ...overrides,
  })

  describe('First review (reviewCount = 0)', () => {
    it('should set interval to 1 day for quality >= 2', () => {
      const word = createWord()
      const result = applySM2(word, 3) // easy

      expect(result.interval).toBe(1)
      expect(result.reviewCount).toBe(1)
    })

    it('should reset for quality < 2 (forgot)', () => {
      const word = createWord()
      const result = applySM2(word, 0) // forgot

      expect(result.interval).toBe(1)
      expect(result.reviewCount).toBe(0)
    })
  })

  describe('Second review (reviewCount = 1)', () => {
    it('should set interval to 6 days for quality >= 2', () => {
      const word = createWord({ reviewCount: 1 })
      const result = applySM2(word, 2) // good

      expect(result.interval).toBe(6)
      expect(result.reviewCount).toBe(2)
    })

    it('should reset for quality < 2', () => {
      const word = createWord({ reviewCount: 1 })
      const result = applySM2(word, 1) // hard

      expect(result.interval).toBe(1)
      expect(result.reviewCount).toBe(0)
    })
  })

  describe('Subsequent reviews (reviewCount >= 2)', () => {
    it('should multiply interval by ease factor', () => {
      const word = createWord({ reviewCount: 2, interval: 6, ease: 2.5 })
      const result = applySM2(word, 2) // good

      expect(result.interval).toBe(Math.round(6 * 2.5)) // 15
      expect(result.reviewCount).toBe(3)
    })

    it('should reset interval on forgetting', () => {
      const word = createWord({ reviewCount: 5, interval: 30, ease: 2.5 })
      const result = applySM2(word, 0) // forgot

      expect(result.interval).toBe(1)
      expect(result.reviewCount).toBe(0)
      expect(result.ease).toBeLessThan(2.5) // ease decreases
    })
  })

  describe('Ease factor updates', () => {
    it('should increase ease for easy (quality=3)', () => {
      const word = createWord({ ease: 2.5 })
      const result = applySM2(word, 3)

      expect(result.ease).toBeGreaterThan(2.5)
      expect(result.ease).toBeCloseTo(2.5 + 0.1, 2)
    })

    it('should decrease ease for hard (quality=1)', () => {
      const word = createWord({ ease: 2.5 })
      const result = applySM2(word, 1)

      expect(result.ease).toBeLessThan(2.5)
      // ease = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
      expect(result.ease).toBeCloseTo(2.36, 2)
    })

    it('should never drop below 1.3 (minimum ease)', () => {
      let word = createWord({ ease: 2.5 })

      // Repeatedly fail to decrease ease
      for (let i = 0; i < 20; i++) {
        word = applySM2(word, 0)
      }

      expect(word.ease).toBeGreaterThanOrEqual(1.3)
      expect(word.ease).toBeCloseTo(1.3, 1)
    })
  })

  describe('Full review cycle simulation', () => {
    it('should grow intervals correctly for consistent "good" reviews', () => {
      let word = createWord()
      const intervals: number[] = []

      // Simulate 10 reviews, all rated "good" (2)
      for (let i = 0; i < 10; i++) {
        word = applySM2(word, 2)
        intervals.push(word.interval)
      }

      // Intervals should be increasing
      expect(intervals[0]).toBe(1)    // first review
      expect(intervals[1]).toBe(6)    // second review
      expect(intervals[2]).toBe(15)   // 6 * 2.5
      expect(intervals[3]).toBe(38)   // 15 * ~2.52
      expect(intervals[intervals.length - 1]).toBeGreaterThan(intervals[2])
    })

    it('should show rapid growth for "easy" reviews', () => {
      let word = createWord()
      const intervals: number[] = []

      for (let i = 0; i < 8; i++) {
        word = applySM2(word, 3) // easy
        intervals.push(word.interval)
      }

      // Easy reviews should grow faster than good
      expect(intervals[intervals.length - 1]).toBeGreaterThan(50)
    })
  })

  describe('Edge cases', () => {
    it('should handle quality=2 (good) correctly', () => {
      const word = createWord()
      const result = applySM2(word, 2)

      expect(result.interval).toBe(1)
      expect(result.reviewCount).toBe(1)
      // ease for quality=2: 2.5 + (0.1 - 1 * (0.08 + 0.02)) = 2.5 + 0 = 2.5
      expect(result.ease).toBeCloseTo(2.5, 2)
    })

    it('should handle maximum quality gracefully', () => {
      const word = createWord()
      const result = applySM2(word, 3)

      expect(result.reviewCount).toBe(1)
      expect(result.ease).toBeGreaterThan(2.5)
    })
  })
})
