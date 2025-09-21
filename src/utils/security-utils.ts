// Security utilities for common validation and sanitization tasks

/**
 * Validates a URL for security, preventing access to private networks
 * @param url - The URL to validate
 * @throws Error if URL is invalid or points to private network
 */
export function validatePublicUrl(url: string): void {
  const urlObj = new URL(url)

  // Only allow HTTP/HTTPS protocols
  if (!["http:", "https:"].includes(urlObj.protocol)) {
    throw new Error("Invalid URL protocol - only HTTP/HTTPS allowed")
  }

  // Prevent access to private IP ranges and localhost
  const hostname = urlObj.hostname.toLowerCase()
  const privateIpRanges = [
    '127.', '10.', '192.168.', '169.254.',
    // RFC 1918 private ranges
    '172.16.', '172.17.', '172.18.', '172.19.', '172.20.',
    '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
    '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'
  ]

  if (hostname === 'localhost' || privateIpRanges.some(range => hostname.startsWith(range))) {
    throw new Error("Access to private networks is not allowed")
  }
}

/**
 * Sanitizes a filename to be safe for file operations
 * @param filename - The filename to sanitize
 * @returns A safe filename with only alphanumeric characters and underscores
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255)
}

/**
 * Validates file input elements and their containers
 * @param element - The file input element to validate
 * @returns True if the file input is valid and safe to use
 */
export function validateFileInput(element: HTMLInputElement): boolean {
  if (!element || element.type !== 'file') return false
  if (!element.isConnected) return false
  if (element.disabled) return false
  return true
}

/**
 * Creates a secure random ID using crypto.getRandomValues
 * @param length - Length of the ID (default: 16)
 * @returns A secure random string
 */
export function createSecureId(length: number = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validates that an element is not in a potentially malicious context
 * @param element - The DOM element to validate
 * @returns True if the element appears to be in a safe context
 */
export function validateElementContext(element: Element): boolean {
  // Check if element is in a secure iframe or has suspicious attributes
  const suspiciousAttributes = ['data-malicious', 'onclick', 'onload', 'onerror']
  for (const attr of suspiciousAttributes) {
    if (element.hasAttribute(attr)) return false
  }

  // Check for suspicious parent elements
  let parent = element.parentElement
  while (parent) {
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'IFRAME') {
      return false
    }
    parent = parent.parentElement
  }

  return true
}