import React, { useEffect } from "react"

import { useAbstractWallet } from "~hooks/useAbstractWallet"
import type { NFTFetchError, NFTMetadata } from "~services/nft-service"
import { formatAddress, getChainDisplayName, getWalletChainDisplayName } from "~utils/abstract-wallet"
import { createLogger } from "~utils/logger"
import { MODAL_CONSTANTS, STATUS_CONSTANTS, ANIMATION_CONSTANTS } from "~utils/ui-constants"

const log = createLogger('InventoryModal')

type Props = {
  open: boolean
  onClose: () => void
  position: { mode: "center" } | { mode: "anchor"; x: number; y: number }
  nfts: NFTMetadata[]
  onPickNFT: (nft: NFTMetadata) => void
  isLoading?: boolean
  errors?: NFTFetchError[]
  fromCache?: boolean
  nftDataInfo?: { testCount: number; realCount: number; hasTestData: boolean }
}

function InventoryModal({
  open,
  onClose,
  position,
  nfts,
  onPickNFT,
  isLoading = false,
  errors = [],
  fromCache = false,
  nftDataInfo
}: Props) {
  const { isConnected, address, isConnecting, error, login, logout, chain, chainId } =
    useAbstractWallet()

  // Enhanced retry function with better UX
  const handleRetry = () => {
    // Clear existing errors before retry
    window.dispatchEvent(new CustomEvent("NFTORY_RETRY_FETCH", {
      detail: { clearErrors: true, timestamp: Date.now() }
    }))
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
          top: `${position.y + MODAL_CONSTANTS.ANCHOR_OFFSET_Y}px`,
          /*
          Subtracting offset pixels shifts the modal leftwards to align it properly relative to the anchor.
          This accounts for the modal width and desired alignment so 
          the modal doesn't appear strictly to the right of the click.

          Edge padding prevents the modal from being cut off at the edge
          */
          left: `${Math.max(position.x - MODAL_CONSTANTS.ANCHOR_OFFSET_X, MODAL_CONSTANTS.EDGE_PADDING)}px`
        }
      : {}

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: MODAL_CONSTANTS.Z_INDEX,
        display: "grid",
        placeItems: position.mode === "center" ? "center" : "start",
        background: MODAL_CONSTANTS.OVERLAY_COLOR
      }}
      onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: position.mode === "center" ? "relative" : "absolute",
          ...anchored,
          width: MODAL_CONSTANTS.WIDTH,
          maxWidth: MODAL_CONSTANTS.MAX_WIDTH,
          maxHeight: MODAL_CONSTANTS.MAX_HEIGHT,
          background: MODAL_CONSTANTS.BACKGROUND_COLOR,
          color: MODAL_CONSTANTS.TEXT_COLOR,
          border: `1px solid ${MODAL_CONSTANTS.BORDER_COLOR}`,
          borderRadius: MODAL_CONSTANTS.BORDER_RADIUS,
          boxShadow: MODAL_CONSTANTS.BOX_SHADOW,
          padding: MODAL_CONSTANTS.PADDING,
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
                color: STATUS_CONSTANTS.CACHE_COLOR,
                padding: "4px 8px",
                borderRadius: 4,
                background: STATUS_CONSTANTS.CACHE_BG_COLOR,
                border: `1px solid ${STATUS_CONSTANTS.CACHE_BORDER_COLOR}`
              }}>
              📄 Showing cached results
            </div>
          )}

          {/* Test data indicator */}
          {nftDataInfo?.hasTestData && (
            <div
              style={{
                fontSize: 11,
                color: "rgb(138, 180, 248)",
                padding: "6px 10px",
                borderRadius: 6,
                background: "rgba(138, 180, 248, 0.1)",
                border: "1px solid rgba(138, 180, 248, 0.3)",
                lineHeight: 1.4
              }}>
              🧪 {nftDataInfo.testCount > 0 && nftDataInfo.realCount > 0 
                ? `Showing ${nftDataInfo.realCount} real NFTs + ${nftDataInfo.testCount} test demos`
                : nftDataInfo.testCount > 0 
                  ? `Showing ${nftDataInfo.testCount} demo NFTs - real NFTs will appear when available`
                  : 'Test data detected'
              }
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
                        log.debug(`Successfully loaded NFT image: ${n.name}`)
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
