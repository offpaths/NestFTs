import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"

import InventoryModal from "~popup/inventory-modal"
import AppConfig from "~utils/app-config"
import globalContentConfig from "~utils/content-config"

export const plasmoconfig = globalContentConfig

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

function App() {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    console.log("we in useffect")
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x?: number; y?: number }

      if (detail?.x && detail?.y) setAnchor({ x: detail.x, y: detail.y })

      setOpen((o) => !o)
    }

    window.addEventListener(
      AppConfig.TOGGLE_EVENT_TYPE,
      onToggle as EventListener
    )
    return () =>
      window.removeEventListener(
        AppConfig.TOGGLE_EVENT_TYPE,
        onToggle as EventListener
      )
  }, [])

  const position = useMemo(() => {
    if (!anchor) return { mode: "center" as const }
    return { mode: "anchor" as const, x: anchor.x, y: anchor.y }
  }, [anchor])

  return (
    <>
      <InventoryModal
        open={open}
        onClose={() => setOpen(false)}
        position={position}
        wallets={["MetaMask", "WalletConnect", "Solana", "Abstract"]}
        onWalletConnect={(w) => console.log("connect", w)}
        nfts={
          [
            /*fetch nfts*/
          ]
        }
        onPickNFT={(n) => console.log("picked", n)}
      />
    </>
  )
}

const { rootEL } = ensureShadowRoot()
createRoot(rootEL).render(<App />)
