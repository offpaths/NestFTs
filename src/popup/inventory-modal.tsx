import React, { useCallback, useEffect, useState } from "react"

import { useAbstractWallet } from "~hooks/useAbstractWallet"
import type { NFTFetchError, NFTMetadata } from "~services/nft-service"
import {
  formatAddress,
  getChainDisplayName,
  getWalletChainDisplayName
} from "~utils/abstract-wallet"
import { createLogger } from "~utils/logger"
import {
  ANIMATION_CONSTANTS,
  MODAL_CONSTANTS,
  STATUS_CONSTANTS
} from "~utils/ui-constants"

const log = createLogger("InventoryModal")

// Modern clean dark theme
const modernBackgroundStyle = {
  background: "linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 50%, #000000 100%)",
  border: "none",
  borderRadius: "16px",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)"
}

const modernHeaderStyle = {
  background: "transparent",
  padding: "20px 24px 16px 24px",
  fontSize: "16px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontWeight: "600",
  color: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
}

const modernTextStyle = {
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontSize: "14px",
  color: "#ffffff",
  lineHeight: "1.5",
  fontWeight: "400"
}

const modernButtonStyle = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "8px",
  padding: "8px 16px",
  fontSize: "14px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "500",
  transition: "all 0.2s ease",
  boxShadow: "none"
}

const modernPrimaryButtonStyle = {
  background: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "12px 24px",
  fontSize: "14px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  color: "#000000",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
}

const modernCloseStyle = {
  background: "transparent",
  border: "none",
  borderRadius: "8px",
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: "18px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  cursor: "pointer",
  padding: "4px",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "400",
  transition: "all 0.2s ease"
}

type Props = {
  open: boolean
  onClose: () => void
  position: { mode: "center" } | { mode: "anchor"; x: number; y: number }
  nfts: NFTMetadata[]
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
  isLoading = false,
  errors = [],
  fromCache = false,
  nftDataInfo
}: Props) {
  const {
    isConnected,
    address,
    isConnecting,
    isDisconnecting,
    error,
    login,
    logout,
    chain,
    chainId
  } = useAbstractWallet()

  const [selectedNFT, setSelectedNFT] = useState<string | null>(null)
  const [nftFiles, setNftFiles] = useState<Map<string, File>>(new Map())

  // Enhanced retry function with better UX
  const handleRetry = useCallback(() => {
    // Clear existing errors before retry
    window.dispatchEvent(
      new CustomEvent("NFTORY_RETRY_FETCH", {
        detail: { clearErrors: true, timestamp: Date.now() }
      })
    )
  }, [])

  // Handle NFT click to add to compose area
  const handleNFTClick = useCallback(
    async (nft: NFTMetadata) => {
      log.debug(`🎯 NFT clicked: ${nft.name}`)
      setSelectedNFT(nft.id)

      try {
        // Dispatch event to notify content script to handle the upload
        window.dispatchEvent(
          new CustomEvent("NFTORY_NFT_CLICKED", {
            detail: {
              nft,
              file: nftFiles.get(nft.id) || null,
              timestamp: Date.now()
            }
          })
        )

        // Close modal after dispatching event
        setTimeout(() => {
          onClose()
          setSelectedNFT(null)
        }, 100)
      } catch (error) {
        log.error("Failed to handle NFT click:", error)
        setSelectedNFT(null)
      }
    },
    [nftFiles, onClose]
  )

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [onClose])

  // Pre-load NFT files for click-to-add functionality
  useEffect(() => {
    if (open && nfts.length > 0) {
      const loadNFTFiles = async () => {
        const newFiles = new Map<string, File>()

        for (const nft of nfts) {
          try {
            log.debug(`📥 Fetching NFT image: ${nft.name}`)
            const response = await fetch(nft.image, { mode: "cors" })
            if (response.ok) {
              const blob = await response.blob()
              const filename = `${nft.name?.replace(/[^a-zA-Z0-9]/g, "_") || "nft"}.png`
              const file = new File([blob], filename, { type: "image/png" }) // Force PNG type
              newFiles.set(nft.id, file)
              log.debug(
                `✅ Pre-loaded file for NFT: ${nft.name} (${file.size} bytes)`
              )
            } else {
              log.debug(
                `❌ Failed to fetch NFT: ${nft.name} - ${response.status}`
              )
            }
          } catch (error) {
            log.debug(`❌ Error fetching NFT: ${nft.name}`, error)
          }
        }

        setNftFiles(newFiles)
        log.debug(`🎯 File pre-loading complete: ${newFiles.size} files ready`)
      }

      loadNFTFiles()
    }
  }, [open, nfts])

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
        background: "rgba(0,0,0,0.15)"
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
          ...modernBackgroundStyle,
          padding: "0",
          overflow: "hidden"
        }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Modern minimal scrollbar styling */
          .terminal-scroll::-webkit-scrollbar {
            width: 8px;
            background-color: transparent;
          }

          .terminal-scroll::-webkit-scrollbar-track {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }

          .terminal-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            border: none;
          }

          .terminal-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }

          .terminal-scroll::-webkit-scrollbar-button {
            display: none;
          }
        `}</style>
        <header style={modernHeaderStyle}>
          <span
            style={{ ...modernTextStyle, fontSize: "16px", fontWeight: "600" }}>
            Wallet {address && `— ${formatAddress(address)}`}
          </span>
          <button onClick={onClose} aria-label="Close" style={modernCloseStyle}>
            ✕
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 12,
            padding: "12px 16px"
          }}>
          {/* Status indicators */}
          {fromCache && (
            <div
              style={{
                ...modernTextStyle,
                fontSize: 13,
                color: "#34C759",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(52, 199, 89, 0.1)",
                border: "1px solid rgba(52, 199, 89, 0.3)",
                fontWeight: "normal"
              }}>
              [CACHE] DATA FROM LOCAL STORAGE
            </div>
          )}

          {/* Test data indicator */}
          {nftDataInfo?.hasTestData && (
            <div
              style={{
                ...modernTextStyle,
                fontSize: 13,
                color: "#007AFF",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(0, 122, 255, 0.1)",
                border: "1px solid rgba(0, 122, 255, 0.3)",
                fontWeight: "normal",
                lineHeight: 1.4
              }}>
              [TEST]{" "}
              {nftDataInfo.testCount > 0 && nftDataInfo.realCount > 0
                ? `${nftDataInfo.realCount} REAL + ${nftDataInfo.testCount} DEMO ITEMS`
                : nftDataInfo.testCount > 0
                  ? `${nftDataInfo.testCount} DEMO ITEMS LOADED`
                  : "DEMO MODE ACTIVE"}
            </div>
          )}

          {/* Error messages */}
          {errors.length > 0 && errors.some((e) => e.isConfigurationError) && (
            <div
              style={{
                ...modernTextStyle,
                fontSize: 13,
                color: "#FF9500",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 149, 0, 0.1)",
                border: "1px solid rgba(255, 149, 0, 0.3)",
                fontWeight: "normal"
              }}>
              [WARN] CONFIG ERROR: {errors.find((e) => e.isConfigurationError)?.message?.toUpperCase()}
              {errors.find((e) => e.suggestion) && (
                <div style={{ marginTop: 2, fontSize: 8, color: "#ffcc66" }}>
                  > {errors.find((e) => e.suggestion)?.suggestion?.toUpperCase()}
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && errors.some((e) => !e.isConfigurationError) && (
            <div
              style={{
                ...modernTextStyle,
                fontSize: 13,
                color: "#FF453A",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 69, 58, 0.1)",
                border: "1px solid rgba(255, 69, 58, 0.3)",
                fontWeight: "normal",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
              <span>
                [ERROR] {errors.find((e) => !e.isConfigurationError)?.message?.toUpperCase()}
              </span>
              <button
                onClick={handleRetry}
                style={{
                  ...modernTextStyle,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 69, 58, 0.3)",
                  background: "rgba(255, 69, 58, 0.1)",
                  color: "#FF453A",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}>
                RETRY
              </button>
            </div>
          )}
          {isDisconnecting ? (
            <>
              <div
                style={{
                  ...modernTextStyle,
                  fontSize: 10,
                  fontWeight: "normal",
                  marginBottom: 8
                }}>
                > wallet.disconnect() executing...
              </div>
              <div
                style={{
                  ...modernTextStyle,
                  fontSize: 9,
                  fontWeight: "normal",
                  marginBottom: 12,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #333366",
                    borderTop: "2px solid #00ff41",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></div>
                > clearing cache memory...
              </div>
            </>
          ) : !isConnected ? (
            <>
              <div
                style={{
                  ...modernTextStyle,
                  fontSize: 10,
                  fontWeight: "normal",
                  marginBottom: 8
                }}>
                > wallet connection required
              </div>
              <div
                style={{
                  ...modernTextStyle,
                  fontSize: 9,
                  fontWeight: "normal",
                  marginBottom: 12,
                  lineHeight: 1.4
                }}>
                > gasless transactions enabled
                <br />
                > email/social auth supported
                <br />
                > cross-platform nft access
              </div>
              {error && (
                <div
                  style={{
                    ...modernTextStyle,
                    fontSize: 9,
                    color: "#ff4444",
                    padding: "4px 8px",
                    borderRadius: 0,
                    background: "#3a0a0a",
                    border: "1px solid #ff4444",
                    fontWeight: "normal"
                  }}>
                  {error}
                </div>
              )}
              <button
                onClick={login}
                disabled={isConnecting}
                style={{
                  ...modernPrimaryButtonStyle,
                  background: isConnecting
                    ? "rgba(255, 255, 255, 0.3)"
                    : "#ffffff",
                  color: "#000000",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
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
                {isConnecting
                  ? "> connecting..."
                  : "[CONNECT WALLET]"}
              </button>
            </>
          ) : (
            <>
              <div>
                <button
                  onClick={logout}
                  disabled={isDisconnecting}
                  style={{
                    ...modernButtonStyle,
                    opacity: isDisconnecting ? 0.5 : 1,
                    cursor: isDisconnecting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                  {isDisconnecting && (
                    <div
                      style={{
                        ...modernTextStyle,
                        fontSize: "8px",
                        fontWeight: "normal"
                      }}></div>
                  )}
                  {isDisconnecting ? "> disconnecting..." : "[DISCONNECT]"}
                </button>
              </div>
            </>
          )}
        </section>

        <section
          className="terminal-scroll"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            overflowY: "scroll",
            maxHeight: 240,
            opacity: isDisconnecting ? 0.5 : 1,
            pointerEvents: isDisconnecting ? "none" : "auto",
            transition: "opacity 0.2s ease",
            padding: "12px 16px"
          }}>
          {isDisconnecting ? (
            <div
              style={{
                ...modernTextStyle,
                gridColumn: "1 / -1",
                fontSize: 10,
                fontWeight: "normal",
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
              > session terminating...
            </div>
          ) : isLoading ? (
            <div
              style={{
                ...modernTextStyle,
                gridColumn: "1 / -1",
                fontSize: 10,
                fontWeight: "normal",
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
              > loading nft database...
            </div>
          ) : nfts.length === 0 ? (
            <div
              style={{
                ...modernTextStyle,
                gridColumn: "1 / -1",
                fontSize: 10,
                fontWeight: "normal",
                textAlign: "center",
                padding: "20px"
              }}>
              {!isConnected
                ? "> wallet connection required"
                : errors.length > 0
                  ? "> error loading nft data"
                  : "> no nft records found"}
            </div>
          ) : (
            nfts.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNFTClick(n)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "12px",
                  border:
                    selectedNFT === n.id
                      ? "2px solid #ffffff"
                      : "1px solid rgba(255, 255, 255, 0.2)",
                  overflow: "hidden",
                  padding: 0,
                  background: selectedNFT === n.id ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: selectedNFT === n.id
                    ? "0 8px 32px rgba(255, 255, 255, 0.2)"
                    : "0 4px 16px rgba(0, 0, 0, 0.1)"
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
                      alt=""
                      draggable="false"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none"
                      }}
                      onError={(e) => {
                        // Show fallback instead of hiding
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget
                          .nextSibling as HTMLElement
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
                      ...modernTextStyle,
                      width: "100%",
                      height: "100%",
                      display: n.image ? "none" : "grid",
                      placeItems: "center",
                      fontSize: 8,
                      fontWeight: "normal",
                      textAlign: "center",
                      padding: 4,
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.6)"
                    }}>
                    [IMG]
                    <br />
                    {(n.name || "nft").toLowerCase()}
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
