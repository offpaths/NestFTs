import { Socket } from "dgram"
import cssText from "data-text:~style.css"
import { TableIcon } from "lucide-react"
import type { PlasmoCSConfig } from "plasmo"

import { CountButton } from "~features/count-button"

export const config: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://x.com/*"],
  run_at: "document_idle"
}

const BTN_ID = "sf-nft-backpack-italic-neighbor"

document.querySelectorAll('div[data-testid="toolBar"]')

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

/**
 * Returns the footer row that contains the formatting icons on the left
 * and the Reply button on the right.
 */
function findComposerFooter(toolbar: Element): HTMLElement | null {
  // Start from the known toolbar and climb to the footer row
  // The footer row contains both the group of icons and the Reply button.
  const group = toolbar.closest('[data-testid="toolBar"]')
  // In most layouts the footer is the toolbar's parent element
  const footer = group?.parentElement as HTMLElement | null
  return footer ?? null
}

function createNFTButton(): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.id = BTN_ID
  btn.type = "button"
  btn.setAttribute("aria-label", "NFT Inventory")

  // Make it visually consistent with other buttons in the row
  btn.style.display = "inline-flex"
  btn.style.alignItems = "center"
  btn.style.justifyContent = "center"
  btn.style.width = "34px"
  btn.style.height = "34px"
  btn.style.marginLeft = "4px"
  btn.style.border = "none"
  btn.style.background = "transparent"
  btn.style.cursor = "pointer"
  btn.style.borderRadius = "9999px"
  btn.style.transition = "background-color 0.2s ease-in-out"
  btn.style.color = "rgb(231, 233, 234)" // matches Twitter/X icons in dark mode

  // Hover effect like native buttons
  btn.addEventListener("mouseenter", () => {
    btn.style.backgroundColor = "rgba(239, 243, 244, 0.1)"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.backgroundColor = "transparent"
  })

  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 6.5l10 5v8l-10-5-10 5v-8l10-5z" 
        fill="rgb(29,155,240)"/>
    </svg>
  `

  btn.addEventListener("click", (e) => {
    e.stopPropagation()
    console.log("NFT button clicked")
    // TODO: Open NFT picker popup here
  })

  return btn
}

function injectButton(toolbar: Element) {
  // Avoid duplicates
  if (toolbar.querySelector(`#${BTN_ID}`)) return

  // Find the scroll snap list container
  const scrollSnapList = toolbar.querySelector(
    '[data-testid="ScrollSnap-List"]'
  )
  if (!scrollSnapList) return

  // Append our button to the end of the scroll snap list
  const nftBtn = createNFTButton()
  scrollSnapList.appendChild(nftBtn)
}

function scanAndInject() {
  // Find all toolbars in replies, tweets, and modals
  const toolbars = document.querySelectorAll('div[data-testid="toolBar"]')
  toolbars.forEach(injectButton)
}

// Watch for SPA navigation and DOM updates
const observer = new MutationObserver(() => scanAndInject())
observer.observe(document.documentElement, { childList: true, subtree: true })

// First pass on load
export default scanAndInject()
