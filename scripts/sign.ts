import * as fs from 'fs'
import * as path from 'path'

import {generateSignature, pemToEd25519Hex, signUrl, urlWithSigningParams} from '../src/index'

/**
 * Script to generate signature information from a PEM file
 *
 * Usage: npm run sign <path-to-pem-file> <url-to-sign> <key-id> [expiry]
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.error('Usage: npm run sign <path-to-pem-file> <url-to-sign> <key-id> [expiry]')
    console.error('Examples:')
    console.error('  npm run sign ./private-key.pem "https://example.com/api/resource" "my-key-id"')
    console.error(
      '  npm run sign ./private-key.pem "https://example.com/api/resource" "my-key-id" "2025-12-31T23:59:59Z"',
    )
    process.exit(1)
  }
  const [pemPath, urlToSign, keyId, expiry] = args

  try {
    // Check if PEM file exists
    if (!fs.existsSync(pemPath)) {
      console.error(`Error: PEM file not found: ${pemPath}`)
      process.exit(1)
    }

    // Read the PEM file
    const pemContent = fs.readFileSync(pemPath, 'utf8')
    console.info(`📂 Successfully loaded existing keys from ${path.join(pemPath)}`)

    // Convert PEM to Ed25519 hex private key
    if (!keyId) {
      console.error('Error: No keyId provided.')
      process.exit(1)
    }

    const privateKeyHex = pemToEd25519Hex(pemContent)

    const fullUrl = urlWithSigningParams(urlToSign, {expiry, keyId})
    const signature = generateSignature(fullUrl, privateKeyHex)
    const signedUrl = signUrl(urlToSign, {
      expiry,
      keyId,
      privateKey: privateKeyHex,
    })

    console.info('🔑 Signing URL with Ed25519 Key')
    console.info('   ✅ URL signed successfully')
    console.info(`   📋 Original URL: ${fullUrl}`)
    console.info(`   ⏰ Expires at: ${expiry ?? 'never'}`)
    console.info(`   🔑 Signature: ${signature}`)
    console.info(`   🌐 Signed URL: ${signedUrl}`)
  } catch (error) {
    console.error(
      'Error generating signature:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
