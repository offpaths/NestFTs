import { useEffect, useState } from "react"
import { useLoginWithAbstract, useAbstractClient } from "@abstract-foundation/agw-react"
import { type Address } from "viem"
import {
  type AbstractWalletState,
  type SupportedChain,
  storeWalletConnection,
  getStoredWalletConnection,
  clearWalletConnection,
  getWalletErrorMessage,
  getChainFromId
} from "~utils/abstract-wallet"

interface UseAbstractWalletReturn extends AbstractWalletState {
  login: () => Promise<void>
  logout: () => Promise<void>
  reconnect: () => Promise<void>
  chain?: SupportedChain
  chainId?: number
}

export function useAbstractWallet(): UseAbstractWalletReturn {
  const [state, setState] = useState<AbstractWalletState>({
    isConnected: false,
    isConnecting: false
  })

  // Use Abstract's native login hook with enhanced options
  const { 
    login: agwLogin, 
    logout: agwLogout,
    isConnecting: agwIsConnecting 
  } = useLoginWithAbstract()
  
  // Use Abstract's client hook to get wallet info
  const { data: client } = useAbstractClient()

  // Check for stored connection on mount
  useEffect(() => {
    const checkStoredConnection = async () => {
      try {
        const storedAddress = await getStoredWalletConnection()
        if (storedAddress && client?.account?.address) {
          const chainId = client?.chain?.id
          setState({
            isConnected: true,
            address: client.account.address as Address,
            chainId,
            isConnecting: false
          })
        }
      } catch (error) {
        console.error("Failed to check stored connection:", error)
      }
    }

    checkStoredConnection()
  }, [client])

  // Update state when client connection changes
  useEffect(() => {
    if (client?.account?.address) {
      const address = client.account.address as Address
      const chainId = client?.chain?.id
      
      console.log('[Wallet Hook] Client connected:', {
        address,
        chainId,
        chainName: client?.chain?.name
      })
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId,
        isConnecting: false,
        error: undefined
      }))
      
      // Store connection for persistence
      storeWalletConnection(address).catch(console.error)
    } else if (state.isConnected && !state.isConnecting) {
      // Client disconnected
      setState(prev => ({
        ...prev,
        isConnected: false,
        address: undefined,
        chainId: undefined
      }))
    }
  }, [client?.account?.address, client?.chain?.id, state.isConnected, state.isConnecting])

  // Login function using Abstract's native popup with enhanced UX
  const login = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: undefined }))
      
      console.log('[Abstract Login] Starting login process...')
      
      // This will trigger Abstract's native login popup
      // The popup will handle wallet selection, account creation, etc.
      await agwLogin()
      
      console.log('[Abstract Login] Login successful')
      // The useEffect above will handle the state update when client connects
    } catch (error: any) {
      console.error('[Abstract Login] Login failed:', error)
      
      const errorMessage = getWalletErrorMessage(error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }))
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Use Abstract's native logout function
      agwLogout()
      
      // Clear stored connection
      await clearWalletConnection()
      
      // Reset state
      setState({
        isConnected: false,
        isConnecting: false
      })
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  // Reconnect function for retry scenarios
  const reconnect = async (): Promise<void> => {
    await login()
  }

  const detectedChain = state.chainId ? getChainFromId(state.chainId) : undefined
  
  // Debug chain detection
  if (state.isConnected && process.env.NODE_ENV === 'development') {
    console.log('[Wallet Hook] Chain detection:', {
      chainId: state.chainId,
      detectedChain,
      address: state.address
    })
  }

  return {
    ...state,
    login,
    logout,
    reconnect,
    chain: detectedChain,
    chainId: state.chainId
  }
}