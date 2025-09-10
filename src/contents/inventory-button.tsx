import cssText from "data-text:~style.css"

import AppConfig from "~utils/app-config"
import globalContentConfig from "~utils/content-config"
import { createLogger } from "~utils/logger"
import { BUTTON_CONSTANTS, ANIMATION_CONSTANTS } from "~utils/ui-constants"

const plasmoconfig = globalContentConfig
const appconfig = AppConfig
const log = createLogger('InventoryButton')

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 *
 * Tailwind CSS relies on `rem` units, which are based on the root font size (typically defined on the <html>
 * or <body> element). However, in a Shadow DOM (as used by Plasmo), there is no native root element, so the
 * rem values would reference the actual page's root font size—often leading to sizing inconsistencies.
 *
 * To address this, we:
 * 1. Replace the `:root` selector with `:host(plasmo-csui)` to properly scope the styles within the Shadow DOM.
 * 2. Convert all `rem` units to pixel values using a fixed base font size, ensuring consistent styling
 *    regardless of the host page's font size.
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")

  styleElement.textContent = updatedCssText

  return styleElement
}


function setButtonStyleAndAttribs(btn: HTMLButtonElement) {
  btn.id = appconfig.BTN_ID
  btn.type = "button"
  btn.setAttribute("aria-label", "NFT Inventory")

  // Make it visually consistent with other buttons in the row
  btn.style.display = "inline-flex"
  btn.style.alignItems = "center"
  btn.style.justifyContent = "center"
  btn.style.width = BUTTON_CONSTANTS.WIDTH
  btn.style.height = BUTTON_CONSTANTS.HEIGHT
  btn.style.marginLeft = BUTTON_CONSTANTS.MARGIN_LEFT
  btn.style.border = "none"
  btn.style.background = "transparent"
  btn.style.cursor = "pointer"
  btn.style.borderRadius = BUTTON_CONSTANTS.BORDER_RADIUS
  btn.style.transition = ANIMATION_CONSTANTS.BUTTON_TRANSITION
  btn.style.color = BUTTON_CONSTANTS.ICON_COLOR

  // Create SVG safely without innerHTML to prevent XSS
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", BUTTON_CONSTANTS.ICON_WIDTH)
  svg.setAttribute("height", BUTTON_CONSTANTS.ICON_HEIGHT)
  svg.setAttribute("aria-hidden", "true")

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M12 2L2 7l10 5 10-5-10-5zm0 6.5l10 5v8l-10-5-10 5v-8l10-5z"
  )
  path.setAttribute("fill", BUTTON_CONSTANTS.ICON_FILL_COLOR)

  svg.appendChild(path)
  btn.appendChild(svg)
}

function createNFTButton(): HTMLButtonElement {
  const btn = document.createElement("button")

  setButtonStyleAndAttribs(btn)

  // Hover effect like native buttons
  btn.addEventListener("mouseenter", () => {
    btn.style.backgroundColor = BUTTON_CONSTANTS.HOVER_BG_COLOR
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.backgroundColor = "transparent"
  })

  btn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation()
    log.debug("NFT button clicked!", { x: e.clientX, y: e.clientY })

    // Dispatch a custom event with click coordinates
    const event = new CustomEvent(appconfig.TOGGLE_EVENT_TYPE, {
      detail: { x: e.clientX, y: e.clientY, ts: Date.now() }
    })

    log.debug("Dispatching event:", { eventType: appconfig.TOGGLE_EVENT_TYPE, detail: event.detail })
    window.dispatchEvent(event)
  })

  return btn
}

function injectButton(toolbar: Element) {
  // Avoid duplicates
  if (toolbar.querySelector(`#${appconfig.BTN_ID}`)) {
    log.debug("Button already exists in this toolbar, skipping")
    return
  }

  // Find the scroll snap list container
  const scrollSnapList = toolbar.querySelector(
    '[data-testid="ScrollSnap-List"]'
  )
  if (!scrollSnapList) {
    log.debug("No ScrollSnap-List found in toolbar")
    return
  }

  // Append our button to the end of the scroll snap list
  log.debug("Creating and injecting NFT button")
  const nftBtn = createNFTButton()
  scrollSnapList.appendChild(nftBtn)
  log.debug("NFT button successfully injected with ID:", nftBtn.id)
}

/**
 * Finds the file input element associated with a compose area
 * @param composeArea The compose area element
 * @returns HTMLInputElement | null The file input element or null if not found
 */
function findFileInput(composeArea: Element): HTMLInputElement | null {
  log.debug('Finding file input for compose area:', {
    tagName: composeArea.tagName,
    testId: composeArea.getAttribute('data-testid'),
    className: composeArea.className
  })
  
  // Try multiple container search strategies
  const containerCandidates = [
    // Direct toolbar parent
    composeArea.closest('[data-testid="toolBar"]')?.parentElement,
    
    // Tweet/post composer containers
    composeArea.closest('[data-testid*="tweet"]'),
    composeArea.closest('[data-testid*="post"]'),
    composeArea.closest('[data-testid*="compose"]'),
    
    // Reply composer containers
    composeArea.closest('[data-testid*="reply"]'),
    
    // Form containers
    composeArea.closest('form'),
    composeArea.closest('[role="main"]'),
    
    // Generic containers that might contain compose UI
    composeArea.closest('article'),
    composeArea.closest('section'),
    composeArea.closest('[aria-labelledby]'),
    
    // Parent element as last resort
    composeArea.parentElement,
    composeArea.parentElement?.parentElement
  ].filter(Boolean) // Remove null/undefined values
  
  // Search through containers in order of preference
  for (const container of containerCandidates) {
    if (!container) continue
    
    // Try different file input selectors
    const inputSelectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
      'input[accept*="image"]',
      'input[data-testid*="file"]',
      'input[data-testid*="media"]',
      'input[aria-label*="media"]',
      'input[aria-label*="photo"]',
      'input[aria-label*="image"]'
    ]
    
    for (const selector of inputSelectors) {
      const fileInput = container.querySelector(selector) as HTMLInputElement
      if (fileInput && isValidFileInput(fileInput)) {
        log.debug('Found file input via container search:', {
          selector,
          containerTag: container.tagName,
          inputAccept: fileInput.accept,
          inputType: fileInput.type
        })
        return fileInput
      }
    }
  }
  
  log.debug('No file input found in containers, trying global search')
  
  // Global fallback search with proximity scoring
  const globalInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
  let bestInput: HTMLInputElement | null = null
  let bestDistance = Infinity
  
  const composeRect = composeArea.getBoundingClientRect()
  const composeCenterX = composeRect.left + composeRect.width / 2
  const composeCenterY = composeRect.top + composeRect.height / 2
  
  globalInputs.forEach(input => {
    if (!isValidFileInput(input)) return
    
    const inputRect = input.getBoundingClientRect()
    const inputCenterX = inputRect.left + inputRect.width / 2
    const inputCenterY = inputRect.top + inputRect.height / 2
    
    // Calculate distance between compose area and input
    const distance = Math.sqrt(
      Math.pow(composeCenterX - inputCenterX, 2) + 
      Math.pow(composeCenterY - inputCenterY, 2)
    )
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestInput = input
    }
  })
  
  if (bestInput) {
    log.debug('Found closest file input via global search:', {
      distance: bestDistance,
      accept: bestInput.accept,
      testId: bestInput.getAttribute('data-testid')
    })
  } else {
    log.debug('No suitable file input found anywhere')
  }
  
  return bestInput
}

/**
 * Validates that a file input is suitable for image uploads
 */
function isValidFileInput(input: HTMLInputElement): boolean {
  // Must be a file input
  if (input.type !== 'file') {
    return false
  }
  
  // Skip hidden inputs (display:none or visibility:hidden)
  const style = window.getComputedStyle(input)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }
  
  // Prefer inputs that explicitly accept images
  const accept = input.accept?.toLowerCase() || ''
  if (accept.includes('image') || accept.includes('*/*') || accept === '') {
    return true
  }
  
  // Allow common image MIME types
  if (accept.includes('png') || accept.includes('jpg') || accept.includes('jpeg') || 
      accept.includes('gif') || accept.includes('webp')) {
    return true
  }
  
  return false
}

/**
 * Triggers the file upload by simulating user selection
 * @param fileInput The file input element
 * @param file The file to upload
 */
function triggerFileUpload(fileInput: HTMLInputElement, file: File) {
  try {
    log.debug('Triggering file upload:', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type,
      inputAccept: fileInput.accept,
      inputId: fileInput.id || 'no-id',
      inputTestId: fileInput.getAttribute('data-testid') || 'no-testid'
    })
    
    // Validate file input is still valid and visible
    if (!isValidFileInput(fileInput)) {
      throw new Error('File input is no longer valid or visible')
    }
    
    // Create a FileList-like object
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    
    // Store original files for potential restoration
    const originalFiles = fileInput.files
    
    // Set the files on the input
    fileInput.files = dataTransfer.files
    
    // React-compatible event sequence
    const eventOptions = { bubbles: true, cancelable: true }
    
    // 1. Focus the input (helps with React focus tracking)
    if (document.activeElement !== fileInput) {
      fileInput.focus()
    }
    
    // 2. Trigger input event first (React's preferred event)
    const inputEvent = new Event('input', eventOptions)
    // Set target property for React synthetic events
    Object.defineProperty(inputEvent, 'target', { 
      value: fileInput, 
      enumerable: true, 
      configurable: true 
    })
    fileInput.dispatchEvent(inputEvent)
    
    // 3. Trigger change event (standard DOM behavior)
    const changeEvent = new Event('change', eventOptions)
    Object.defineProperty(changeEvent, 'target', { 
      value: fileInput, 
      enumerable: true,
      configurable: true 
    })
    fileInput.dispatchEvent(changeEvent)
    
    // 4. Additional events that React components might listen for
    const customChangeEvent = new CustomEvent('file-selected', {
      ...eventOptions,
      detail: { 
        files: dataTransfer.files, 
        synthetic: true,
        source: 'nftory-extension'
      }
    })
    fileInput.dispatchEvent(customChangeEvent)
    
    // 5. Try to trigger on parent elements (for event delegation)
    let parent = fileInput.parentElement
    while (parent && parent !== document.body) {
      const parentChangeEvent = new Event('change', eventOptions)
      Object.defineProperty(parentChangeEvent, 'target', { 
        value: fileInput, 
        enumerable: true,
        configurable: true 
      })
      parent.dispatchEvent(parentChangeEvent)
      parent = parent.parentElement
    }
    
    // 6. Verify upload processing with timeout
    const verificationTimeout = setTimeout(() => {
      if (fileInput.files && fileInput.files.length > 0) {
        log.debug('File upload verification: Files still attached - checking Twitter processing')
        
        // Look for Twitter's file upload UI indicators
        const uploadIndicators = [
          '[data-testid*="media"]',
          '[aria-label*="Remove"]',
          '.r-1p0dtai', // Twitter's upload progress styles
          '[role="progressbar"]'
        ]
        
        const hasUploadUI = uploadIndicators.some(selector => 
          document.querySelector(selector)
        )
        
        if (hasUploadUI) {
          log.debug('✅ File upload SUCCESS: Twitter upload UI detected')
        } else {
          log.debug('⚠️ File upload UNCLEAR: Files attached but no UI changes detected')
        }
      } else {
        log.debug('✅ File upload SUCCESS: Files cleared, likely processed by Twitter')
      }
    }, 150)
    
    // 7. Clean up focus
    setTimeout(() => {
      if (document.activeElement === fileInput) {
        fileInput.blur()
      }
      clearTimeout(verificationTimeout)
    }, 200)
    
    log.debug('File upload event sequence completed')
    return true
    
  } catch (error) {
    log.error('Failed to trigger file upload:', error)
    throw new Error(`Failed to trigger file upload: ${error.message}`)
  }
}

/**
 * Handles the drag over event to show drop zone feedback
 */
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  
  // Check if drag data contains files (NFT images)
  if (event.dataTransfer && event.dataTransfer.types.includes('Files')) {
    event.dataTransfer.dropEffect = 'copy'
    
    // Enhanced visual feedback to the compose area
    const target = event.currentTarget as HTMLElement
    
    // Primary drop zone styling
    target.style.outline = '3px dashed #1d9bf0'
    target.style.backgroundColor = 'rgba(29, 155, 240, 0.08)'
    target.style.borderRadius = '8px'
    target.style.transition = 'all 0.2s ease'
    
    // Add a subtle pulse animation
    target.style.animation = 'nftory-pulse 1.5s ease-in-out infinite'
    
    // Add cursor indicator
    target.style.cursor = 'copy'
    
    // Add drop hint text if the area is large enough
    const rect = target.getBoundingClientRect()
    if (rect.width > 200 && rect.height > 100 && !target.querySelector('.nftory-drop-hint')) {
      const dropHint = document.createElement('div')
      dropHint.className = 'nftory-drop-hint'
      dropHint.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(29, 155, 240, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      `
      dropHint.textContent = '📎 Drop NFT here'
      
      // Make sure the parent has relative positioning
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative'
        target.setAttribute('data-nftory-position-modified', 'true')
      }
      
      target.appendChild(dropHint)
    }
    
    // Add CSS animation if it doesn't exist
    if (!document.querySelector('#nftory-drop-animations')) {
      const style = document.createElement('style')
      style.id = 'nftory-drop-animations'
      style.textContent = `
        @keyframes nftory-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29, 155, 240, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(29, 155, 240, 0); }
        }
      `
      document.head.appendChild(style)
    }
    
    log.debug('Drag over: Enhanced visual feedback applied')
  }
}

/**
 * Comprehensive cleanup of all drag-related styling
 */
function cleanupDragStyling(target: HTMLElement) {
  // Remove all drag-over visual styles
  target.style.outline = ''
  target.style.backgroundColor = ''
  target.style.borderRadius = ''
  target.style.animation = ''
  target.style.cursor = ''
  target.style.transition = ''
  
  // Restore original position if we modified it
  if (target.hasAttribute('data-nftory-position-modified')) {
    target.style.position = ''
    target.removeAttribute('data-nftory-position-modified')
  }
  
  // Remove drop hint
  const dropHint = target.querySelector('.nftory-drop-hint')
  if (dropHint) {
    dropHint.remove()
  }
  
  // Remove any feedback elements (but let them finish their animations)
  const feedback = target.querySelector('.nftory-drop-feedback')
  if (feedback && feedback.style.animation.includes('fade-out')) {
    // Let existing fade-out animation complete
  } else if (feedback) {
    feedback.remove()
  }
  
  log.debug('Comprehensive drag styling cleanup completed')
}

/**
 * Handles the drag leave event to remove visual feedback
 */
function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  
  // Only remove styling if we're actually leaving the element (not entering a child)
  const target = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as Node
  
  // Check if we're moving to a child element
  if (relatedTarget && target.contains(relatedTarget)) {
    return // Don't remove styling if entering a child element
  }
  
  // Use centralized cleanup function
  cleanupDragStyling(target)
  
  log.debug('Drag leave: Visual feedback removed')
}

/**
 * Handles the drop event to process the dropped NFT image
 */
async function handleDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  
  const target = event.currentTarget as HTMLElement
  
  // Complete drag-over visual feedback cleanup
  cleanupDragStyling(target)
  
  if (!event.dataTransfer) {
    log.debug('No dataTransfer in drop event')
    showDropFeedback(target, 'error', 'No file data received')
    return
  }
  
  try {
    log.debug('Drop event data types:', Array.from(event.dataTransfer.types).join(', '))
    
    // Check if we have files in the drop data
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0]
      
      // Verify it's an image file
      if (!file.type.startsWith('image/')) {
        log.debug('Dropped file is not an image:', file.type)
        showDropFeedback(target, 'error', 'Only image files are supported')
        return
      }
      
      log.debug('Processing dropped NFT file:', { name: file.name, size: file.size, type: file.type })
      
      // Show processing feedback
      showDropFeedback(target, 'loading', 'Processing NFT...')
      
      // Find the file input for this compose area
      const fileInput = findFileInput(target)
      if (!fileInput) {
        log.error('Could not find file input for compose area')
        showDropFeedback(target, 'error', 'Upload area not found')
        return
      }
      
      // Trigger the file upload
      const uploadSuccess = triggerFileUpload(fileInput, file)
      
      if (uploadSuccess) {
        showDropFeedback(target, 'success', 'NFT uploaded successfully!')
        log.debug('NFT file drop processing completed successfully')
      } else {
        showDropFeedback(target, 'error', 'Upload failed')
      }
      
    } else if (event.dataTransfer.types.includes('text/uri-list') || 
               event.dataTransfer.types.includes('application/json')) {
      // Handle fallback data (URLs or NFT metadata)
      log.debug('Processing fallback drop data')
      showDropFeedback(target, 'loading', 'Processing NFT image...')
      
      let imageUrl: string | null = null
      let nftName = 'NFT'
      
      // Try to get NFT metadata first
      if (event.dataTransfer.types.includes('application/json')) {
        try {
          const nftData = JSON.parse(event.dataTransfer.getData('application/json'))
          if (nftData.type === 'nft' && nftData.image) {
            imageUrl = nftData.image
            nftName = nftData.name || 'NFT'
            log.debug('Using NFT metadata:', { name: nftName, image: imageUrl })
          }
        } catch (error) {
          log.debug('Could not parse NFT metadata:', error)
        }
      }
      
      // Fallback to URI list
      if (!imageUrl && event.dataTransfer.types.includes('text/uri-list')) {
        imageUrl = event.dataTransfer.getData('text/uri-list')
        log.debug('Using URI list:', imageUrl)
      }
      
      if (!imageUrl) {
        log.debug('No valid image URL found in drop data')
        showDropFeedback(target, 'error', 'No valid image data received')
        return
      }
      
      // Validate and convert URL to File object
      try {
        // Security: Validate URL scheme to prevent internal network access
        const url = new URL(imageUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid URL protocol - only HTTP/HTTPS allowed')
        }
        
        const response = await fetch(imageUrl, { mode: 'cors' })
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`)
        }
        
        const blob = await response.blob()
        const filename = `${nftName.replace(/[^a-zA-Z0-9]/g, '_') || 'nft'}.png`
        const file = new File([blob], filename, { type: 'image/png' })
        
        log.debug('Converted URL to file:', { name: file.name, size: file.size, type: file.type })
        
        // Find the file input for this compose area
        const fileInput = findFileInput(target)
        if (!fileInput) {
          log.error('Could not find file input for compose area')
          showDropFeedback(target, 'error', 'Upload area not found')
          return
        }
        
        // Trigger the file upload
        const uploadSuccess = triggerFileUpload(fileInput, file)
        
        if (uploadSuccess) {
          showDropFeedback(target, 'success', 'NFT uploaded successfully!')
          log.debug('NFT URL drop processing completed successfully')
        } else {
          showDropFeedback(target, 'error', 'Upload failed')
        }
        
      } catch (error) {
        log.error('Failed to convert URL to file:', error)
        showDropFeedback(target, 'error', `Failed to process image: ${error.message}`)
      }
      
    } else {
      log.debug('No valid drop data found. Available types:', Array.from(event.dataTransfer.types))
      showDropFeedback(target, 'error', 'No files received')
    }
    
  } catch (error) {
    log.error('Failed to process dropped NFT image:', error)
    showDropFeedback(target, 'error', `Upload failed: ${error.message}`)
  }
}

/**
 * Shows visual feedback for drop operations
 */
function showDropFeedback(target: HTMLElement, type: 'loading' | 'success' | 'error', message: string) {
  // Remove any existing feedback
  const existingFeedback = target.querySelector('.nftory-drop-feedback')
  if (existingFeedback) {
    existingFeedback.remove()
  }
  
  // Create feedback element
  const feedback = document.createElement('div')
  feedback.className = 'nftory-drop-feedback'
  
  let backgroundColor: string
  let textColor: string
  let icon: string
  
  switch (type) {
    case 'loading':
      backgroundColor = 'rgba(29, 155, 240, 0.9)'
      textColor = 'white'
      icon = '⏳'
      break
    case 'success':
      backgroundColor = 'rgba(0, 186, 124, 0.9)'
      textColor = 'white'
      icon = '✅'
      break
    case 'error':
      backgroundColor = 'rgba(249, 24, 128, 0.9)'
      textColor = 'white'
      icon = '❌'
      break
  }
  
  feedback.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${backgroundColor};
    color: ${textColor};
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    pointer-events: none;
    z-index: 1001;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    animation: nftory-fade-in 0.3s ease-out;
  `
  feedback.textContent = `${icon} ${message}`
  
  // Ensure parent has relative positioning
  if (getComputedStyle(target).position === 'static') {
    target.style.position = 'relative'
    target.setAttribute('data-nftory-position-modified', 'true')
  }
  
  target.appendChild(feedback)
  
  // Add fade-in animation if it doesn't exist
  if (!document.querySelector('#nftory-feedback-animations')) {
    const style = document.createElement('style')
    style.id = 'nftory-feedback-animations'
    style.textContent = `
      @keyframes nftory-fade-in {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes nftory-fade-out {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `
    document.head.appendChild(style)
  }
  
  // Auto-remove feedback after delay (except for loading)
  if (type !== 'loading') {
    setTimeout(() => {
      if (feedback.parentElement) {
        feedback.style.animation = 'nftory-fade-out 0.3s ease-in'
        setTimeout(() => {
          feedback.remove()
          
          // Restore position if we modified it
          if (target.hasAttribute('data-nftory-position-modified')) {
            target.style.position = ''
            target.removeAttribute('data-nftory-position-modified')
          }
        }, 300)
      }
    }, type === 'success' ? 2000 : 3000)
  }
  
  log.debug(`Drop feedback shown: ${type} - ${message}`)
}

/**
 * Sets up drag and drop listeners for Twitter compose areas
 */
function setupDropZones() {
  // Comprehensive selectors for Twitter compose areas
  const composeSelectors = [
    // Main compose box selectors
    '[role="textbox"]',
    '[data-testid*="tweetTextarea"]',
    '[data-testid="tweetTextarea_0"]',
    '[data-testid="dmComposerTextInput"]',
    
    // Legacy Draft.js selectors (still used in some contexts)
    '.DraftEditor-editorContainer', 
    '.public-DraftEditor-content',
    '.notranslate.public-DraftEditor-content',
    
    // Alternative Twitter compose structures
    '[contenteditable="true"]',
    '.tweet-box',
    '.compose-text',
    
    // Reply and quote tweet areas
    '[data-testid*="replyTextarea"]',
    '[data-testid*="quoteTextarea"]',
    
    // Modern Twitter selectors (X rebrand and new UI)
    '[aria-label*="Post text"]',
    '[aria-label*="Tweet text"]',
    '[aria-label*="Reply"]'
  ]
  
  let addedListeners = 0
  const processedElements = new Set<Element>()
  
  composeSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector)
      elements.forEach(element => {
        // Avoid duplicates using Set tracking instead of attributes
        if (processedElements.has(element) || element.hasAttribute('data-nftory-dropzone')) {
          return
        }
        
        // Additional filtering - ensure element is actually a compose area
        if (!isValidComposeArea(element)) {
          return
        }
        
        processedElements.add(element)
        element.setAttribute('data-nftory-dropzone', 'true')
        
        // Add drag and drop event listeners
        element.addEventListener('dragover', handleDragOver)
        element.addEventListener('dragleave', handleDragLeave) 
        element.addEventListener('drop', handleDrop)
        
        addedListeners++
        log.debug(`Added drop zone listeners to element: ${selector}`, {
          tagName: element.tagName,
          role: element.getAttribute('role'),
          testId: element.getAttribute('data-testid'),
          ariaLabel: element.getAttribute('aria-label')
        })
      })
    } catch (error) {
      log.debug(`Error processing selector ${selector}:`, error)
    }
  })
  
  if (addedListeners > 0) {
    log.debug(`Set up drop zones on ${addedListeners} elements`)
  } else {
    log.debug('No compose areas found for drop zones')
  }
}

/**
 * Validates that an element is actually a compose area suitable for dropping
 */
function isValidComposeArea(element: Element): boolean {
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
  
  // For contenteditable elements, ensure they're actually editable
  if (element.hasAttribute('contenteditable')) {
    return element.getAttribute('contenteditable') === 'true'
  }
  
  // For textareas and inputs, ensure they're text inputs
  if (element.tagName === 'TEXTAREA') {
    return true
  }
  
  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type
    return type === 'text' || type === 'textarea'
  }
  
  // For role="textbox" elements
  if (element.getAttribute('role') === 'textbox') {
    return true
  }
  
  return false
}

function scanAndInjectNiftoryIcon() {
  // Find all toolbars in replies, tweets, and modals
  const toolbars = document.querySelectorAll('div[data-testid="toolBar"]')
  log.debug(`Found ${toolbars.length} toolbars on page`)
  toolbars.forEach((toolbar, index) => {
    log.debug(`Injecting button into toolbar ${index + 1}`)
    injectButton(toolbar)
  })
  
  // Also set up drop zones for NFT drag and drop
  setupDropZones()
}

// Watch for SPA navigation and DOM updates
const observer = new MutationObserver(() => scanAndInjectNiftoryIcon())
observer.observe(document.documentElement, { childList: true, subtree: true })

/**
 * Removes drag and drop listeners (cleanup)
 */
function removeDropZones() {
  const elements = document.querySelectorAll('[data-nftory-dropzone]')
  elements.forEach(element => {
    element.removeEventListener('dragover', handleDragOver)
    element.removeEventListener('dragleave', handleDragLeave)
    element.removeEventListener('drop', handleDrop)
    element.removeAttribute('data-nftory-dropzone')
  })
  
  log.debug(`Removed drop zone listeners from ${elements.length} elements`)
}

// Cleanup observer when page unloads to prevent memory leaks
const cleanupObserver = () => {
  observer.disconnect()
  removeDropZones()
}

// Listen for page unload events
window.addEventListener('beforeunload', cleanupObserver)
window.addEventListener('pagehide', cleanupObserver)

// For SPA navigation, also listen for visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    cleanupObserver()
  }
})

// First pass on load
scanAndInjectNiftoryIcon()

// Export empty component for Plasmo (content scripts don't need to export components)
export default function () {
  return null
}
