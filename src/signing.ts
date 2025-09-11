import {etc, hashes, sign} from '@noble/ed25519'
import {sha512} from '@noble/hashes/sha2'

import type {SigningOptions} from './types'

import {normalizeExpiry, toBase64UrlWithPadding} from './utils'

hashes.sha512 = sha512

/**
 * Generates an Ed25519 signature for a given URL.
 *
 * @public
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
 * Signs a URL with Ed25519 signature, adding keyid, expiry, and signature parameters.
 *
 * @public
 * @param url - The URL to sign
 * @param options - The signing options to use
 * @returns The signed URL
 */
export function signUrl(url: string | URL, options: SigningOptions): string {
  const {expiry, keyId, privateKey} = options
  const baseUrl = new URL(url)
  // Remove existing params to ensure new ones are added in the correct order.
  baseUrl.searchParams.delete('keyid')
  baseUrl.searchParams.delete('expiry')
  baseUrl.searchParams.delete('signature')

  // Append the signing specific parameters. `set` or `append` after `delete`
  // will have the same effect, but use `append` to be explicit.
  baseUrl.searchParams.append('keyid', keyId)
  const expiryStr = normalizeExpiry(expiry)
  if (expiryStr) {
    baseUrl.searchParams.append('expiry', expiryStr)
  }
  const signature = generateSignature(baseUrl, privateKey)
  baseUrl.searchParams.append('signature', signature)

  return baseUrl.toString()
}
