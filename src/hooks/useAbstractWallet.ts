import { useEffect, useState, useCallback, useRef } from "react"
import { useLoginWithAbstract, useAbstractClient, useGlobalWalletSignerAccount } from "@abstract-foundation/agw-react"
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
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // Use ref to track mounted state for cleanup
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Use Abstract's native hooks
  const loginHook = useLoginWithAbstract()
  const agwLogin = loginHook.login
  const agwLogout = loginHook.logout

  // Use the official Abstract account hook for connection state
  const {
    address,
    isConnected,
    isConnecting,
    chainId,
    chain,
    status
  } = useGlobalWalletSignerAccount()

  // Use Abstract's client hook to get wallet info
  const { data: client } = useAbstractClient() as { data: any }


  // Store connection when address becomes available
  useEffect(() => {
    const walletAddress = client?.account?.address || address
    if (walletAddress && isConnected) {
      storeWalletConnection(walletAddress).catch(console.error)
    }
  }, [client?.account?.address, address, isConnected])

  // Login function using Abstract's native popup
  const login = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return

    try {
      setError(undefined)
      log.debug('[Abstract Login] Starting login process...')
      await agwLogin()
      log.debug('[Abstract Login] Login successful')
    } catch (error: any) {
      log.error('[Abstract Login] Login failed:', error)
      if (isMountedRef.current) {
        setError(getWalletErrorMessage(error))
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
      setIsDisconnecting(true)
      setError(undefined)

      log.debug('[Abstract Logout] Starting logout process...')

      // Use Abstract's native logout function
      agwLogout()

      // Clear all state and notify other components
      await clearAllStateInternal()

      log.debug('[Abstract Logout] Logout completed successfully')
    } catch (error) {
      log.error('Failed to logout:', error)

      if (isMountedRef.current) {
        setError(getWalletErrorMessage(error))
      }
    } finally {
      if (isMountedRef.current) {
        setIsDisconnecting(false)
      }
    }
  }, [agwLogout, clearAllStateInternal])

  // Reconnect function for retry scenarios
  const reconnect = useCallback(async (): Promise<void> => {
    await login()
  }, [login])

  const detectedChain = chainId ? getChainFromId(chainId) : undefined

  return {
    isConnected,
    address: client?.account?.address || address, // Prefer client address (smart contract wallet) over signer address
    isConnecting,
    isDisconnecting,
    error,
    login,
    logout,
    reconnect,
    clearAllState,
    chain: detectedChain,
    chainId
  }
}