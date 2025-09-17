import { useEffect, useState, useCallback, useRef } from "react"
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
import { createLogger } from "~utils/logger"

const log = createLogger('AbstractWallet')

interface UseAbstractWalletReturn extends AbstractWalletState {
  login: () => Promise<void>
  logout: () => Promise<void>
  reconnect: () => Promise<void>
  clearAllState: () => Promise<void>
  chain?: SupportedChain
  chainId?: number
}

export function useAbstractWallet(): UseAbstractWalletReturn {
  const [state, setState] = useState<AbstractWalletState>({
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false
  })
  
  // Use ref to track mounted state for cleanup
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Use Abstract's native login hook with enhanced options
  const loginHook = useLoginWithAbstract()
  const agwLogin = loginHook.login
  const agwLogout = loginHook.logout
  // Handle isConnecting property that may not exist in some versions
  const agwIsConnecting = (loginHook as any).isConnecting || false
  
  // Use Abstract's client hook to get wallet info - cast to any to fix type conflicts
  const { data: client } = useAbstractClient() as { data: any }

  // Consolidated effect for client state management
  useEffect(() => {
    const handleClientState = async () => {
      if (!isMountedRef.current) return
      
      try {
        // Check for stored connection first
        const storedAddress = await getStoredWalletConnection()
        
        if (client && client.account && client.account.address) {
          const address = client.account.address as Address
          const chainId = client.chain ? client.chain.id : undefined
          
          log.debug('[Wallet Hook] Client connected:', {
            address,
            chainId,
            chainName: client.chain ? client.chain.name : undefined
          })
          
          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              isConnected: true,
              address,
              chainId,
              isConnecting: false,
              error: undefined
            }))
          }
          
          // Store connection for persistence
          if (isMountedRef.current) {
            storeWalletConnection(address).catch(console.error)
          }
        } else if (storedAddress && !client) {
          // Handle stored connection without active client
          log.debug('[Wallet Hook] Stored connection found, waiting for client')
        } else {
          // No client connection - update state only if currently connected
          if (isMountedRef.current) {
            setState(prev => {
              // Only trigger cleanup if we're transitioning from connected to disconnected
              if (prev.isConnected && !prev.isDisconnecting) {
                log.debug('[Wallet Hook] External disconnect detected')
                // Trigger cleanup in next tick to avoid state update during render
                setTimeout(() => {
                  clearAllStateInternal().catch(console.error)
                }, 0)
              }
              
              return {
                ...prev,
                isConnected: false,
                address: undefined,
                chainId: undefined,
                isDisconnecting: false,
                error: undefined
              }
            })
          }
        }
      } catch (error) {
        log.error("Failed to handle client state:", error)
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: getWalletErrorMessage(error)
          }))
        }
      }
    }

    handleClientState()
  }, [client])

  // Login function using Abstract's native popup with enhanced UX
  const login = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return
    
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: undefined }))
      
      log.debug('[Abstract Login] Starting login process...')
      
      // This will trigger Abstract's native login popup
      // The popup will handle wallet selection, account creation, etc.
      await agwLogin()
      
      log.debug('[Abstract Login] Login successful')
      // The useEffect above will handle the state update when client connects
    } catch (error: any) {
      log.error('[Abstract Login] Login failed:', error)
      
      if (isMountedRef.current) {
        const errorMessage = getWalletErrorMessage(error)
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: errorMessage
        }))
      }
    }
  }, [agwLogin])

  // Internal cleanup function - shared between manual logout and external disconnect
  const clearAllStateInternal = useCallback(async (): Promise<void> => {
    try {
      // Clear stored connection
      await clearWalletConnection()
      
      // Dispatch cleanup event for other components
      window.dispatchEvent(new CustomEvent('NFTORY_WALLET_DISCONNECTED', {
        detail: { timestamp: Date.now() }
      }))
      
      log.debug('[Wallet Hook] State cleanup completed')
    } catch (error) {
      log.error('Failed to clear wallet state:', error)
    }
  }, [])
  
  // Public cleanup function
  const clearAllState = useCallback(async (): Promise<void> => {
    await clearAllStateInternal()
  }, [clearAllStateInternal])

  // Enhanced logout function with loading states
  const logout = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return
    
    try {
      // Set disconnecting state
      setState(prev => ({ ...prev, isDisconnecting: true, error: undefined }))
      
      log.debug('[Abstract Logout] Starting logout process...')
      
      // Use Abstract's native logout function
      agwLogout()
      
      // Clear all state and notify other components
      await clearAllStateInternal()
      
      // Reset state
      if (isMountedRef.current) {
        setState({
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false
        })
      }
      
      log.debug('[Abstract Logout] Logout completed successfully')
    } catch (error) {
      log.error('Failed to logout:', error)
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isDisconnecting: false,
          error: getWalletErrorMessage(error)
        }))
      }
    }
  }, [agwLogout, clearAllStateInternal])

  // Reconnect function for retry scenarios
  const reconnect = useCallback(async (): Promise<void> => {
    await login()
  }, [login])

  const detectedChain = state.chainId ? getChainFromId(state.chainId) : undefined
  
  // Debug chain detection
  if (state.isConnected) {
    log.debug('[Wallet Hook] Chain detection:', {
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
    clearAllState,
    chain: detectedChain,
    chainId: state.chainId
  }
}