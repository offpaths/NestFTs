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

// Global state for observer-based detection
let composeAreaObserver: MutationObserver | null = null
let recentlyAddedComposeAreas: Set<Element> = new Set()

/**
 * Finds the currently active compose area with enhanced robustness
 */
function findActiveComposeArea(): Element | null {
  // Strategy 1: Check for currently focused compose area
  const focusedElement = document.activeElement
  if (focusedElement && isValidComposeElement(focusedElement)) {
    return focusedElement
  }

  // Strategy 2: Check recently detected compose areas from observer
  for (const recentArea of recentlyAddedComposeAreas) {
    if (isValidComposeElement(recentArea) && document.contains(recentArea)) {
      const score = scoreComposeElement(recentArea)
      if (score > 30) { // High score threshold for recent areas
        return recentArea
      }
    }
  }

  // Strategy 3: Look for compose areas in Twitter modals/overlays (highest priority)
  const modalCompose = findModalComposeArea()
  if (modalCompose) {
    return modalCompose
  }

  // Strategy 4: Enhanced visibility-based detection with scoring
  const visibleCompose = findBestVisibleComposeArea()
  if (visibleCompose) {
    return visibleCompose
  }

  // Strategy 5: Expanded fallback selectors with modern Twitter patterns
  const composeSelectors = [
    // Modern React-based selectors
    '[role="textbox"][data-testid*="tweet"]',
    '[role="textbox"][contenteditable="true"]',
    '[data-testid*="tweetTextarea"]',
    '[data-testid="tweetTextarea_0"]',
    '[data-testid*="replyTextarea"]',
    '[data-testid="dmComposerTextInput"]',

    // Aria-based selectors for accessibility
    '[aria-label*="Post text"]',
    '[aria-label*="Tweet text"]',
    '[aria-label*="Reply"]',
    '[aria-label*="What is happening"]',

    // Generic fallbacks
    '[role="textbox"]',
    '[contenteditable="true"][data-text]',
    'div[contenteditable="true"]:not([data-slate-editor])', // Exclude other editors

    // Legacy selectors
    '.tweet-box',
    '.compose-text'
  ]

  // Try selectors with validation and scoring
  let bestElement = null
  let bestScore = 0

  for (const selector of composeSelectors) {
    const elements = document.querySelectorAll(selector)
    for (const element of elements) {
      if (isValidComposeElement(element)) {
        const score = scoreComposeElement(element)
        if (score > bestScore) {
          bestScore = score
          bestElement = element
        }
      }
    }
  }

  return bestElement
}

/**
 * Initializes observer-based compose area detection
 */
function initializeComposeAreaObserver(): void {
  // Clean up existing observer
  if (composeAreaObserver) {
    composeAreaObserver.disconnect()
  }

  // Clear recent areas periodically
  setInterval(() => {
    recentlyAddedComposeAreas.clear()
  }, 30000) // Clear every 30 seconds

  composeAreaObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check for added nodes that might contain compose areas
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element

          // Check if the added element itself is a compose area
          if (isValidComposeElement(element)) {
            recentlyAddedComposeAreas.add(element)
            log.debug('📝 New compose area detected by observer:', element)
          }

          // Check for compose areas within the added element
          const composeSelectors = [
            '[role="textbox"]',
            '[data-testid*="tweetTextarea"]',
            '[contenteditable="true"]'
          ]

          for (const selector of composeSelectors) {
            const foundAreas = element.querySelectorAll(selector)
            for (const area of foundAreas) {
              if (isValidComposeElement(area)) {
                recentlyAddedComposeAreas.add(area)
                log.debug('📝 New compose area found in added element:', area)
              }
            }
          }
        }
      }

      // Clean up references to removed compose areas
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          recentlyAddedComposeAreas.delete(element)

          // Remove any child compose areas that were removed
          recentlyAddedComposeAreas.forEach(area => {
            if (!document.contains(area)) {
              recentlyAddedComposeAreas.delete(area)
            }
          })
        }
      }
    }
  })

  // Start observing with optimized settings
  composeAreaObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // Don't watch attributes for performance
    attributeOldValue: false,
    characterData: false
  })

  log.debug('🔍 Compose area observer initialized')
}

/**
 * Cleanup function for observer-based detection
 */
function cleanupComposeAreaObserver(): void {
  if (composeAreaObserver) {
    composeAreaObserver.disconnect()
    composeAreaObserver = null
  }
  recentlyAddedComposeAreas.clear()
  log.debug('🧹 Compose area observer cleaned up')
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
 * Scores a compose element based on visibility, position, and context
 */
function scoreComposeElement(element: Element): number {
  let score = 0

  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  // Size scoring (larger elements get higher scores)
  score += Math.min(rect.width / 100, 10) // Max 10 points for width
  score += Math.min(rect.height / 20, 5)  // Max 5 points for height

  // Visibility scoring
  if (style.visibility !== 'hidden' && style.display !== 'none') score += 10
  if (parseFloat(style.opacity) > 0.5) score += 5

  // Position scoring (prefer elements in viewport)
  if (rect.top >= 0 && rect.bottom <= window.innerHeight) score += 15
  if (rect.left >= 0 && rect.right <= window.innerWidth) score += 10

  // Z-index scoring (higher z-index = likely to be active modal)
  const zIndex = parseInt(style.zIndex) || 0
  if (zIndex > 0) score += Math.min(zIndex / 100, 10)

  // Context scoring (check for Twitter-specific indicators)
  if (element.closest('[role="dialog"]')) score += 20  // In modal
  if (element.closest('[aria-modal="true"]')) score += 20 // In modal
  if (element.closest('[data-testid*="Modal"]')) score += 15 // Twitter modal
  if (element.getAttribute('aria-label')?.includes('Post')) score += 10
  if (element.getAttribute('data-testid')?.includes('tweet')) score += 10

  // Focus scoring
  if (document.activeElement === element) score += 25
  if (element.contains(document.activeElement)) score += 15

  // Penalize elements that seem inactive
  if (element.hasAttribute('disabled')) score -= 20
  if (element.hasAttribute('readonly')) score -= 20
  if (style.pointerEvents === 'none') score -= 10

  return Math.max(0, score)
}

/**
 * Enhanced visibility-based detection with scoring
 */
function findBestVisibleComposeArea(): Element | null {
  const composeSelectors = [
    '[role="textbox"]',
    '[data-testid*="tweetTextarea"]',
    '[contenteditable="true"]'
  ]

  let bestElement = null
  let bestScore = 0

  for (const selector of composeSelectors) {
    const elements = document.querySelectorAll(selector)

    for (const element of elements) {
      if (!isValidComposeElement(element)) continue

      const score = scoreComposeElement(element)
      if (score > bestScore) {
        bestScore = score
        bestElement = element
      }
    }
  }

  return bestElement
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
 * Enhanced validation for compose area elements
 */
function isValidComposeElement(element: Element): boolean {
  if (!element) return false

  // Skip non-interactive elements
  const tagName = element.tagName.toLowerCase()
  const role = element.getAttribute('role')
  const contentEditable = element.getAttribute('contenteditable')

  // Must be either a textbox role, contenteditable, or specific input types
  const isTextInput = (
    role === 'textbox' ||
    contentEditable === 'true' ||
    (tagName === 'input' && ['text', 'search'].includes((element as HTMLInputElement).type)) ||
    tagName === 'textarea'
  )

  if (!isTextInput) return false

  // Skip disabled or readonly elements
  if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
    return false
  }

  // Check computed styles
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  // Check opacity (allow slightly transparent elements)
  const opacity = parseFloat(style.opacity)
  if (opacity < 0.1) return false

  // Must be visible and have reasonable dimensions
  const rect = element.getBoundingClientRect()
  if (rect.width < 30 || rect.height < 15) {
    return false
  }

  // Must be within viewport (with some tolerance for modals)
  const isInViewport = (
    rect.bottom > -100 && rect.top < window.innerHeight + 100 &&
    rect.right > -100 && rect.left < window.innerWidth + 100
  )
  if (!isInViewport) return false

  // Check if element can receive focus (important for text inputs)
  if (style.pointerEvents === 'none') return false

  // Additional Twitter-specific validation
  const ariaLabel = element.getAttribute('aria-label')
  const dataTestId = element.getAttribute('data-testid')

  // Exclude known non-compose elements
  if (ariaLabel && (
    ariaLabel.includes('Search') ||
    ariaLabel.includes('search') ||
    ariaLabel.includes('Username') ||
    ariaLabel.includes('Password')
  )) {
    return false
  }

  if (dataTestId && (
    dataTestId.includes('search') ||
    dataTestId.includes('Search') ||
    dataTestId.includes('login') ||
    dataTestId.includes('username')
  )) {
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
    // Initialize compose area observer for better detection
    initializeComposeAreaObserver()

    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      nftFetchControllerRef.current?.abort()
      cleanupComposeAreaObserver()
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
    if (nftFetchControllerRef.current) {
      nftFetchControllerRef.current.abort()
      nftFetchControllerRef.current = null
    }

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
      // Keep modal open to show connect wallet interface
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

    // Abort any previous fetch operations
    nftFetchControllerRef.current?.abort()

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

          // For NFT fetching, prefer Ethereum where most NFTs exist
          // Abstract wallets can hold NFTs on any chain, but Ethereum has the most
          const targetChain = 'ethereum'
          
          const result = await fetchUserNFTsWithCache(address, targetChain)
          
          if (controller.signal.aborted || !isMountedRef.current || isDisconnecting) return
          
          setNfts(result.nfts)
          setFetchErrors(result.errors || [])
          setFromCache(result.fromCache || false)

          // If we got empty results from cache, try fresh fetch
          if (result.fromCache && (!result.nfts || result.nfts.length === 0)) {
            try {
              // Clear cache and fetch fresh data
              await chrome.storage.local.remove(`nft-cache-${address}-${targetChain}`)
              const freshResult = await fetchUserNFTsWithCache(address, targetChain)

              if (freshResult.nfts && freshResult.nfts.length > 0) {
                setNfts(freshResult.nfts)
                setFromCache(false)
              }
            } catch (freshError) {
              // Silently handle fresh fetch errors
            }
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
  }, [isConnected, address, chain, retryTrigger, isDisconnecting]) // Remove clearAllNFTState to avoid stale closures

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
