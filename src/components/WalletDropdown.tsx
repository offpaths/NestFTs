import React, { useCallback, useEffect, useRef, useState } from "react"
import { type Address } from "viem"

import {
  formatAddress,
  getWalletChainDisplayName
} from "~utils/abstract-wallet"
import { ANIMATION_CONSTANTS, STATUS_CONSTANTS } from "~utils/ui-constants"

interface WalletInfo {
  address: Address
  chainId?: number
  name: string
  isActive: boolean
}

interface WalletDropdownProps {
  address?: Address
  chainId?: number
  onDisconnect: () => Promise<void>
  isDisconnecting?: boolean
}

const modernTextStyle = {
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontSize: "14px",
  color: "#ffffff",
  lineHeight: "1.5",
  fontWeight: "400"
}

export function WalletDropdown({
  address,
  chainId,
  onDisconnect,
  isDisconnecting = false
}: WalletDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownListRef = useRef<HTMLDivElement>(null)

  // For now, we have one wallet but prepare for multiple wallets
  const connectedWallets: WalletInfo[] = address
    ? [
        {
          address,
          chainId,
          name: chainId
            ? getWalletChainDisplayName(chainId)
            : formatAddress(address),
          isActive: true
        }
      ]
    : []

  const activeWallet = connectedWallets.find((w) => w.isActive)
  const displayName = activeWallet?.name || "Wallet"

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Check if click is inside EITHER the trigger button OR the dropdown list
      const isInsideTrigger = dropdownRef.current?.contains(target)
      const isInsideDropdown = dropdownListRef.current?.contains(target)

      // Only close if clicking outside both trigger and dropdown
      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleDisconnect = useCallback(
    async (walletAddress: Address) => {
      if (isDisconnecting) return
      await onDisconnect()
    },
    [onDisconnect, isDisconnecting]
  )

  const toggleDropdown = useCallback(() => {
    if (connectedWallets.length === 0) return
    setIsOpen((prev) => !prev)
  }, [connectedWallets.length])

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center"
      }}>
      {/* Main dropdown trigger */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation()
          toggleDropdown()
        }}
        style={{
          ...modernTextStyle,
          fontSize: "16px",
          fontWeight: "600",
          background: STATUS_CONSTANTS.DROPDOWN_BG_COLOR,
          border: `1px solid ${STATUS_CONSTANTS.DROPDOWN_BORDER_COLOR}`,
          borderRadius: "8px",
          padding: "6px 12px",
          cursor: connectedWallets.length > 0 ? "pointer" : "default",
          transition: `all ${ANIMATION_CONSTANTS.DROPDOWN_EXPAND_DURATION} ${ANIMATION_CONSTANTS.DROPDOWN_TIMING_FUNCTION}`,
          backgroundColor: isOpen
            ? STATUS_CONSTANTS.DROPDOWN_HOVER_BG_COLOR
            : STATUS_CONSTANTS.DROPDOWN_BG_COLOR,
          minWidth: "250px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px"
        }}>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "left"
          }}>
          {displayName}
        </span>

        {/* Dropdown indicator */}
        {connectedWallets.length > 0 && (
          <span
            style={{
              fontSize: "12px",
              opacity: 0.6,
              transition: `transform ${ANIMATION_CONSTANTS.DROPDOWN_SLIDE_DURATION} ease`,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}>
            ▼
          </span>
        )}
      </button>

      {/* Dropdown list */}
      {isOpen && connectedWallets.length > 0 && (
        <div
          ref={dropdownListRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: "-40px",
            marginTop: "4px",
            marginRight: "40px",
            background:
              "linear-gradient(135deg, #3b82f6  0%, #1e3a8a 50%, #000000 100%)",
            border: `1px solid ${STATUS_CONSTANTS.DROPDOWN_BORDER_COLOR}`,
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 1000,
            overflow: "hidden",
            animation: `slideDown ${ANIMATION_CONSTANTS.DROPDOWN_EXPAND_DURATION} ${ANIMATION_CONSTANTS.DROPDOWN_TIMING_FUNCTION}`
          }}>
          {connectedWallets.map((wallet) => (
            <div
              key={wallet.address}
              style={{
                position: "relative",
                transition: `all ${ANIMATION_CONSTANTS.ALL_TRANSITION}`
              }}
              onMouseEnter={() => setHoveredWallet(wallet.address)}
              onMouseLeave={() => setHoveredWallet(null)}>
              {/* Wallet info */}
              <div
                style={{
                  ...modernTextStyle,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  background:
                    hoveredWallet === wallet.address
                      ? STATUS_CONSTANTS.DROPDOWN_HOVER_BG_COLOR
                      : "transparent",
                  cursor: "default",
                  transition: `all ${ANIMATION_CONSTANTS.ALL_TRANSITION}`
                }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                  <span>{wallet.name}</span>
                  {wallet.isActive && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#34C759",
                        fontWeight: "500"
                      }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.7,
                    fontFamily: "monospace"
                  }}>
                  {formatAddress(wallet.address)}
                </div>
              </div>

              {/* Disconnect button that slides in on hover */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  paddingRight: "12px",
                  background:
                    hoveredWallet === wallet.address
                      ? "linear-gradient(90deg, transparent 0%, #1e3a8a 30%, #000000 100%)"
                      : "transparent",
                  transform:
                    hoveredWallet === wallet.address
                      ? "translateX(0)"
                      : "translateX(100%)",
                  transition: `all ${ANIMATION_CONSTANTS.DROPDOWN_SLIDE_DURATION} ${ANIMATION_CONSTANTS.DROPDOWN_TIMING_FUNCTION}`,
                  opacity: hoveredWallet === wallet.address ? 1 : 0
                }}>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleDisconnect(wallet.address)}
                  disabled={isDisconnecting}
                  style={{
                    ...modernTextStyle,
                    background: STATUS_CONSTANTS.DROPDOWN_DISCONNECT_BG_COLOR,
                    border: `1px solid ${STATUS_CONSTANTS.DROPDOWN_DISCONNECT_COLOR}`,
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "500",
                    color: STATUS_CONSTANTS.DROPDOWN_DISCONNECT_COLOR,
                    cursor: isDisconnecting ? "not-allowed" : "pointer",
                    opacity: isDisconnecting ? 0.5 : 1,
                    transition: `all ${ANIMATION_CONSTANTS.ALL_TRANSITION}`,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                  {isDisconnecting ? (
                    <>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          border: `1px solid ${STATUS_CONSTANTS.DROPDOWN_DISCONNECT_COLOR}`,
                          borderTop: "1px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite"
                        }}
                      />
                      Disconnecting
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "9px" }}>✕</span>
                      Disconnect
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
