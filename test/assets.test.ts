import {describe, expect, it} from 'vitest'

import type {SigningOptions} from '../src/types'

import {generateSignature, signAssetUrl} from '../src/assets'

const baseUrl = 'https://cdn.sanity.io/images/project/dataset/image-id-100x100.jpg'
const TEST_PRIVATE_KEY = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'
const TEST_KEY_ID = 'test-key-id'
const TEST_EXPIRY = '2026-12-31T23:59:59Z'

describe('generateSignature', () => {
  it('should generate a consistent signature for the same URL and private key', () => {
    const signature1 = generateSignature(baseUrl, TEST_PRIVATE_KEY)
    const signature2 = generateSignature(baseUrl, TEST_PRIVATE_KEY)

    expect(signature1).toBe(signature2)
  })

  it('should generate different signatures for different base URLs', () => {
    const url1 = baseUrl
    const url2 = 'https://cdn.sanity.io/images/project/dataset/other-image-id-100x100.jpg'

    const signature1 = generateSignature(url1, TEST_PRIVATE_KEY)
    const signature2 = generateSignature(url2, TEST_PRIVATE_KEY)

    expect(signature1).not.toBe(signature2)
  })

  it('should generate different signatures for different param orders', () => {
    const url1 = `${baseUrl}?a=1&b=2`
    const url2 = `${baseUrl}?b=2&a=1`

    const signature1 = generateSignature(url1, TEST_PRIVATE_KEY)
    const signature2 = generateSignature(url2, TEST_PRIVATE_KEY)

    expect(signature1).not.toBe(signature2)
  })

  it('should generate different signatures for different private keys', () => {
    const privateKey1 = TEST_PRIVATE_KEY
    const privateKey2 = '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb'

    const signature1 = generateSignature(baseUrl, privateKey1)
    const signature2 = generateSignature(baseUrl, privateKey2)

    expect(signature1).not.toBe(signature2)
  })

  it('should match the Base64url format', () => {
    const signature1 = generateSignature(baseUrl, TEST_PRIVATE_KEY)

    expect(signature1).toMatch(/^[A-Za-z0-9_-]+={0,2}$/) // Base64url format with optional padding
  })

  it('should handle URL objects', () => {
    const urlObject = new URL(baseUrl)

    const signature1 = generateSignature(baseUrl, TEST_PRIVATE_KEY)
    const signature2 = generateSignature(urlObject, TEST_PRIVATE_KEY)

    expect(signature1).toBe(signature2)
  })

  it('should handle URLs with query parameters', () => {
    const url = `${baseUrl}?w=200&h=300`

    const signature = generateSignature(url, TEST_PRIVATE_KEY)

    expect(signature).toBeDefined()
  })

  it('should throw an error for invalid private key', () => {
    const invalidKey = 'invalid-key'

    expect(() => generateSignature(baseUrl, invalidKey)).toThrow()
  })

  it('should throw for non-hex private key', () => {
    expect(() => generateSignature(baseUrl, 'zz')).toThrow(/hex/i)
  })

  it('should throw for wrong-length private key', () => {
    expect(() => generateSignature(baseUrl, 'ab'.repeat(10))).toThrow(/32/i)
  })
})

describe('signAssetUrl', () => {
  it('should add keyid, expiry, and signature to the URL', () => {
    const options: SigningOptions = {
      expiry: new Date(TEST_EXPIRY),
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(baseUrl, options)
    const parsedUrl = new URL(signedUrl)

    expect(parsedUrl.searchParams.get('keyid')).toBe(TEST_KEY_ID)
    expect(parsedUrl.searchParams.get('expiry')).toBe(TEST_EXPIRY)
    expect(parsedUrl.searchParams.get('signature')).toBeTruthy()
  })

  it('should serialize Date expiries in UTC (Z)', () => {
    const localDate = new Date('2026-12-31T23:59:59') // no Z
    const out = new URL(
      signAssetUrl(baseUrl, {
        expiry: localDate,
        keyId: TEST_KEY_ID,
        privateKey: TEST_PRIVATE_KEY,
      }),
    )
    expect(out.searchParams.get('expiry')).toMatch(/Z$/)
  })

  it('should work without expiry parameter', () => {
    const options: SigningOptions = {
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(baseUrl, options)
    const parsedUrl = new URL(signedUrl)

    expect(parsedUrl.searchParams.get('keyid')).toBe(TEST_KEY_ID)
    expect(parsedUrl.searchParams.get('expiry')).toBeNull()
    expect(parsedUrl.searchParams.get('signature')).toBeTruthy()
  })

  it('should handle string expiry dates', () => {
    const options: SigningOptions = {
      expiry: TEST_EXPIRY,
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(baseUrl, options)
    const parsedUrl = new URL(signedUrl)

    expect(parsedUrl.searchParams.get('expiry')).toBe(TEST_EXPIRY)
  })

  it('should preserve existing query parameters', () => {
    const urlWithParams = baseUrl + '?w=200&h=300&format=webp'
    const options: SigningOptions = {
      expiry: new Date(TEST_EXPIRY),
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(urlWithParams, options)
    const parsedUrl = new URL(signedUrl)

    expect(parsedUrl.searchParams.get('w')).toBe('200')
    expect(parsedUrl.searchParams.get('h')).toBe('300')
    expect(parsedUrl.searchParams.get('format')).toBe('webp')
    expect(parsedUrl.searchParams.get('keyid')).toBe(TEST_KEY_ID)
    expect(parsedUrl.searchParams.get('expiry')).toBe(TEST_EXPIRY)
    expect(parsedUrl.searchParams.get('signature')).toBeTruthy()
  })

  it('should handle URL objects', () => {
    const urlObject = new URL(baseUrl)
    const options: SigningOptions = {
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(urlObject, options)

    expect(signedUrl).toContain('keyid=')
    expect(signedUrl).toContain('signature=')
  })

  it('should generate different signatures for different keyIds', () => {
    const options1: SigningOptions = {
      keyId: 'key1',
      privateKey: TEST_PRIVATE_KEY,
    }
    const options2: SigningOptions = {
      keyId: 'key2',
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl1 = signAssetUrl(baseUrl, options1)
    const signedUrl2 = signAssetUrl(baseUrl, options2)

    const signature1 = new URL(signedUrl1).searchParams.get('signature')
    const signature2 = new URL(signedUrl2).searchParams.get('signature')

    expect(signature1).not.toBe(signature2)
  })

  it('should generate different signatures for different expiry dates', () => {
    const expiry1 = new Date(TEST_EXPIRY)

    const expiry2 = new Date(expiry1.getTime())
    expiry2.setUTCFullYear(expiry2.getUTCFullYear() + 1)

    const options1: SigningOptions = {
      expiry: expiry1,
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }
    const options2: SigningOptions = {
      expiry: expiry2,
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl1 = signAssetUrl(baseUrl, options1)
    const signedUrl2 = signAssetUrl(baseUrl, options2)

    const signature1 = new URL(signedUrl1).searchParams.get('signature')
    const signature2 = new URL(signedUrl2).searchParams.get('signature')

    expect(signature1).not.toBe(signature2)
  })

  it('should sign the URL including all query parameters', () => {
    // This test ensures that the signature is calculated over the full URL
    // including the keyid and expiry parameters
    const options: SigningOptions = {
      expiry: new Date(TEST_EXPIRY),
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }

    const signedUrl = signAssetUrl(baseUrl, options)
    const parsedUrl = new URL(signedUrl)

    // Create the URL that was actually signed (without the signature parameter)
    const urlForSigning = new URL(baseUrl)
    urlForSigning.searchParams.set('keyid', TEST_KEY_ID)
    urlForSigning.searchParams.set('expiry', TEST_EXPIRY)

    const expectedSignature = generateSignature(urlForSigning.toString(), TEST_PRIVATE_KEY)
    const actualSignature = parsedUrl.searchParams.get('signature')

    expect(actualSignature).toBe(expectedSignature)
  })

  it('should overwrite an existing signature param', () => {
    const url = `${baseUrl}?signature=abc`
    const options: SigningOptions = {
      keyId: TEST_KEY_ID,
      privateKey: TEST_PRIVATE_KEY,
    }
    const out = new URL(signAssetUrl(url, options))

    expect(out.searchParams.getAll('signature').length).toBe(1)
    expect(out.searchParams.get('signature')).not.toBe('abc')
  })

  it('should not mutate a passed URL object', () => {
    const url = new URL(baseUrl)
    const snapshot = url.toString()

    signAssetUrl(url, {keyId: TEST_KEY_ID, privateKey: TEST_PRIVATE_KEY})

    expect(url.toString()).toBe(snapshot)
  })
})
