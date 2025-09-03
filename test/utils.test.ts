import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {normalizeBase64Url, normalizeExpiry, toBase64UrlWithPadding} from '../src/utils'

describe('normalizeBase64Url', () => {
  it('should replace + with -', () => {
    const input = 'abc+def+ghi'
    const expected = 'abc-def-ghi'

    expect(normalizeBase64Url(input)).toBe(expected)
  })

  it('should replace / with _', () => {
    const input = 'abc/def/ghi'
    const expected = 'abc_def_ghi'

    expect(normalizeBase64Url(input)).toBe(expected)
  })

  it('should replace both + and / in the same string', () => {
    const input = 'abc+def/ghi+jkl/mno'
    const expected = 'abc-def_ghi-jkl_mno'

    expect(normalizeBase64Url(input)).toBe(expected)
  })

  it('should preserve = padding', () => {
    const input = 'abcdef=='
    const expected = 'abcdef=='

    expect(normalizeBase64Url(input)).toBe(expected)
  })

  it('should handle empty string', () => {
    expect(normalizeBase64Url('')).toBe('')
  })

  it('should handle string with no replacements needed', () => {
    const input = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_='

    expect(normalizeBase64Url(input)).toBe(input)
  })

  it('should handle typical base64 string with padding', () => {
    const input = 'SGVsbG8gV29ybGQ+Pz8+Pz8='
    const expected = 'SGVsbG8gV29ybGQ-Pz8-Pz8='

    expect(normalizeBase64Url(input)).toBe(expected)
  })
})

describe('normalizeExpiry', () => {
  // Mock the current time to ensure consistent test results
  const mockDate = new Date('2025-12-31T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return undefined for undefined input', () => {
    expect(normalizeExpiry(undefined)).toBeUndefined()
  })

  it('should handle Date objects', () => {
    const futureDate = new Date('2026-12-31T23:59:59.999Z')
    const result = normalizeExpiry(futureDate)

    expect(result).toBe('2026-12-31T23:59:59Z')
  })

  it('should handle ISO string dates', () => {
    const isoString = '2026-12-31T23:59:59Z'
    const result = normalizeExpiry(isoString)

    expect(result).toBe('2026-12-31T23:59:59Z')
  })

  it('should handle ISO string dates with milliseconds', () => {
    const isoString = '2026-12-31T23:59:59.999Z'
    const result = normalizeExpiry(isoString)

    expect(result).toBe('2026-12-31T23:59:59Z')
  })

  it('should handle timestamp numbers', () => {
    const timestamp = new Date('2026-12-31T23:59:59Z').getTime()
    const result = normalizeExpiry(timestamp)

    expect(result).toBe('2026-12-31T23:59:59Z')
  })

  it('should handle various valid date string formats', () => {
    const dateString = '2026-12-31'
    const result = normalizeExpiry(dateString)

    expect(result).toBe('2026-12-31T00:00:00Z')
  })

  it('should throw error for invalid date string', () => {
    expect(() => normalizeExpiry('invalid-date')).toThrow('Invalid expiry date format')
  })

  it('should throw error for empty string', () => {
    expect(() => normalizeExpiry('')).toThrow('Invalid expiry date format')
  })

  it('should throw error for past dates', () => {
    const pastDate = new Date('2020-01-01T00:00:00Z')

    expect(() => normalizeExpiry(pastDate)).toThrow('Expiry date must be in the future')
  })

  it('should throw error for past timestamp', () => {
    const pastTimestamp = new Date('2020-01-01T00:00:00Z').getTime()

    expect(() => normalizeExpiry(pastTimestamp)).toThrow('Expiry date must be in the future')
  })

  it('should throw error for past date string', () => {
    expect(() => normalizeExpiry('2020-01-01T00:00:00Z')).toThrow(
      'Expiry date must be in the future',
    )
  })

  it('should throw error for date equal to now', () => {
    expect(() => normalizeExpiry(mockDate)).toThrow('Expiry date must be in the future')
  })

  it('should accept dates 1ms in the future', () => {
    const futureDate = new Date(mockDate.getTime() + 1)
    const result = normalizeExpiry(futureDate)

    expect(result).toBe('2025-12-31T12:00:00Z')
  })

  it('should strip milliseconds from output', () => {
    const dateWithMs = new Date('2026-12-31T23:59:59.123Z')
    const result = normalizeExpiry(dateWithMs)

    expect(result).toBe('2026-12-31T23:59:59Z')
    expect(result).not.toContain('.123')
  })

  it('should always output in UTC (Z format)', () => {
    const localDate = new Date('2026-12-31T23:59:59')
    const result = normalizeExpiry(localDate)

    expect(result).toMatch(/Z$/)
  })
})

describe('toBase64UrlWithPadding', () => {
  it('should convert Uint8Array to base64url with padding', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const result = toBase64UrlWithPadding(bytes)

    expect(result).toBe('SGVsbG8=')
  })

  it('should handle empty Uint8Array', () => {
    const bytes = new Uint8Array([])
    const result = toBase64UrlWithPadding(bytes)

    expect(result).toBe('')
  })

  it('should handle single byte', () => {
    const bytes = new Uint8Array([65]) // "A"
    const result = toBase64UrlWithPadding(bytes)

    expect(result).toBe('QQ==')
  })

  it('should use URL-safe characters (- and _)', () => {
    // Test data that would produce + and / in standard base64
    const bytes = new Uint8Array([62, 63, 255]) // Creates >?ÿ which encodes to Pj__
    const result = toBase64UrlWithPadding(bytes)

    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
    expect(result).toMatch(/^[A-Za-z0-9_-]+={0,2}$/)
  })

  it('should maintain proper padding', () => {
    // Test different padding scenarios
    const testCases = [
      {bytes: new Uint8Array([1]), expectedPadding: 2},
      {bytes: new Uint8Array([1, 2]), expectedPadding: 1},
      {bytes: new Uint8Array([1, 2, 3]), expectedPadding: 0},
      {bytes: new Uint8Array([1, 2, 3, 4]), expectedPadding: 2},
    ]

    testCases.forEach(({bytes, expectedPadding}) => {
      const result = toBase64UrlWithPadding(bytes)
      const actualPadding = (result.match(/=/g) || []).length
      expect(actualPadding).toBe(expectedPadding)
    })
  })

  it('should handle typical Ed25519 signature length (64 bytes)', () => {
    // Ed25519 signatures are always 64 bytes
    const signatureBytes = new Uint8Array(64).fill(0)
    const result = toBase64UrlWithPadding(signatureBytes)

    // 64 bytes should encode to 88 characters in base64 with padding
    expect(result.length).toBe(88)
    expect(result).toMatch(/^[A-Za-z0-9_-]+={0,2}$/)
  })

  it('should work in Node.js environment (with Buffer)', () => {
    if (typeof Buffer !== 'undefined') {
      const bytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]) // "Hello World"
      const result = toBase64UrlWithPadding(bytes)

      expect(result).toBe('SGVsbG8gV29ybGQ=')
    }
  })

  it('should produce consistent results for the same input', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const result1 = toBase64UrlWithPadding(bytes)
    const result2 = toBase64UrlWithPadding(bytes)

    expect(result1).toBe(result2)
  })

  it('should handle maximum Uint8Array values', () => {
    const bytes = new Uint8Array([255, 255, 255, 255])
    const result = toBase64UrlWithPadding(bytes)

    expect(result).toBe('_____w==')
  })

  it('should handle binary data correctly', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xfd, 0xfe, 0xff])
    const result = toBase64UrlWithPadding(bytes)

    expect(result).toMatch(/^[A-Za-z0-9_-]+={0,2}$/)
    expect(result.length % 4).toBe(0) // Should be properly padded
  })
})
