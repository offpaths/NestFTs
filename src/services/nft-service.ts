import { Alchemy, Network } from "alchemy-sdk"
import DOMPurify from "dompurify"
import { type Address } from "viem"

import { API_KEYS, getAPIKeyStatus } from "~config/api-keys"
import { formatAddress, isValidAbstractAddress } from "~utils/abstract-wallet"

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

// Configuration
const NFT_API_CONFIG = {
  REQUEST_TIMEOUT: 15000,
  MAX_NFTS_PER_REQUEST: 50,
  RATE_LIMIT_DELAY: 1000,
  SUPPORTED_IMAGE_FORMATS: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
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
    const trustedDomains = [
      "ipfs.io",
      "gateway.pinata.cloud",
      "cloudflare-ipfs.com",
      "i.seadn.io",
      "openseauserdata.com",
      "nft-cdn.alchemy.com",
      "res.cloudinary.com",
      "arweave.net",
      "gateway.arweave.net",
      "gateway.ipfs.io",
      "api.alchemy.com"
    ]

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
  return [
    {
      id: "abstract-mock-1",
      name: "Abstract Test NFT #1",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23667eea'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='white' font-size='24'%3ETest NFT%3C/text%3E%3C/svg%3E",
      description: "A test NFT for Abstract testnet",
      collection: "Abstract Test Collection",
      tokenId: "1",
      contractAddress: "0x1234567890123456789012345678901234567890"
    },
    {
      id: "abstract-mock-2",
      name: "Abstract Test NFT #2",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23764ba2'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='white' font-size='24'%3ETest NFT%3C/text%3E%3C/svg%3E",
      description: "Another test NFT for Abstract testnet",
      collection: "Abstract Test Collection",
      tokenId: "2",
      contractAddress: "0x1234567890123456789012345678901234567890"
    }
  ]
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

// Debugging utilities
const DEBUG = process.env.NODE_ENV === "development"

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[NFT Service] ${message}`, data || "")
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG) {
    console.error(`[NFT Service] ${message}`, error || "")
  } else {
    console.warn(`[NFT Service] ${message}`)
  }
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
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
