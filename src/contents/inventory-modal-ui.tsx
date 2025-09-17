import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
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

/**
 * Handles NFT click upload by finding the active compose area and triggering file upload
 */
const handleNFTClickUpload = async (nft: any, preloadedFile: File | null, abortSignal?: AbortSignal) => {
  log.debug(`🎯 Processing NFT click upload for: ${nft.name}`)
  
  try {
    if (abortSignal?.aborted) return
    
    // Find the currently active compose area
    const activeComposeArea = findActiveComposeArea()
    
    if (!activeComposeArea) {
      log.error('No active compose area found for NFT upload')
      return
    }
    
    // Find the file input for this compose area
    const fileInput = findFileInputForCompose(activeComposeArea)
    if (!fileInput) {
      log.error('Could not find file input for active compose area')
      return
    }
    
    let file = preloadedFile
    
    // If no preloaded file, fetch the NFT image
    if (!file) {
      if (abortSignal?.aborted) return
      
      log.debug('No preloaded file, fetching NFT image:', nft.image)
      
      // Validate URL for security
      const url = new URL(nft.image)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid URL protocol - only HTTP/HTTPS allowed')
      }
      
      const response = await fetch(nft.image, { 
        mode: 'cors',
        signal: abortSignal
      })
      
      if (abortSignal?.aborted) return
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      
      const blob = await response.blob()
      const filename = `${nft.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'nft'}.png`
      file = new File([blob], filename, { type: 'image/png' })
    }
    
    if (abortSignal?.aborted) return
    
    // Trigger file upload using existing function
    triggerFileUploadForClick(fileInput, file)
    
    log.debug('✅ NFT click upload completed successfully')
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      log.error('❌ Failed to process NFT click upload:', error)
    }
  }
}

/**
 * Finds the currently active compose area with Twitter-specific modal detection
 */
function findActiveComposeArea(): Element | null {
  // Strategy 1: Check for currently focused compose area
  const focusedElement = document.activeElement
  if (focusedElement && isValidComposeElement(focusedElement)) {
    return focusedElement
  }
  
  // Strategy 2: Look for compose areas in Twitter modals/overlays (highest priority)
  const modalCompose = findModalComposeArea()
  if (modalCompose) {
    return modalCompose
  }
  
  // Strategy 3: Find the topmost visible compose area
  const visibleCompose = findTopMostVisibleComposeArea()
  if (visibleCompose) {
    return visibleCompose
  }
  
  // Strategy 4: Fallback to any visible compose area
  const composeSelectors = [
    '[role="textbox"]',
    '[data-testid*="tweetTextarea"]',
    '[data-testid="tweetTextarea_0"]',
    '[contenteditable="true"]'
  ]
  
  for (const selector of composeSelectors) {
    const element = document.querySelector(selector)
    if (element && isValidComposeElement(element)) {
      return element
    }
  }
  
  return null
}

/**
 * Specifically looks for compose areas inside Twitter modals/overlays
 */
function findModalComposeArea(): Element | null {
  // First, check if there's actually a modal present on the page
  const modalElements = document.querySelectorAll('[role="dialog"], [aria-modal="true"], [data-testid*="Modal"], [data-testid*="Drawer"]')
  
  if (modalElements.length === 0) {
    return null
  }
  
  // Look for compose areas inside modal-like containers
  const modalSelectors = [
    // Twitter modal/drawer patterns (most specific first)
    '[role="dialog"] [role="textbox"]',
    '[aria-modal="true"] [role="textbox"]',
    '[data-testid*="Modal"] [role="textbox"]',
    '[data-testid*="Drawer"] [role="textbox"]',
    
    // Fixed position overlays with compose areas
    '[style*="position: fixed"] [role="textbox"]'
  ]
  
  for (const selector of modalSelectors) {
    const elements = document.querySelectorAll(selector)
    
    for (const element of elements) {
      if (!isValidComposeElement(element)) continue
      
      const rect = element.getBoundingClientRect()
      
      // Must be visible and reasonably sized
      if (rect.width > 100 && rect.height > 20 && 
          rect.top >= 0 && rect.bottom <= window.innerHeight) {
        
        // Additional check: make sure this compose area is actually "on top"
        const isOnTop = isElementOnTop(element)
        
        if (isOnTop) {
          return element
        }
      }
    }
  }
  
  return null
}

/**
 * Checks if an element is visually on top (not behind modal overlays)
 */
function isElementOnTop(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  // Get the topmost element at the center point of our compose area
  const topElement = document.elementFromPoint(centerX, centerY)
  
  // Check if the topmost element is our element or a descendant of it
  if (!topElement) return false
  
  return element.contains(topElement) || topElement.contains(element)
}

/**
 * Finds the topmost visible compose area (highest on screen)
 * If a modal is present, excludes background compose areas
 */
function findTopMostVisibleComposeArea(): Element | null {
  const composeSelectors = [
    '[role="textbox"]',
    '[data-testid*="tweetTextarea"]',
    '[contenteditable="true"]'
  ]
  
  const hasModal = document.querySelector('[role="dialog"], [aria-modal="true"], [data-testid*="Modal"], [data-testid*="Drawer"]')
  
  let topMostElement: Element | null = null
  let topMostY = Infinity
  
  for (const selector of composeSelectors) {
    const elements = document.querySelectorAll(selector)
    
    for (const element of elements) {
      if (!isValidComposeElement(element)) continue
      
      const rect = element.getBoundingClientRect()
      
      // Must be visible and reasonably positioned
      if (rect.width > 100 && rect.height > 20 && 
          rect.top >= 0 && rect.bottom <= window.innerHeight) {
        
        // If there's a modal, only consider compose areas that are actually on top
        if (hasModal) {
          const isOnTop = isElementOnTop(element)
          if (!isOnTop) {
            continue
          }
        }
        
        // Find the topmost (smallest top value)
        if (rect.top < topMostY) {
          topMostY = rect.top
          topMostElement = element
        }
      }
    }
  }
  
  return topMostElement
}


/**
 * Validates that an element is a suitable compose area
 */
function isValidComposeElement(element: Element): boolean {
  // Skip hidden or disabled elements
  if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
    return false
  }
  
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  
  // Must be visible and have reasonable dimensions
  const rect = element.getBoundingClientRect()
  if (rect.width < 50 || rect.height < 20) {
    return false
  }
  
  return true
}

/**
 * Finds the file input associated with a compose area, prioritizing modal inputs
 */
function findFileInputForCompose(composeArea: Element): HTMLInputElement | null {
  // PRIORITY 1: If compose area is in a modal, look for file inputs in the same modal first
  const modalContainer = composeArea.closest('[role="dialog"], [aria-modal="true"], [data-testid*="Modal"], [data-testid*="Drawer"]')
  
  if (modalContainer) {
    const inputSelectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
      'input[accept*="image"]'
    ]
    
    for (const selector of inputSelectors) {
      const modalInputs = modalContainer.querySelectorAll(selector) as NodeListOf<HTMLInputElement>
      
      for (const input of modalInputs) {
        if (isValidFileInputForClick(input)) {
          return input
        }
      }
    }
  }
  
  // PRIORITY 2: Container-based search (original logic)
  const containerCandidates = [
    composeArea.closest('[data-testid="toolBar"]')?.parentElement,
    composeArea.closest('[data-testid*="tweet"]'),
    composeArea.closest('[data-testid*="post"]'),
    composeArea.closest('form'),
    composeArea.closest('[role="main"]'),
    composeArea.parentElement,
    composeArea.parentElement?.parentElement
  ].filter(Boolean)
  
  for (const container of containerCandidates) {
    if (!container) continue
    
    const inputSelectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
      'input[accept*="image"]'
    ]
    
    for (const selector of inputSelectors) {
      const fileInput = container.querySelector(selector) as HTMLInputElement
      if (fileInput && isValidFileInputForClick(fileInput)) {
        return fileInput
      }
    }
  }
  
  // PRIORITY 3: Global fallback with proximity (but exclude background inputs if we're in a modal)
  const globalInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
  let bestInput: HTMLInputElement | null = null
  let bestDistance = Infinity
  
  const composeRect = composeArea.getBoundingClientRect()
  const composeCenterX = composeRect.left + composeRect.width / 2
  const composeCenterY = composeRect.top + composeRect.height / 2
  
  globalInputs.forEach(input => {
    if (!isValidFileInputForClick(input)) return
    
    // If compose area is in modal, skip file inputs that are NOT in a modal
    if (modalContainer) {
      const inputInModal = input.closest('[role="dialog"], [aria-modal="true"], [data-testid*="Modal"], [data-testid*="Drawer"]')
      if (!inputInModal) {
        return
      }
    }
    
    const inputRect = input.getBoundingClientRect()
    const inputCenterX = inputRect.left + inputRect.width / 2
    const inputCenterY = inputRect.top + inputRect.height / 2
    
    const distance = Math.sqrt(
      Math.pow(composeCenterX - inputCenterX, 2) + 
      Math.pow(composeCenterY - inputCenterY, 2)
    )
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestInput = input
    }
  })
  
  return bestInput
}

/**
 * Validates that a file input is suitable for image uploads
 */
function isValidFileInputForClick(input: HTMLInputElement): boolean {
  if (input.type !== 'file') return false
  
  const style = window.getComputedStyle(input)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }
  
  const accept = input.accept?.toLowerCase() || ''
  return accept.includes('image') || accept.includes('*/*') || accept === ''
}

/**
 * Triggers file upload specifically for click interactions
 */
function triggerFileUploadForClick(fileInput: HTMLInputElement, file: File) {
  try {
    log.debug('Triggering file upload from click:', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type
    })
    
    // Create a FileList-like object
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    
    // Set the files on the input
    fileInput.files = dataTransfer.files
    
    // React-compatible event sequence
    const eventOptions = { bubbles: true, cancelable: true }
    
    // Focus the input
    if (document.activeElement !== fileInput) {
      fileInput.focus()
    }
    
    // Trigger input event first
    const inputEvent = new Event('input', eventOptions)
    Object.defineProperty(inputEvent, 'target', { 
      value: fileInput, 
      enumerable: true, 
      configurable: true 
    })
    fileInput.dispatchEvent(inputEvent)
    
    // Trigger change event
    const changeEvent = new Event('change', eventOptions)
    Object.defineProperty(changeEvent, 'target', { 
      value: fileInput, 
      enumerable: true,
      configurable: true 
    })
    fileInput.dispatchEvent(changeEvent)
    
    // Clean up focus
    setTimeout(() => {
      if (document.activeElement === fileInput) {
        fileInput.blur()
      }
    }, 200)
    
    log.debug('✅ File upload event sequence completed for click')
    
  } catch (error) {
    log.error('❌ Failed to trigger file upload from click:', error)
    throw error
  }
}

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
  
  // Track mounted state for cleanup
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const nftFetchControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      nftFetchControllerRef.current?.abort()
    }
  }, [])
  
  // Calculate test data info - stable dependency
  const nftDataInfo = useMemo(() => getNFTDataInfo(nfts), [nfts.length])

  const { isConnected, address, chain, chainId, isDisconnecting } = useAbstractWallet()
  const [retryTrigger, setRetryTrigger] = useState(0)
  
  // Clear all NFT state and abort operations when wallet disconnects
  const clearAllNFTState = useCallback(() => {
    log.debug('[NFT Modal] Clearing all NFT state due to disconnect')
    
    // Abort any ongoing NFT fetch operations
    nftFetchControllerRef.current?.abort()
    nftFetchControllerRef.current = null
    
    // Clear all NFT-related state
    if (isMountedRef.current) {
      setNfts([])
      setFetchErrors([])
      setFromCache(false)
      setIsLoadingNFTs(false)
    }
  }, [])

  // Listen for wallet disconnect events
  useEffect(() => {
    const handleWalletDisconnect = () => {
      log.debug('[NFT Modal] Wallet disconnect event received')
      clearAllNFTState()
      // Close modal on disconnect
      if (open) {
        setOpen(false)
      }
    }
    
    window.addEventListener('NFTORY_WALLET_DISCONNECTED', handleWalletDisconnect)
    
    return () => {
      window.removeEventListener('NFTORY_WALLET_DISCONNECTED', handleWalletDisconnect)
    }
  }, [clearAllNFTState, open])
  
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
    
    // Handle NFT click events from modal
    const onNFTClick = async (e: Event) => {
      log.debug("NFT click event received")
      const detail = (e as CustomEvent).detail as { 
        nft: any; 
        file: File | null; 
        timestamp: number 
      }
      
      if (detail?.nft) {
        // Create new abort controller for this upload
        const controller = new AbortController()
        abortControllerRef.current = controller
        
        await handleNFTClickUpload(detail.nft, detail.file, controller.signal)
      }
    }
    
    window.addEventListener('NFTORY_NFT_CLICKED', onNFTClick as EventListener)
    
    return () => {
      log.debug("Cleaning up modal event listeners")
      window.removeEventListener(
        AppConfig.TOGGLE_EVENT_TYPE,
        onToggle as EventListener
      )
      window.removeEventListener('NFTORY_RETRY_FETCH', onRetry)
      window.removeEventListener('NFTORY_NFT_CLICKED', onNFTClick as EventListener)
    }
  }, [])

  // Fetch NFTs when wallet is connected
  useEffect(() => {
    // Don't fetch if wallet is in disconnecting state
    if (isDisconnecting) {
      return
    }
    
    const controller = new AbortController()
    nftFetchControllerRef.current = controller
    
    const loadNFTs = async () => {
      if (!isMountedRef.current) return
      
      if (isConnected && address && !isDisconnecting) {
        setIsLoadingNFTs(true)
        setFetchErrors([])
        setFromCache(false)
        
        try {
          if (controller.signal.aborted || !isMountedRef.current) return
          
          // Use detected chain or default to ethereum
          const targetChain = chain || 'ethereum'
          log.debug(`Fetching NFTs for chain: ${targetChain}`, {
            walletChainId: chainId,
            detectedChain: chain,
            address: formatAddress(address)
          })
          
          const result = await fetchUserNFTsWithCache(address, targetChain)
          
          if (controller.signal.aborted || !isMountedRef.current || isDisconnecting) return
          
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
          if (!controller.signal.aborted && isMountedRef.current && !isDisconnecting) {
            log.error("Critical NFT fetch failure:", error)
            setNfts([])
            setFetchErrors([{
              service: 'unknown',
              message: error?.message || 'Unknown error occurred',
              isConfigurationError: false
            }])
          }
        } finally {
          if (isMountedRef.current && !isDisconnecting) {
            setIsLoadingNFTs(false)
          }
        }
      } else {
        // Clear state when not connected or disconnecting
        clearAllNFTState()
      }
    }

    loadNFTs()
    
    return () => {
      controller.abort()
      if (nftFetchControllerRef.current === controller) {
        nftFetchControllerRef.current = null
      }
    }
  }, [isConnected, address, chain, retryTrigger, isDisconnecting, clearAllNFTState]) // Add isDisconnecting and clearAllNFTState to dependencies

  const position = useMemo(() => {
    if (!anchor) return { mode: "center" as const }
    return { mode: "anchor" as const, x: anchor.x, y: anchor.y }
  }, [anchor?.x, anchor?.y]) // More stable dependencies


  return (
    <InventoryModal
      open={open}
      onClose={() => setOpen(false)}
      position={position}
      nfts={isLoadingNFTs ? [] : nfts}
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
