import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  base64ToBytes,
  bytesToBase64,
  ed25519SeedFromPkcs8,
  extractPemContents,
  normalizeBase64Url,
  normalizeExpiry,
  toBase64UrlWithPadding,
} from '../src/utils'

describe('base64ToBytes', () => {
  it('should convert base64 string to Uint8Array', () => {
    const base64 = 'SGVsbG8=' // "Hello"
    const result = base64ToBytes(base64)
    const expected = new Uint8Array([72, 101, 108, 108, 111])

    expect(result).toEqual(expected)
  })

  it('should handle empty string', () => {
    const result = base64ToBytes('')
    expect(result).toEqual(new Uint8Array([]))
  })

  it('should handle padded base64', () => {
    const base64 = 'QQ==' // "A"
    const result = base64ToBytes(base64)
    const expected = new Uint8Array([65])

    expect(result).toEqual(expected)
  })

  it('should handle base64 without padding', () => {
    const base64 = 'SGVsbG8gV29ybGQ' // "Hello World" without padding
    const result = base64ToBytes(base64)
    const expected = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])

    expect(result).toEqual(expected)
  })

  it('should handle binary data', () => {
    const base64 = 'AAECAwQFBgc=' // Binary bytes 0-7
    const result = base64ToBytes(base64)
    const expected = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])

    expect(result).toEqual(expected)
  })

  it('should work with both Node.js Buffer and browser atob', () => {
    const base64 = 'dGVzdA==' // "test"
    const result = base64ToBytes(base64)
    const expected = new Uint8Array([116, 101, 115, 116])

    expect(result).toEqual(expected)
  })
})

describe('bytesToBase64', () => {
  it('should convert Uint8Array to base64 string', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const result = bytesToBase64(bytes)
    const expected = 'SGVsbG8='

    expect(result).toBe(expected)
  })

  it('should handle empty array', () => {
    const bytes = new Uint8Array([])
    const result = bytesToBase64(bytes)
    expect(result).toBe('')
  })

  it('should handle single byte', () => {
    const bytes = new Uint8Array([65]) // "A"
    const result = bytesToBase64(bytes)
    expect(result).toBe('QQ==')
  })

  it('should handle binary data', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
    const result = bytesToBase64(bytes)
    expect(result).toBe('AAECAwQFBgc=')
  })

  it('should round-trip with base64ToBytes', () => {
    const originalBytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
    const base64 = bytesToBase64(originalBytes)
    const roundTripBytes = base64ToBytes(base64)

    expect(roundTripBytes).toEqual(originalBytes)
  })

  it('should work with both Node.js Buffer and browser btoa', () => {
    const bytes = new Uint8Array([116, 101, 115, 116]) // "test"
    const result = bytesToBase64(bytes)
    expect(result).toBe('dGVzdA==')
  })
})

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

describe('ed25519SeedFromPkcs8', () => {
  it('should extract 32-byte seed from valid PKCS#8 DER', () => {
    // Create a minimal PKCS#8 structure with a 32-byte OCTET STRING
    const seed = new Uint8Array(32).fill(0x42) // Fill with 0x42 for testing
    const der = new Uint8Array([
      // Some dummy prefix bytes
      0x30,
      0x2e, // SEQUENCE
      0x02,
      0x01,
      0x00, // INTEGER (version)
      // Algorithm identifier (dummy)
      0x30,
      0x05,
      0x06,
      0x03,
      0x2b,
      0x65,
      0x70, // Ed25519 OID
      // The actual OCTET STRING we're looking for
      0x04,
      0x20, // OCTET STRING, length 32
      ...seed, // 32 bytes of 0x42
    ])

    const result = ed25519SeedFromPkcs8(der)
    expect(result).toEqual(seed)
    expect(result.length).toBe(32)
  })

  it('should find the last 32-byte OCTET STRING when multiple exist', () => {
    const firstSeed = new Uint8Array(32).fill(0x11)
    const secondSeed = new Uint8Array(32).fill(0x22)

    const der = new Uint8Array([
      // First OCTET STRING (should be ignored)
      0x04,
      0x20,
      ...firstSeed,
      // Some other data
      0x02,
      0x01,
      0x00,
      // Second OCTET STRING (should be returned)
      0x04,
      0x20,
      ...secondSeed,
    ])

    const result = ed25519SeedFromPkcs8(der)
    expect(result).toEqual(secondSeed)
    expect(result).not.toEqual(firstSeed)
  })

  it('should throw error when no 32-byte OCTET STRING is found', () => {
    const der = new Uint8Array([
      0x30,
      0x2e, // SEQUENCE
      0x02,
      0x01,
      0x00, // INTEGER
      0x04,
      0x10, // OCTET STRING with wrong length (16 instead of 32)
      ...new Uint8Array(16).fill(0x42),
    ])

    expect(() => ed25519SeedFromPkcs8(der)).toThrow('Ed25519 32-byte seed not found in PKCS#8')
  })

  it('should throw error when DER is too short', () => {
    const der = new Uint8Array([0x04, 0x20]) // Tag and length but no data

    expect(() => ed25519SeedFromPkcs8(der)).toThrow('Ed25519 32-byte seed not found in PKCS#8')
  })

  it('should throw error when DER is empty', () => {
    const der = new Uint8Array([])

    expect(() => ed25519SeedFromPkcs8(der)).toThrow('Ed25519 32-byte seed not found in PKCS#8')
  })

  it('should handle OCTET STRING at the very end of the buffer', () => {
    const seed = new Uint8Array(32).fill(0x99)
    const der = new Uint8Array([
      // Some prefix
      0x30,
      0x05,
      // OCTET STRING at the end
      0x04,
      0x20,
      ...seed,
    ])

    const result = ed25519SeedFromPkcs8(der)
    expect(result).toEqual(seed)
  })

  it('should ignore OCTET STRINGs with different lengths', () => {
    const correctSeed = new Uint8Array(32).fill(0xaa)

    const der = new Uint8Array([
      // Wrong length OCTET STRINGs (should be ignored)
      0x04,
      0x10,
      ...new Uint8Array(16).fill(0x11), // 16 bytes
      0x04,
      0x40,
      ...new Uint8Array(64).fill(0x22), // 64 bytes
      // Correct one
      0x04,
      0x20,
      ...correctSeed, // 32 bytes
    ])

    const result = ed25519SeedFromPkcs8(der)
    expect(result).toEqual(correctSeed)
  })
})

describe('extractPemContents', () => {
  it('should extract base64 content from PEM private key', () => {
    const pem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg
AbCdEfGhIjKlMnOpQrStUvWx
-----END PRIVATE KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgAbCdEfGhIjKlMnOpQrStUvWx')
  })

  it('should extract base64 content from PEM public key', () => {
    const pem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE
XYZ123ABC456
-----END PUBLIC KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXYZ123ABC456')
  })

  it('should handle PEM with different key types', () => {
    const pem = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIAbCdEfGhIjKlMnOpQrStUvWx
-----END EC PRIVATE KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('MHcCAQEEIAbCdEfGhIjKlMnOpQrStUvWx')
  })

  it('should remove all whitespace including newlines and spaces', () => {
    const pem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMG  ByqGSM49AgEG
CCqGSM49AwEHBG0wawIBAQQg
  AbCdEfGhIjKlMnOpQrStUvWx  
-----END PRIVATE KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgAbCdEfGhIjKlMnOpQrStUvWx')
    expect(result).not.toContain(' ')
    expect(result).not.toContain('\n')
  })

  it('should handle PEM with Windows line endings', () => {
    const pem = `-----BEGIN PRIVATE KEY-----\r\nMIGHAgEAMBMGByqGSM49AgEG\r\n-----END PRIVATE KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('MIGHAgEAMBMGByqGSM49AgEG')
  })

  it('should handle empty PEM content', () => {
    const pem = `-----BEGIN PRIVATE KEY-----
-----END PRIVATE KEY-----`

    const result = extractPemContents(pem)
    expect(result).toBe('')
  })
})
