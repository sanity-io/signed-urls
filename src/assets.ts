import {etc, hashes, sign} from '@noble/ed25519'
import {sha512} from '@noble/hashes/sha2'

import type {SigningOptions} from './types'

import {normalizeExpiry, toBase64UrlWithPadding} from './utils'

hashes.sha512 = sha512

/**
 * Gets the signature for a given URL
 *
 * @public
 *
 * @param url - The URL to sign
 * @param privateKey - The private key to use for signing
 * @returns The base64url-encoded signature
 */
export function generateSignature(url: string | URL, privateKey: string): string {
  const urlStr = url.toString()
  // Encode the URL as bytes
  const urlBytes = new TextEncoder().encode(urlStr)
  // Encode the private key as bytes
  const privateKeyBytes = etc.hexToBytes(privateKey)
  // Get the signed URL as bytes
  const signatureBytes = sign(urlBytes, privateKeyBytes)
  // Convert the signature to a URL-safe base64 string
  return toBase64UrlWithPadding(signatureBytes)
}

/**
 *
 * Signs a URL for a Sanity asset
 *
 * @public
 *
 * @param url - The Sanity asset URL to sign
 * @param options - The signing options to use
 * @returns The signed URL
 */
export function signAssetUrl(url: string | URL, options: SigningOptions): string {
  const {expiry, keyId, privateKey} = options
  const baseUrl = new URL(url)
  // Append keyid
  baseUrl.searchParams.set('keyid', keyId)
  // Append expiry, if present
  const expiryStr = normalizeExpiry(expiry)
  if (expiryStr) {
    baseUrl.searchParams.set('expiry', expiryStr)
  }
  // Append signature
  const signature = generateSignature(baseUrl, privateKey)
  baseUrl.searchParams.set('signature', signature)
  // Return as a string
  return baseUrl.toString()
}
