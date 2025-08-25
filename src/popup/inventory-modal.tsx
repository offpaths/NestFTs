import React, { useEffect } from "react"

type Props = {
  open: Boolean
  onClose: () => void
  position: { mode: "center" } | { mode: "anchor"; x: number; y: number }
  wallets: string[]
  onWalletConnect: (wallet: string) => void
  nfts: Array<{ id?: string; src?: string; title?: string }>
  onPickNFT: (nft: any) => void
}

function InventoryModal({
  open,
  onClose,
  position,
  wallets,
  onWalletConnect,
  nfts,
  onPickNFT
}: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [onClose])

  if (!open) return null

  const anchored =
    position.mode === "anchor"
      ? {
          /*
            12 shift the anchor point downwards a little so the inventory
            does not go over the button
          */
          top: `${position.y + 12}px`,
          /*
          Subtracting 160 pixels shifts the modal leftwards to align it properly relative to the anchor.
          This likely accounts for the modal width or desired alignment so 
          the modal doesn’t appear strictly to the right of the click.

          12 stops the inventory from being cut of at the edge
          */
          left: `${Math.max(position.x - 160, 12)}px`
        }
      : {}

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647, // max
        display: "grid",
        placeItems: position.mode === "center" ? "center" : "start",
        background: "rgba(0,0,0,0.3)"
      }}
      onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: position.mode === "center" ? "relative" : "absolute",
          ...anchored,
          width: 360,
          maxWidth: "90vw",
          maxHeight: "70vh",
          background: "rgb(21,32,43)",
          color: "#fff",
          border: "1px solid rgba(239,243,244,0.2)",
          borderRadius: 12,
          boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
          padding: 16,
          overflow: "hidden"
        }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12
          }}>
          <div style={{ fontWeight: 700 }}>Select an NFT</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              width: 32,
              height: 32,
              borderRadius: 16
            }}>
            ✕
          </button>
        </header>

        <section style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Connect a wallet</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {wallets.map((w) => (
              <button
                key={w}
                onClick={() => onWalletConnect(w)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(239,243,244,0.2)",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer"
                }}>
                {w}
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            overflow: "auto",
            maxHeight: 240
          }}>
          {nfts.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", opacity: 0.7, fontSize: 13 }}>
              Your NFTs will appear here after connecting
            </div>
          ) : (
            nfts.map((n) => (
              <button
                key={n.id ?? n.src ?? Math.random()}
                onClick={() => onPickNFT(n)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 8,
                  border: "1px solid rgba(239,243,244,0.2)",
                  overflow: "hidden",
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer"
                }}>
                {n.src ? (
                  <img
                    src={n.src}
                    alt={n.title ?? "NFT"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      opacity: 0.6,
                      fontSize: 12
                    }}>
                    No image
                  </div>
                )}
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

export default InventoryModal
