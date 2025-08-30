import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"

import { AGWProvider } from "~components/AGWProvider"
import InventoryModal from "~popup/inventory-modal"
import AppConfig from "~utils/app-config"
import globalContentConfig from "~utils/content-config"
import { useAbstractWallet } from "~hooks/useAbstractWallet"
import { fetchUserNFTsWithCache, type NFTMetadata, type NFTFetchError, getNFTDataInfo } from "~services/nft-service"
import { formatAddress } from "~utils/abstract-wallet"
import { createLogger } from "~utils/logger"

export const plasmoconfig = globalContentConfig
const log = createLogger('InventoryModalUI')

function ensureShadowRoot() {
  let host = document.getElementById(AppConfig.HOST_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = AppConfig.HOST_ID
    host.style.all = "initial"
    document.body.appendChild(host)
  }
  const shadow = (host as any).shadowRoot ?? host.attachShadow({ mode: "open" })

  let rootEL = shadow.getElementById?.(AppConfig.MODAL_ID) as HTMLElement | null

  if (!rootEL) {
    rootEL = document.createElement("div")
    rootEL.id = AppConfig.MODAL_ID
    shadow.appendChild(rootEL)
    const style = document.createElement("style")
    style.textContent = `:host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; } body { margin: 0; }
    `
    shadow.appendChild(style)
  }
  return { shadow, rootEL }
}

function NFTModalContent() {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [nfts, setNfts] = useState<NFTMetadata[]>([])
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<NFTFetchError[]>([])
  const [fromCache, setFromCache] = useState(false)
  
  // Calculate test data info
  const nftDataInfo = useMemo(() => getNFTDataInfo(nfts), [nfts])

  const { isConnected, address, chain, chainId } = useAbstractWallet()
  const [retryTrigger, setRetryTrigger] = useState(0)

  useEffect(() => {
    log.debug("Setting up modal event listener for:", AppConfig.TOGGLE_EVENT_TYPE)
    
    const onToggle = (e: Event) => {
      log.debug("Modal toggle event received:", e)
      const detail = (e as CustomEvent).detail as { x?: number; y?: number }
      log.debug("Event detail:", detail)

      if (detail?.x && detail?.y) {
        log.debug("Setting anchor position:", { x: detail.x, y: detail.y })
        setAnchor({ x: detail.x, y: detail.y })
      }

      log.debug("Toggling modal open state")
      setOpen((o) => {
        log.debug("Modal state changing", { from: o, to: !o })
        return !o
      })
    }

    window.addEventListener(
      AppConfig.TOGGLE_EVENT_TYPE,
      onToggle as EventListener
    )
    const onRetry = () => {
      log.debug("Retry NFT fetch event received")
      setRetryTrigger(prev => prev + 1)
    }

    window.addEventListener('NFTORY_RETRY_FETCH', onRetry)
    
    return () => {
      log.debug("Cleaning up modal event listeners")
      window.removeEventListener(
        AppConfig.TOGGLE_EVENT_TYPE,
        onToggle as EventListener
      )
      window.removeEventListener('NFTORY_RETRY_FETCH', onRetry)
    }
  }, [])

  // Fetch NFTs when wallet is connected
  useEffect(() => {
    const loadNFTs = async () => {
      if (isConnected && address) {
        setIsLoadingNFTs(true)
        setFetchErrors([])
        setFromCache(false)
        
        try {
          // Use detected chain or default to ethereum
          const targetChain = chain || 'ethereum'
          log.debug(`Fetching NFTs for chain: ${targetChain}`, {
            walletChainId: chainId,
            detectedChain: chain,
            address: formatAddress(address)
          })
          const result = await fetchUserNFTsWithCache(address, targetChain)
          
          setNfts(result.nfts)
          setFetchErrors(result.errors || [])
          setFromCache(result.fromCache || false)
          
          // Log for debugging
          if (result.errors?.length) {
            log.warn('NFT fetch completed with errors:', result.errors)
          }
          if (result.fromCache) {
            log.debug('NFT data loaded from cache')
          }
          
        } catch (error) {
          log.error("Critical NFT fetch failure:", error)
          setNfts([])
          setFetchErrors([{
            service: 'unknown',
            message: error?.message || 'Unknown error occurred',
            isConfigurationError: false
          }])
        } finally {
          setIsLoadingNFTs(false)
        }
      } else {
        setNfts([])
        setFetchErrors([])
        setFromCache(false)
      }
    }

    loadNFTs()
  }, [isConnected, address, retryTrigger]) // Add retryTrigger to dependencies

  const position = useMemo(() => {
    if (!anchor) return { mode: "center" as const }
    return { mode: "anchor" as const, x: anchor.x, y: anchor.y }
  }, [anchor])

  const handlePickNFT = (nft: NFTMetadata) => {
    log.debug("Selected NFT:", nft)
    // Here you could dispatch an event to notify the parent page
    window.dispatchEvent(new CustomEvent("NFTORY_NFT_SELECTED", { 
      detail: nft 
    }))
    setOpen(false)
  }

  return (
    <InventoryModal
      open={open}
      onClose={() => setOpen(false)}
      position={position}
      nfts={isLoadingNFTs ? [] : nfts}
      onPickNFT={handlePickNFT}
      isLoading={isLoadingNFTs}
      errors={fetchErrors}
      fromCache={fromCache}
      nftDataInfo={nftDataInfo}
    />
  )
}

function App() {
  return (
    <AGWProvider>
      <NFTModalContent />
    </AGWProvider>
  )
}

const { rootEL } = ensureShadowRoot()
createRoot(rootEL).render(<App />)
