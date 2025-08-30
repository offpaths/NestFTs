import React, { useEffect } from "react"

import { useAbstractWallet } from "~hooks/useAbstractWallet"
import type { NFTFetchError, NFTMetadata } from "~services/nft-service"
import { formatAddress, getChainDisplayName, getWalletChainDisplayName } from "~utils/abstract-wallet"

type Props = {
  open: boolean
  onClose: () => void
  position: { mode: "center" } | { mode: "anchor"; x: number; y: number }
  nfts: NFTMetadata[]
  onPickNFT: (nft: NFTMetadata) => void
  isLoading?: boolean
  errors?: NFTFetchError[]
  fromCache?: boolean
}

function InventoryModal({
  open,
  onClose,
  position,
  nfts,
  onPickNFT,
  isLoading = false,
  errors = [],
  fromCache = false
}: Props) {
  const { isConnected, address, isConnecting, error, login, logout, chain, chainId } =
    useAbstractWallet()

  // Retry function for failed NFT loads
  const handleRetry = () => {
    // Trigger a refresh by calling onClose and then reopening
    // In a real implementation, you might want a more direct retry mechanism
    window.dispatchEvent(new CustomEvent("NFTORY_RETRY_FETCH"))
  }
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
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
          {/* Status indicators */}
          {fromCache && (
            <div
              style={{
                fontSize: 11,
                color: "rgb(255, 212, 59)",
                padding: "4px 8px",
                borderRadius: 4,
                background: "rgba(255, 212, 59, 0.1)",
                border: "1px solid rgba(255, 212, 59, 0.3)"
              }}>
              📄 Showing cached results
            </div>
          )}

          {/* Error messages */}
          {errors.length > 0 && errors.some((e) => e.isConfigurationError) && (
            <div
              style={{
                fontSize: 12,
                color: "rgb(255, 204, 102)",
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(255, 204, 102, 0.1)",
                border: "1px solid rgba(255, 204, 102, 0.3)"
              }}>
              ⚠️ Configuration needed:{" "}
              {errors.find((e) => e.isConfigurationError)?.message}
              {errors.find((e) => e.suggestion) && (
                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9 }}>
                  💡 {errors.find((e) => e.suggestion)?.suggestion}
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && errors.some((e) => !e.isConfigurationError) && (
            <div
              style={{
                fontSize: 12,
                color: "rgb(255, 107, 107)",
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(255, 107, 107, 0.1)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
              <span>
                ❌ {errors.find((e) => !e.isConfigurationError)?.message}
              </span>
              <button
                onClick={handleRetry}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid rgba(255, 107, 107, 0.5)",
                  background: "rgba(255, 107, 107, 0.1)",
                  color: "rgb(255, 107, 107)",
                  cursor: "pointer",
                  fontSize: 10
                }}>
                Retry
              </button>
            </div>
          )}
          {!isConnected ? (
            <>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                Connect your wallet to view NFTs
              </div>
              <div style={{ 
                fontSize: 11, 
                opacity: 0.6, 
                marginBottom: 12,
                lineHeight: 1.4
              }}>
                ✨ Abstract provides gasless transactions<br/>
                🔒 Create account with email or social login<br/>
                🌍 Access your NFTs across all apps
              </div>
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#ff6b6b",
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(255,107,107,0.1)"
                  }}>
                  {error}
                </div>
              )}
              <button
                onClick={login}
                disabled={isConnecting}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  border: "1px solid rgb(29,155,240)",
                  background: isConnecting
                    ? "rgba(29,155,240,0.1)"
                    : "rgb(29,155,240)",
                  color: isConnecting ? "rgba(255,255,255,0.7)" : "#fff",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}>
                {isConnecting && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid #fff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                )}
                {isConnecting ? "Connecting to Abstract..." : "🚀 Connect with Abstract"}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Connected wallet
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(29,155,240,0.1)",
                  border: "1px solid rgba(29,155,240,0.3)"
                }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, color: "rgb(29,155,240)" }}>
                    {address && formatAddress(address)}
                  </span>
                  {/* Show actual wallet chain, not NFT fetching chain */}
                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.8,
                      color: "rgb(29,155,240)"
                    }}>
                    {getWalletChainDisplayName(chainId || 1)} → Ethereum NFTs
                  </span>
                </div>
                <button
                  onClick={logout}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "none",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12
                  }}>
                  Disconnect
                </button>
              </div>
            </>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            overflow: "auto",
            maxHeight: 240
          }}>
          {isLoading ? (
            <div
              style={{
                gridColumn: "1 / -1",
                opacity: 0.7,
                fontSize: 13,
                textAlign: "center",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(29,155,240,0.3)",
                  borderTop: "2px solid rgb(29,155,240)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
              Loading NFTs...
            </div>
          ) : nfts.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                opacity: 0.7,
                fontSize: 13,
                textAlign: "center",
                padding: "20px"
              }}>
              {!isConnected
                ? "Connect your wallet to view NFTs"
                : errors.length > 0
                  ? "Failed to load NFTs - check the errors above"
                  : "No NFTs found in your wallet"}
            </div>
          ) : (
            nfts.map((n) => (
              <button
                key={n.id}
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
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    background: "rgba(239,243,244,0.1)"
                  }}>
                  {n.image ? (
                    <img
                      src={n.image}
                      alt={n.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                      onError={(e) => {
                        // Show fallback instead of hiding
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget.nextSibling as HTMLElement
                        if (fallback) {
                          fallback.style.display = "grid"
                        }
                      }}
                      onLoad={() => {
                        console.log(`Successfully loaded NFT image: ${n.name}`)
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: n.image ? "none" : "grid",
                      placeItems: "center",
                      opacity: 0.6,
                      fontSize: 10,
                      textAlign: "center",
                      padding: 4,
                      background: "rgba(239,243,244,0.1)"
                    }}>
                    🖼️<br />
                    {n.name || "NFT"}
                  </div>
                </div>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

export default InventoryModal
