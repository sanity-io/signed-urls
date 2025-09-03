/**
 * Normalizes base64url encoding to match Go's standard: Swaps '-' with '_', but
 * maintains '=' padding
 *
 * @internal
 *
 * @param base64 - The base64 string to normalize
 * @returns The normalized base64url string
 */
export function normalizeBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * Normalizes expiry to ISO string format with validation
 *
 * @internal
 *
 * @param expiry - The expiry date to normalize
 * @returns The normalized expiry date as an ISO string, or undefined if invalid
 */
export function normalizeExpiry(expiry: Date | number | string | undefined): string | undefined {
  if (expiry === undefined) {
    return undefined
  }

  let date: Date
  if (expiry instanceof Date) {
    date = expiry
  } else {
    date = new Date(expiry)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid expiry date format')
    }
  }

  const now = new Date()
  if (date.getTime() <= now.getTime()) {
    throw new Error('Expiry date must be in the future')
  }

  // Format as 'YYYY-MM-DDTHH:mm:ssZ' (strip milliseconds)
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Converts buffer to base64url with padding (to match Go's base64.URLEncoding)
 *
 * @internal
 *
 * @param bytes - The buffer to convert
 * @returns The base64url-encoded string
 */
export function toBase64UrlWithPadding(bytes: Uint8Array): string {
  let b64: string

  if (typeof Buffer !== 'undefined') {
    // Node: Uint8Array → Buffer → base64
    b64 = Buffer.from(bytes).toString('base64')
  } else {
    // Browser: Uint8Array → binary string → btoa
    const bin = String.fromCharCode(...bytes)
    b64 = btoa(bin)
  }
  // Ensure padding, although likely unnecessary as an Ed25519 signature is
  // always 64 bytes / 88 chars when encoded in b64
  if (b64.length % 4) b64 += '='.repeat(4 - (b64.length % 4))

  return normalizeBase64Url(b64)
}
