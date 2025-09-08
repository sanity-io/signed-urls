import {describe, expect, it} from 'vitest'

import {pemToEd25519Bytes, pemToEd25519Hex} from '../src/pem'

describe('pemToEd25519Bytes', () => {
  // Real Ed25519 PKCS#8 key for testing
  const validPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILdwg3pZ3Qx1ZGUHyqL9U6ZwAa8cVbN9xHuGkF8J2mKq
-----END PRIVATE KEY-----`

  it('should extract a 32-byte seed from a valid Ed25519 PEM private key', () => {
    const result = pemToEd25519Bytes(validPem)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('should handle PEM with Windows line endings', () => {
    const pem = `-----BEGIN PRIVATE KEY-----\r\nMC4CAQAwBQYDK2VwBCIEILdwg3pZ3Qx1ZGUHyqL9U6ZwAa8cVbN9xHuGkF8J2mKq\r\n-----END PRIVATE KEY-----`

    const result = pemToEd25519Bytes(pem)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('should handle PEM with multiple lines of base64 content', () => {
    const pem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIE
ILdwg3pZ3Qx1ZGUHyqL9
U6ZwAa8cVbN9xHuGkF8J
2mKq
-----END PRIVATE KEY-----`

    const result = pemToEd25519Bytes(pem)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('should throw error for PEM with invalid base64 content', () => {
    const invalidPem = `-----BEGIN PRIVATE KEY-----
InvalidBase64Content!!!
-----END PRIVATE KEY-----`

    expect(() => pemToEd25519Bytes(invalidPem)).toThrow()
  })

  it('should throw an error for PEM without Ed25519 seed', () => {
    // A completely different key type that doesn't have the PKCS#8 Ed25519 structure
    const invalidPem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgxyz
-----END PRIVATE KEY-----`

    expect(() => pemToEd25519Bytes(invalidPem)).toThrow('Ed25519 32-byte seed not found in PKCS#8')
  })

  it('should throw an error for empty PEM content', () => {
    const emptyPem = `-----BEGIN PRIVATE KEY-----
-----END PRIVATE KEY-----`

    expect(() => pemToEd25519Bytes(emptyPem)).toThrow()
  })

  it('should handle all-zero seed', () => {
    // Ed25519 key with all-zero seed
    const pem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END PRIVATE KEY-----`

    const result = pemToEd25519Bytes(pem)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
    expect(result).toEqual(new Uint8Array(32).fill(0))
  })

  it('should handle all-FF seed', () => {
    // Ed25519 key with all-FF seed
    const pem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIP//////////////////////////////////////////
-----END PRIVATE KEY-----`

    const result = pemToEd25519Bytes(pem)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
    expect(result).toEqual(new Uint8Array(32).fill(0xff))
  })
})

describe('pemToEd25519Hex', () => {
  const validPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILdwg3pZ3Qx1ZGUHyqL9U6ZwAa8cVbN9xHuGkF8J2mKq
-----END PRIVATE KEY-----`

  it('should convert PEM to lowercase hex string', () => {
    const result = pemToEd25519Hex(validPem)

    expect(typeof result).toBe('string')
    expect(result.length).toBe(64) // 32 bytes = 64 hex characters
    expect(result).toMatch(/^[0-9a-f]{64}$/) // Only lowercase hex characters
  })

  it('should handle different Ed25519 keys', () => {
    const pem1 = validPem

    const pem2 = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END PRIVATE KEY-----`

    const result1 = pemToEd25519Hex(pem1)
    const result2 = pemToEd25519Hex(pem2)

    expect(result1).not.toBe(result2)
    expect(result1.length).toBe(64)
    expect(result2.length).toBe(64)
  })

  it('should round-trip with pemToEd25519Bytes', () => {
    const bytes = pemToEd25519Bytes(validPem)
    const hex = pemToEd25519Hex(validPem)

    // Convert hex back to bytes and compare
    const hexBytes = new Uint8Array(hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)))

    expect(hexBytes).toEqual(bytes)
  })

  it('should throw error for invalid PEM', () => {
    const invalidPem = `-----BEGIN PRIVATE KEY-----
InvalidBase64Content!!!
-----END PRIVATE KEY-----`

    expect(() => pemToEd25519Hex(invalidPem)).toThrow()
  })
})
