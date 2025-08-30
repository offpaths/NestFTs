// Enhanced retry utility for better error handling

import { createLogger } from "./logger"
import { TIMING_CONSTANTS } from "./ui-constants"

const log = createLogger('RetryUtility')

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface RetryError extends Error {
  attempts: number
  lastError: any
  isRetryable: boolean
}

// Default retry conditions
const defaultShouldRetry = (error: any): boolean => {
  // Network errors that are often temporary
  if (error.name === 'AbortError') return false // Don't retry timeouts
  if (error.message?.includes('Rate limit')) return true
  if (error.message?.includes('timeout')) return true
  if (error.message?.includes('network')) return true
  if (error.message?.includes('fetch')) return true
  
  // HTTP status codes that should be retried
  if (error.status === 429) return true // Rate limit
  if (error.status === 502) return true // Bad Gateway
  if (error.status === 503) return true // Service Unavailable
  if (error.status === 504) return true // Gateway Timeout
  if (error.status >= 500 && error.status < 600) return true // Server errors
  
  return false
}

// Exponential backoff delay calculation
const calculateDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
  // Add some jitter to prevent thundering herd
  return delay + Math.random() * 1000
}

// Sleep utility
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Main retry function
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = TIMING_CONSTANTS.RETRY_MAX_ATTEMPTS,
    baseDelay = TIMING_CONSTANTS.RETRY_DELAY_BASE,
    maxDelay = 30000, // Max 30 seconds
    shouldRetry = defaultShouldRetry,
    onRetry
  } = options

  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation()
      if (attempt > 1) {
        log.debug(`Operation succeeded after ${attempt} attempts`)
      }
      return result
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        log.error(`Operation failed after ${maxAttempts} attempts`, error)
        break
      }
      
      // Check if error should be retried
      if (!shouldRetry(error)) {
        log.debug('Error is not retryable, stopping attempts', error)
        break
      }
      
      // Calculate delay and notify about retry
      const delay = calculateDelay(attempt, baseDelay, maxDelay)
      log.debug(`Attempt ${attempt} failed, retrying in ${delay}ms`, error)
      
      if (onRetry) {
        onRetry(attempt, error)
      }
      
      await sleep(delay)
    }
  }
  
  // Create comprehensive error
  const retryError: RetryError = Object.assign(
    new Error(`Operation failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`),
    {
      attempts: maxAttempts,
      lastError,
      isRetryable: shouldRetry(lastError)
    }
  )
  
  throw retryError
}

// Specialized retry for API calls
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  serviceName: string,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(apiCall, {
    ...options,
    onRetry: (attempt, error) => {
      log.warn(`${serviceName} API call failed (attempt ${attempt})`, error)
      options.onRetry?.(attempt, error)
    }
  })
}

// Specialized retry for NFT fetching
export async function retryNFTFetch<T>(
  fetchOperation: () => Promise<T>,
  provider: string,
  address?: string
): Promise<T> {
  return retryApiCall(fetchOperation, `NFT-${provider}`, {
    shouldRetry: (error) => {
      // Don't retry authentication errors - they need config fixes
      if (error.message?.includes('authentication')) return false
      if (error.message?.includes('API key')) return false
      if (error.message?.includes('Unauthorized')) return false
      
      return defaultShouldRetry(error)
    },
    onRetry: (attempt, error) => {
      log.warn(`Retrying NFT fetch from ${provider} for ${address} (attempt ${attempt})`, error)
    }
  })
}