import {etc, hashes, sign} from '@noble/ed25519'
import {sha512} from '@noble/hashes/sha2.js'

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
  // Get the URL with signing parameters (keyid and expiry)
  const urlWithParams = urlWithSigningParams(url, {expiry, keyId})
  // Generate a signature from the full URL with the new parameters
  const signature = generateSignature(urlWithParams, privateKey)
  // Append the signature using string concatenation instead of URLSearchParams
  // to ensure the signature is not URL-encoded (e.g. '=' to '%3D')
  const urlWithSignature = `${urlWithParams.toString()}&signature=${signature}`
  return urlWithSignature
}

/**
 * Returns a ready-to-sign URL object with signing parameters (keyid and optional expiry).
 *
 * @public
 * @param url - The base URL to which signing parameters will be added
 * @param options - The signing options containing keyId and optional expiry
 * @returns A URL object with keyid and expiry parameters added
 */
export function urlWithSigningParams(
  url: string | URL,
  options: Omit<SigningOptions, 'privateKey'>,
): URL {
  const {expiry, keyId} = options
  const urlObj = new URL(url)
  // Remove existing params to ensure new ones are added in the correct order.
  urlObj.searchParams.delete('keyid')
  urlObj.searchParams.delete('expiry')
  urlObj.searchParams.delete('signature')

  // Append the signing specific parameters. `set` or `append` after `delete`
  // will have the same effect, but use `append` to be explicit.
  urlObj.searchParams.append('keyid', keyId)
  const expiryStr = normalizeExpiry(expiry)
  if (expiryStr) {
    urlObj.searchParams.append('expiry', expiryStr)
  }

  return urlObj
}
