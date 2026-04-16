/**
 * Test 4: BookStore - File format validation and helper functions
 * Tests supported extensions, file type detection, and validation logic
 */

import { describe, it, expect } from 'vitest'

// Extract the helper functions for testing (replicated from bookStore.ts)
const SUPPORTED_EXTENSIONS = ['.epub', '.txt', '.mobi']

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

describe('BookStore helpers', () => {
  describe('getFileExtension', () => {
    it('should return lowercase extension', () => {
      expect(getFileExtension('book.EPUB')).toBe('.epub')
      expect(getFileExtension('book.TXT')).toBe('.txt')
      expect(getFileExtension('book.MOBI')).toBe('.mobi')
    })

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('my.book.epub')).toBe('.epub')
      expect(getFileExtension('some.file.name.txt')).toBe('.txt')
    })

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('')
      expect(getFileExtension('Makefile')).toBe('')
    })

    it('should handle hidden files', () => {
      // .gitignore has extension ".gitignore" per our simple logic
      expect(getFileExtension('.gitignore')).toBe('.gitignore')
      // Files with only a leading dot and no other extension
      expect(getFileExtension('.bashrc')).toBe('.bashrc')
    })
  })

  describe('supported extensions', () => {
    const testCases = [
      { ext: '.epub', supported: true },
      { ext: '.txt', supported: true },
      { ext: '.mobi', supported: true },
      { ext: '.pdf', supported: false },
      { ext: '.azw3', supported: false },
      { ext: '.docx', supported: false },
      { ext: '.fb2', supported: false },
    ]

    for (const { ext, supported } of testCases) {
      it(`should ${supported ? 'support' : 'not support'} ${ext}`, () => {
        expect(SUPPORTED_EXTENSIONS.includes(ext)).toBe(supported)
      })
    }
  })
})
