import React from "react"
import { AbstractWalletProvider } from "@abstract-foundation/agw-react"
import { QueryClient } from "@tanstack/react-query"
import type { Chain } from "viem"

interface AGWProviderProps {
  children: React.ReactNode
}

// Abstract Mainnet Chain Configuration
const abstractMainnet: Chain = {
  id: 2741,
  name: 'Abstract Mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://api.mainnet.abs.xyz'],
      webSocket: ['wss://api.mainnet.abs.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Abstract Explorer',
      url: 'https://abscan.org',
      apiUrl: 'https://api.abscan.org/api',
    },
  },
  contracts: {},
}

// Create a single QueryClient instance to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

// Provider wrapper component for Abstract Global Wallet
export function AGWProvider({ children }: AGWProviderProps): JSX.Element {
  return (
    <AbstractWalletProvider chain={abstractMainnet} queryClient={queryClient}>
      {children}
    </AbstractWalletProvider>
  )
}