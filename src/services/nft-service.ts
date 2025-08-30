import { Alchemy, Network } from "alchemy-sdk"
import DOMPurify from "dompurify"
import { type Address } from "viem"

import { API_KEYS, getAPIKeyStatus } from "~config/api-keys"
import { formatAddress, isValidAbstractAddress } from "~utils/abstract-wallet"
import { createLogger } from "~utils/logger"
import { TIMING_CONSTANTS, VALIDATION_CONSTANTS } from "~utils/ui-constants"
import { retryNFTFetch } from "~utils/retry-utility"

const log = createLogger('NFTService')

// NFT metadata interface
export interface NFTMetadata {
  id: string
  name: string
  image: string
  description?: string
  collection?: string
  tokenId?: string
  contractAddress?: string
}

// API response interfaces
interface OpenSeaAsset {
  identifier: string
  collection: string
  contract: string
  token_standard: string
  name: string | null
  description: string | null
  image_url: string | null
  display_image_url: string | null
  metadata_url: string | null
}

interface OpenSeaResponse {
  nfts: OpenSeaAsset[]
  next: string | null
}

// Network configurations
type SupportedChain = "ethereum" | "abstract-mainnet" | "abstract-testnet"

interface ChainConfig {
  opensea: {
    baseUrl: string
    chainParam: string
    supportedNatively: boolean
  }
  alchemy?: {
    baseUrl: string
    supportedNatively: boolean
  }
}

const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    opensea: {
      baseUrl: "https://api.opensea.io/api/v2",
      chainParam: "ethereum",
      supportedNatively: true
    },
    alchemy: {
      baseUrl: "https://eth-mainnet.g.alchemy.com/v2",
      supportedNatively: true
    }
  },
  "abstract-mainnet": {
    opensea: {
      baseUrl: "https://api.opensea.io/api/v2",
      chainParam: "ethereum", // OpenSea fallback to ethereum
      supportedNatively: false
    },
    alchemy: {
      baseUrl: "https://abstract-mainnet.g.alchemy.com/v2",
      supportedNatively: true
    }
  },
  "abstract-testnet": {
    opensea: {
      baseUrl: "https://api.opensea.io/api/v2",
      chainParam: "ethereum", // OpenSea doesn't support Abstract testnet yet
      supportedNatively: false
    }
    // Abstract testnet doesn't have native NFT indexers yet
    // For now we'll create mock data or show appropriate message
  }
}

// Configuration using constants
const NFT_API_CONFIG = {
  REQUEST_TIMEOUT: TIMING_CONSTANTS.API_TIMEOUT,
  MAX_NFTS_PER_REQUEST: VALIDATION_CONSTANTS.MAX_NFTS_PER_REQUEST,
  RATE_LIMIT_DELAY: TIMING_CONSTANTS.RATE_LIMIT_DELAY,
  SUPPORTED_IMAGE_FORMATS: VALIDATION_CONSTANTS.SUPPORTED_IMAGE_EXTENSIONS,
  FALLBACK_IMAGE:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='0.3em' fill='%23999'%3ENFT%3C/text%3E%3C/svg%3E"
}

// Request with timeout utility
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    NFT_API_CONFIG.REQUEST_TIMEOUT
  )

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Validate and sanitize image URL
function validateImageUrl(url: string | null): string {
  if (!url) return NFT_API_CONFIG.FALLBACK_IMAGE

  try {
    // Handle IPFS URLs by converting to gateway
    if (url.startsWith('ipfs://')) {
      const ipfsHash = url.replace('ipfs://', '')
      return `https://ipfs.io/ipfs/${ipfsHash}`
    }

    // Handle data URLs (base64 encoded images)
    if (url.startsWith('data:image/')) {
      return url
    }

    const parsedUrl = new URL(url)

    // Allow both HTTP and HTTPS for development/testing, but prefer HTTPS
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      console.warn(`Rejecting URL with unsupported protocol: ${parsedUrl.protocol}`)
      return NFT_API_CONFIG.FALLBACK_IMAGE
    }

    // Check if URL ends with supported image format
    const hasValidExtension = NFT_API_CONFIG.SUPPORTED_IMAGE_FORMATS.some(
      (ext) => parsedUrl.pathname.toLowerCase().endsWith(ext)
    )

    // Accept URLs from known NFT storage providers even without file extensions
    const trustedDomains = VALIDATION_CONSTANTS.TRUSTED_DOMAINS

    const isTrustedDomain = trustedDomains.some((domain) =>
      parsedUrl.hostname.includes(domain)
    )

    // Accept metadata URIs that might contain JSON with image links
    const isMetadataUri = url.includes('/metadata/') || url.includes('.json')

    if (hasValidExtension || isTrustedDomain || isMetadataUri) {
      console.log(`Accepting image URL: ${url}`)
      return url
    }

    console.warn(`Rejecting image URL - not trusted domain or extension: ${url}`)
    return NFT_API_CONFIG.FALLBACK_IMAGE
  } catch (error) {
    console.warn(`Error parsing image URL: ${url}`, error)
    return NFT_API_CONFIG.FALLBACK_IMAGE
  }
}

// Sanitize NFT metadata
function sanitizeNFTMetadata(asset: OpenSeaAsset): NFTMetadata {
  return {
    id: `${asset.contract}-${asset.identifier}`,
    name: DOMPurify.sanitize(asset.name || "Unnamed NFT"),
    description: asset.description
      ? DOMPurify.sanitize(asset.description)
      : undefined,
    image: validateImageUrl(asset.display_image_url || asset.image_url),
    collection: DOMPurify.sanitize(asset.collection || "Unknown Collection"),
    tokenId: asset.identifier,
    contractAddress: asset.contract
  }
}

// Mock NFTs for Abstract testnet (since there's no indexer yet)
function generateMockNFTsForAbstractTestnet(): NFTMetadata[] {
  const testNFTs = [
    {
      id: "abstract-test-demo-1",
      name: "🧪 Demo NFT #1",
      image: createTestNFTImage("Demo NFT", "#667eea", "🎨"),
      description: "This is test data - real NFTs will appear when Abstract testnet indexing becomes available",
      collection: "🧪 Abstract Demo Collection",
      tokenId: "demo-1",
      contractAddress: "0x0000000000000000000000000000000000000000"
    },
    {
      id: "abstract-test-demo-2", 
      name: "🧪 Demo NFT #2",
      image: createTestNFTImage("Demo NFT", "#764ba2", "🎭"),
      description: "This is test data - real NFTs will appear when Abstract testnet indexing becomes available",
      collection: "🧪 Abstract Demo Collection",
      tokenId: "demo-2",
      contractAddress: "0x0000000000000000000000000000000000000000"
    },
    {
      id: "abstract-test-demo-3",
      name: "🧪 Demo NFT #3", 
      image: createTestNFTImage("Demo NFT", "#f093fb", "🚀"),
      description: "This is test data - real NFTs will appear when Abstract testnet indexing becomes available",
      collection: "🧪 Abstract Demo Collection",
      tokenId: "demo-3",
      contractAddress: "0x0000000000000000000000000000000000000000"
    }
  ]
  
  return testNFTs
}

// Helper to create test NFT images with clear indicators
function createTestNFTImage(text: string, color: string, emoji: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:${color};stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23000;stop-opacity:0.3' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23grad)'/%3E%3Ctext x='100' y='80' text-anchor='middle' dy='0.3em' fill='white' font-size='32'%3E${emoji}%3C/text%3E%3Ctext x='100' y='120' text-anchor='middle' dy='0.3em' fill='white' font-size='16' font-weight='bold'%3E${text}%3C/text%3E%3Ctext x='100' y='140' text-anchor='middle' dy='0.3em' fill='rgba(255,255,255,0.8)' font-size='12'%3ETEST DATA%3C/text%3E%3C/svg%3E`
}

// Helper to detect if NFTs contain test/mock data
export function hasTestData(nfts: NFTMetadata[]): boolean {
  return nfts.some(nft => 
    nft.id.includes("test") || 
    nft.id.includes("mock") || 
    nft.id.includes("demo") ||
    nft.name.includes("🧪") ||
    nft.collection?.includes("🧪") ||
    nft.contractAddress === "0x0000000000000000000000000000000000000000"
  )
}

// Helper to count test vs real NFTs
export function getNFTDataInfo(nfts: NFTMetadata[]): { testCount: number; realCount: number; hasTestData: boolean } {
  let testCount = 0
  let realCount = 0
  
  nfts.forEach(nft => {
    if (nft.id.includes("test") || nft.id.includes("mock") || nft.id.includes("demo") ||
        nft.name.includes("🧪") || nft.collection?.includes("🧪") ||
        nft.contractAddress === "0x0000000000000000000000000000000000000000") {
      testCount++
    } else {
      realCount++
    }
  })
  
  return { testCount, realCount, hasTestData: testCount > 0 }
}

// Fetch NFTs from Abstract testnet using available indexers
export async function fetchNFTsFromAbstractTestnet(
  address: Address
): Promise<NFTMetadata[]> {
  if (!isValidAbstractAddress(address)) {
    throw new Error("Invalid wallet address format")
  }

  debugLog(`Fetching real NFTs from Abstract testnet:`, { address })

  // Try multiple potential Abstract testnet NFT APIs
  const apis = [
    // Official Abstract testnet explorer API (if available)
    `https://explorer.testnet.abs.xyz/api/account/${address}/nfts`
    // Alchemy for Abstract testnet (if they support it)
    // Add more APIs as they become available
  ]

  let lastError: any

  for (const apiUrl of apis) {
    try {
      debugLog(`Trying Abstract testnet API: ${apiUrl}`)

      const response = await fetchWithTimeout(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()

      // Process the response - adapt based on actual API structure
      if (data.result || data.nfts || Array.isArray(data)) {
        const nfts = data.result || data.nfts || data
        const processedNFTs = nfts.map((nft: any) => ({
          id: `${nft.contract_address || nft.contractAddress}-${nft.token_id || nft.tokenId}`,
          name: nft.name || `NFT #${nft.token_id || nft.tokenId}`,
          image: validateImageUrl(nft.image || nft.image_url),
          description: nft.description,
          collection:
            nft.collection_name || nft.collection || "Unknown Collection",
          tokenId: nft.token_id || nft.tokenId,
          contractAddress: nft.contract_address || nft.contractAddress
        })) as NFTMetadata[]

        debugLog(
          `Successfully fetched ${processedNFTs.length} NFTs from Abstract testnet`
        )
        return processedNFTs
      }

      // If no NFTs found but API succeeded
      debugLog(`No NFTs found in Abstract testnet wallet`)
      return []
    } catch (error) {
      debugError(`Abstract testnet API ${apiUrl} failed:`, error)
      lastError = error
      continue
    }
  }

  // If all real APIs failed, throw the last error
  debugError(`All Abstract testnet APIs failed, last error:`, lastError)
  throw new Error(
    `Failed to fetch NFTs from Abstract testnet: ${lastError?.message || "All APIs unavailable"}`
  )
}

// Legacy debugging utilities - replaced with proper logger
function debugLog(message: string, data?: any) {
  log.debug(message, data)
}

function debugError(message: string, error?: any) {
  log.error(message, error)
}

// Get API keys from configuration
function getApiKeys() {
  const keys = {
    opensea: API_KEYS.OPENSEA_API_KEY,
    alchemy: API_KEYS.ALCHEMY_ACCESS_TOKEN
  }

  const status = getAPIKeyStatus()
  debugLog("API keys status:", {
    alchemy: status.alchemy ? "✓ Configured (Primary)" : "✗ Missing (Primary)",
    opensea: status.opensea ? "✓ Configured (Fallback)" : "✗ Missing (Fallback)"
  })

  return keys
}

// Fetch NFTs from OpenSea API
export async function fetchNFTsFromOpenSea(
  address: Address,
  chain: SupportedChain = "ethereum"
): Promise<NFTMetadata[]> {
  // Validate address format
  if (!isValidAbstractAddress(address)) {
    throw new Error("Invalid wallet address format")
  }

  const chainConfig = CHAIN_CONFIGS[chain]
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`)
  }

  const { opensea: apiKey } = getApiKeys()
  const url = `${chainConfig.opensea.baseUrl}/chain/${chainConfig.opensea.chainParam}/account/${address}/nfts?limit=${NFT_API_CONFIG.MAX_NFTS_PER_REQUEST}`

  debugLog(`Fetching from OpenSea:`, {
    chain,
    address: formatAddress(address as Address),
    url,
    hasApiKey: !!apiKey,
    nativeSupport: chainConfig.opensea.supportedNatively
  })

  try {
    return await retryNFTFetch(async () => {
      const headers: Record<string, string> = {
        Accept: "application/json"
      }

      // Add API key if available
      if (apiKey) {
        headers["X-API-KEY"] = apiKey
        debugLog("Using OpenSea API key")
      } else {
        debugError("OpenSea API key not configured. Rate limits may apply.")
      }

      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Rate limit exceeded. Please try again later. Consider adding an OpenSea API key."
          )
        }
        if (response.status === 401) {
          throw new Error(
            "OpenSea API authentication failed. Please check your API key."
          )
        }
        if (response.status === 404) {
          return [] // No NFTs found, return empty array
        }

        // Log response for debugging
        const errorText = await response.text().catch(() => "Unknown error")
        debugError(`OpenSea API error ${response.status}:`, { errorText, url })
        throw new Error(`OpenSea API error: ${response.status} - ${errorText}`)
      }

      const data: OpenSeaResponse = await response.json()

      if (!data.nfts || !Array.isArray(data.nfts)) {
        return []
      }

      // Sanitize and validate NFT data
      const validAssets = data.nfts.filter(
        (asset) => asset.identifier && asset.contract
      )
      const sanitizedNFTs = validAssets.map(sanitizeNFTMetadata)
      const finalNFTs = sanitizedNFTs.slice(
        0,
        NFT_API_CONFIG.MAX_NFTS_PER_REQUEST
      )

      debugLog(`OpenSea fetch successful:`, {
        totalReturned: data.nfts.length,
        validAssets: validAssets.length,
        finalCount: finalNFTs.length
      })

      return finalNFTs
    }, "OpenSea", formatAddress(address))
  } catch (error: any) {
    if (error.name === "AbortError") {
      debugError("OpenSea request timeout", { chain, address })
      throw new Error(
        "Request timeout. Please check your connection and try again."
      )
    }

    debugError("OpenSea API fetch error:", {
      error: error.message,
      chain,
      address
    })
    throw new Error(`Failed to fetch NFTs: ${error.message}`)
  }
}

// Fetch NFTs using Alchemy NFT API with Access Token
export async function fetchNFTsFromAlchemy(
  address: Address,
  chain: SupportedChain = "ethereum"
): Promise<NFTMetadata[]> {
  if (!isValidAbstractAddress(address)) {
    throw new Error("Invalid wallet address format")
  }

  const chainConfig = CHAIN_CONFIGS[chain]
  if (!chainConfig?.alchemy) {
    throw new Error(`Alchemy not supported for chain: ${chain}`)
  }

  const { alchemy: accessToken } = getApiKeys()
  if (!accessToken) {
    throw new Error("Alchemy access token not configured")
  }

  // Alchemy NFT API endpoint with access token
  const url = `https://abstract-mainnet.g.alchemy.com/nft/v3/${accessToken}/getNFTsForOwner`

  debugLog("Fetching NFTs from Alchemy NFT API:", {
    address: formatAddress(address),
    chain,
    endpoint: url.replace(accessToken, "xxx...xxx")
  })

  try {
    // Build URL with query parameters
    const params = new URLSearchParams({
      owner: address,
      withMetadata: "true",
      pageSize: NFT_API_CONFIG.MAX_NFTS_PER_REQUEST.toString()
    })

    const fullUrl = `${url}?${params}`

    const response = await fetchWithTimeout(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Alchemy access token authentication failed")
      }
      if (response.status === 429) {
        throw new Error("Alchemy API rate limit exceeded")
      }
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const data = await response.json()

    debugLog(`Alchemy NFT API returned:`, {
      totalCount: data.totalCount || 0,
      ownedNftsLength: data.ownedNfts?.length || 0
    })

    if (!data.ownedNfts || !Array.isArray(data.ownedNfts)) {
      return []
    }

    const processedNFTs = data.ownedNfts
      .map((nft: any) => {
        // Try multiple image sources from Alchemy response
        const possibleImageUrls = [
          nft.image?.cachedUrl,
          nft.image?.originalUrl,
          nft.image?.pngUrl,
          nft.image?.thumbnailUrl,
          nft.media?.[0]?.gateway,
          nft.media?.[0]?.thumbnail,
          nft.media?.[0]?.raw,
          nft.rawMetadata?.image
        ].filter(Boolean)

        debugLog(`Processing NFT ${nft.name || nft.tokenId}:`, {
          availableImages: possibleImageUrls,
          contract: nft.contract?.address,
          tokenId: nft.tokenId
        })

        const imageUrl = possibleImageUrls.find(url => url && url.trim() !== '') || null
        const validatedImage = validateImageUrl(imageUrl)
        
        debugLog(`Image processing for ${nft.name || nft.tokenId}:`, {
          rawImageUrl: imageUrl,
          validatedImage,
          isFallback: validatedImage === NFT_API_CONFIG.FALLBACK_IMAGE
        })

        return {
          id: `${nft.contract?.address}-${nft.tokenId}`,
          name: DOMPurify.sanitize(nft.name || nft.title || `NFT #${nft.tokenId}` || "Unnamed NFT"),
          description: nft.description
            ? DOMPurify.sanitize(nft.description)
            : undefined,
          image: validatedImage,
          collection: DOMPurify.sanitize(
            nft.contract?.name || nft.contract?.symbol || "Unknown Collection"
          ),
          tokenId: nft.tokenId,
          contractAddress: nft.contract?.address
        } as NFTMetadata
      })
      .filter((nft: NFTMetadata) => nft.contractAddress && nft.tokenId)

    debugLog(
      `Successfully processed ${processedNFTs.length} NFTs from Alchemy NFT API`
    )
    return processedNFTs
  } catch (error: any) {
    debugError("Alchemy NFT API fetch error:", error)
    throw new Error(`Failed to fetch NFTs from Alchemy: ${error.message}`)
  }
}

// Enhanced error type for better error handling
export interface NFTFetchError {
  service: "opensea" | "alchemy" | "unknown"
  message: string
  code?: number
  isConfigurationError: boolean
  suggestion?: string
}

function createNFTError(
  service: "opensea" | "alchemy" | "unknown",
  error: any
): NFTFetchError {
  const message = error?.message || "Unknown error occurred"

  // Detect configuration errors
  const isConfigurationError =
    message.includes("API key") ||
    message.includes("authentication") ||
    message.includes("not configured")

  let suggestion: string | undefined
  if (message.includes("Rate limit")) {
    suggestion = "Add an API key to avoid rate limits"
  } else if (message.includes("API key") && service === "opensea") {
    suggestion = "Configure your OpenSea API key in the .env file"
  } else if (message.includes("API key") && service === "alchemy") {
    suggestion = "Configure your Alchemy API key in the .env file"
  } else if (message.includes("not configured") && service === "alchemy") {
    suggestion = "Add your Alchemy API key for better NFT fetching"
  }

  return {
    service,
    message,
    code: error?.code,
    isConfigurationError,
    suggestion
  }
}

// Main NFT fetching function with fallback
export async function fetchUserNFTs(
  address: Address,
  chain: SupportedChain = "ethereum"
): Promise<{ nfts: NFTMetadata[]; errors?: NFTFetchError[] }> {
  const errors: NFTFetchError[] = []

  debugLog(`Starting NFT fetch:`, {
    chain,
    address: formatAddress(address as Address)
  })

  try {
    // Handle Abstract testnet specially
    if (chain === "abstract-testnet") {
      try {
        const nfts = await fetchNFTsFromAbstractTestnet(address)
        debugLog(`Abstract testnet fetch successful: ${nfts.length} NFTs`)
        return { nfts }
      } catch (abstractError) {
        const nftError = createNFTError("unknown", abstractError)
        errors.push(nftError)
        debugError(
          "Abstract testnet real API failed, trying mock fallback:",
          nftError
        )

        // Only show mock NFTs as a last resort for Abstract testnet
        try {
          const mockNFTs = generateMockNFTsForAbstractTestnet()
          debugLog(
            `Returning ${mockNFTs.length} mock NFTs as fallback for Abstract testnet`
          )
          return {
            nfts: mockNFTs,
            errors: [
              ...errors,
              {
                service: "unknown",
                message:
                  "Using test NFTs - Abstract testnet indexer not available yet",
                isConfigurationError: false,
                suggestion:
                  "Real NFTs will appear when Abstract testnet NFT indexing becomes available"
              }
            ]
          }
        } catch (mockError) {
          debugError("Even mock NFT generation failed:", mockError)
          // Continue to try other methods
        }
      }
    }

    // Try Alchemy first for supported chains (it has better rate limits)
    const chainConfig = CHAIN_CONFIGS[chain]
    if (chainConfig?.alchemy) {
      try {
        const nfts = await fetchNFTsFromAlchemy(address, chain)
        debugLog(`Alchemy fetch successful: ${nfts.length} NFTs`)
        return { nfts }
      } catch (alchemyError) {
        const nftError = createNFTError("alchemy", alchemyError)
        errors.push(nftError)
        debugError("Alchemy fetch failed, trying OpenSea fallback:", nftError)
      }
    } else {
      debugLog(`Alchemy not available for ${chain}, trying OpenSea directly`)
    }

    // Fallback to OpenSea
    const nfts = await fetchNFTsFromOpenSea(address, chain)
    debugLog(`OpenSea fallback successful: ${nfts.length} NFTs`)
    return { nfts, errors: errors.length > 0 ? errors : undefined }
  } catch (openSeaError) {
    const openSeaNftError = createNFTError("opensea", openSeaError)
    errors.push(openSeaNftError)
    debugError("OpenSea fallback also failed:", openSeaNftError)
  }

  // Return empty results with all errors
  debugError(`All NFT fetch methods failed for ${chain}:`, errors)
  return { nfts: [], errors }
}

// Cache management for NFT data
type CachedNFTResult = {
  nfts: NFTMetadata[]
  errors?: NFTFetchError[]
  timestamp: number
}

const nftCache = new Map<string, CachedNFTResult>()
const CACHE_DURATION = TIMING_CONSTANTS.NFT_CACHE_DURATION

export async function fetchUserNFTsWithCache(
  address: Address,
  chain: SupportedChain = "ethereum"
): Promise<{
  nfts: NFTMetadata[]
  errors?: NFTFetchError[]
  fromCache?: boolean
}> {
  const cacheKey = `${chain}-${address.toLowerCase()}`
  const cached = nftCache.get(cacheKey)

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      nfts: cached.nfts,
      errors: cached.errors,
      fromCache: true
    }
  }

  const result = await fetchUserNFTs(address, chain)

  // Only cache successful results or results with non-critical errors
  if (
    result.nfts.length > 0 ||
    !result.errors?.some((e) => e.isConfigurationError)
  ) {
    nftCache.set(cacheKey, {
      nfts: result.nfts,
      errors: result.errors,
      timestamp: Date.now()
    })
  }

  // If no fresh data and we have expired cache, return it with warning
  if (result.nfts.length === 0 && cached) {
    return {
      nfts: cached.nfts,
      fromCache: true,
      errors: [...(result.errors || []), ...(cached.errors || [])]
    }
  }

  return result
}

// Clear cache for specific address and chain
export function clearNFTCache(address?: Address, chain?: SupportedChain): void {
  if (address && chain) {
    const cacheKey = `${chain}-${address.toLowerCase()}`
    nftCache.delete(cacheKey)
  } else if (address) {
    // Clear all chains for this address
    const addressLower = address.toLowerCase()
    for (const key of nftCache.keys()) {
      if (key.endsWith(`-${addressLower}`)) {
        nftCache.delete(key)
      }
    }
  } else {
    nftCache.clear()
  }
}
