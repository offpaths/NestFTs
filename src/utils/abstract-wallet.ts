import { type Address } from "viem"

// Abstract Global Wallet configuration
export const ABSTRACT_CONFIG = {
  appName: "Niftory",
  appDescription: "Twitter/X NFT Inventory Extension",
  appIcon: "https://niftory.app/icon.png", // Replace with actual icon URL
  mainnetChainId: 2741, // Abstract mainnet chain ID
  testnetChainId: 11124, // Abstract testnet chain ID
  mainnetRpcUrl: "https://api.mainnet.abs.xyz",
  testnetRpcUrl: "https://api.testnet.abs.xyz",
  mainnetExplorer: "https://abscan.org",
  testnetExplorer: "https://sepolia.abscan.org"
} as const

export interface AbstractWalletState {
  isConnected: boolean
  address?: Address
  isConnecting: boolean
  isDisconnecting?: boolean
  error?: string
  chainId?: number
}

// Chain detection utilities
export type SupportedChain =
  | "ethereum"
  | "abstract-mainnet"
  | "abstract-testnet"

export function getChainFromId(chainId: number): SupportedChain {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return "ethereum"
    case 2741: // Abstract Mainnet
      return "abstract-mainnet"
    case 11124: // Abstract Testnet
      return "abstract-testnet"
    default:
      console.warn(`Unknown chain ID: ${chainId}, defaulting to ethereum`)
      return "ethereum"
  }
}

export function getChainDisplayName(chain: SupportedChain): string {
  switch (chain) {
    case "ethereum":
      return "Ethereum"
    case "abstract-mainnet":
      return "Abstract Mainnet"
    case "abstract-testnet":
      return "Abstract Testnet"
    default:
      return "Unknown Chain"
  }
}

// Get display name based on actual wallet chain ID
export function getWalletChainDisplayName(chainId: number): string {
  switch (chainId) {
    case 1:
      return "Ethereum Mainnet"
    case 2741:
      return "Abstract Mainnet"
    case 11124:
      return "Abstract Testnet"
    default:
      return `Chain ${chainId}`
  }
}

// Helper to check if chain is Abstract (mainnet or testnet)
export function isAbstractChain(chainId: number): boolean {
  return chainId === 2741 || chainId === 11124
}

// Get NFT fetching strategy based on chain
export function getNFTFetchingChain(chainId: number): SupportedChain {
  switch (chainId) {
    case 1: // Ethereum Mainnet - fetch from ethereum
      return "ethereum"
    case 2741: // Abstract Mainnet - fetch from abstract mainnet
      return "abstract-mainnet"
    case 11124: // Abstract Testnet - fetch from ethereum as fallback
      return "ethereum"
    default:
      return "ethereum"
  }
}

// Utility functions for working with Abstract wallet data
export function isValidAbstractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Store wallet connection state in chrome.storage for persistence
export async function storeWalletConnection(address: Address): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      await chrome.storage.local.set({
        abstractWalletAddress: address,
        abstractWalletConnectedAt: Date.now()
      })
    } catch (error: any) {
      if (error.message?.includes("Extension context invalidated")) {
        console.warn(
          "Extension context invalidated during storage - this is expected during development"
        )
        return
      }
      throw error
    }
  }
}

// Retrieve stored wallet connection
export async function getStoredWalletConnection(): Promise<Address | null> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const result = await chrome.storage.local.get(["abstractWalletAddress"])
      return result.abstractWalletAddress || null
    } catch (error: any) {
      if (error.message?.includes("Extension context invalidated")) {
        console.warn(
          "Extension context invalidated during storage retrieval - this is expected during development"
        )
        return null
      }
      throw error
    }
  }
  return null
}

// Clear stored wallet connection and all related data
export async function clearWalletConnection(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      // Clear wallet connection data
      await chrome.storage.local.remove([
        "abstractWalletAddress",
        "abstractWalletConnectedAt"
      ])

      // Clear any NFT cache data
      const allData = await chrome.storage.local.get(null)
      const keysToRemove = Object.keys(allData || {}).filter(
        (key) => key.startsWith("nft_cache_") || key.startsWith("nftory_")
      )

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove)
        console.debug(
          `Cleared ${keysToRemove.length} cached NFT keys during disconnect`
        )
      }
    } catch (error: any) {
      // Handle extension context invalidation gracefully
      if (error.message?.includes("Extension context invalidated")) {
        console.warn(
          "Extension context invalidated during storage cleanup - this is expected during development"
        )
        return
      }
      throw error
    }
  }
}

// Clear all extension-related cache and data
export async function clearAllExtensionData(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      await chrome.storage.local.clear()
      console.debug("Cleared all extension data")
    } catch (error: any) {
      if (error.message?.includes("Extension context invalidated")) {
        console.warn(
          "Extension context invalidated during full cleanup - this is expected during development"
        )
        return
      }
      throw error
    }
  }
}

// Get Abstract chain configuration for viem/wagmi
export function getAbstractChainConfig(isMainnet: boolean = true) {
  return {
    id: isMainnet
      ? ABSTRACT_CONFIG.mainnetChainId
      : ABSTRACT_CONFIG.testnetChainId,
    name: isMainnet ? "Abstract Mainnet" : "Abstract Testnet",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [
          isMainnet
            ? ABSTRACT_CONFIG.mainnetRpcUrl
            : ABSTRACT_CONFIG.testnetRpcUrl
        ]
      }
    },
    blockExplorers: {
      default: {
        name: "Abstract Explorer",
        url: isMainnet
          ? "https://explorer.mainnet.abs.xyz"
          : "https://explorer.testnet.abs.xyz"
      }
    },
    testnet: !isMainnet
  }
}

// Format address for display (show first 6 and last 4 characters)
export function formatAddress(address: Address): string {
  if (!isValidAbstractAddress(address)) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Error handling utilities for Abstract wallet operations
export function getWalletErrorMessage(error: any): string {
  if (error?.code === 4001) {
    return "User rejected the connection request"
  }

  if (error?.message?.includes("User rejected")) {
    return "Connection was cancelled by user"
  }

  if (error?.message?.includes("network")) {
    return "Network connection error. Please try again."
  }

  return error?.message || "An unexpected error occurred"
}
