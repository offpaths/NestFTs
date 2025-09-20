// UI Constants for consistent styling and positioning

// Button dimensions and styling
export const BUTTON_CONSTANTS = {
  // Twitter/X toolbar button dimensions
  WIDTH: "34px",
  HEIGHT: "34px",
  MARGIN_LEFT: "4px",
  BORDER_RADIUS: "9999px",

  // SVG icon dimensions
  ICON_WIDTH: "18",
  ICON_HEIGHT: "18",

  // Colors matching Twitter/X theme
  ICON_COLOR: "rgb(231, 233, 234)", // Secondary gray
  ICON_FILL_COLOR: "rgb(29,155,240)", // Twitter blue
  HOVER_BG_COLOR: "rgba(239, 243, 244, 0.1)"
} as const

// Modal positioning and dimensions
export const MODAL_CONSTANTS = {
  // Main modal dimensions
  WIDTH: 360,
  MAX_WIDTH: "90vw",
  MAX_HEIGHT: "70vh",
  PADDING: 16,
  BORDER_RADIUS: 12,

  // Simple positioning offsets
  ANCHOR_OFFSET_Y: 12, // Shift modal down from click point
  ANCHOR_OFFSET_X: 160, // Shift modal left from click point
  EDGE_PADDING: 16, // Minimum distance from screen edges

  // Grid layout for NFT items
  NFT_GRID_COLUMNS: "repeat(3, 1fr)",
  NFT_GRID_GAP: 8,
  NFT_MAX_SCROLL_HEIGHT: 240,

  // Colors
  BACKGROUND_COLOR: "rgb(21,32,43)", // Dark blue background
  TEXT_COLOR: "#fff",
  BORDER_COLOR: "rgba(239,243,244,0.2)",
  BOX_SHADOW: "0 8px 28px rgba(0,0,0,0.6)",
  OVERLAY_COLOR: "rgba(0,0,0,0.3)",

  // Z-index
  Z_INDEX: 2147483647 // Maximum safe z-index value
} as const

// Viewport positioning constants (additive enhancement)
export const VIEWPORT_CONSTANTS = {
  // Safe distances from viewport edges
  VIEWPORT_EDGE_PADDING: 12, // Minimum distance from any viewport edge
  VIEWPORT_CORNER_PADDING: 16, // Extra padding when positioned in corners

  // Viewport detection thresholds
  CUTOFF_THRESHOLD: 10, // Pixels of modal that can be outside viewport before repositioning

  // Positioning preferences (in order of priority)
  PREFERRED_POSITIONS: [
    'bottom-right', // Default: below and to the right of anchor
    'bottom-left',  // Below and to the left
    'top-right',    // Above and to the right
    'top-left',     // Above and to the left
    'bottom-center', // Directly below
    'top-center',   // Directly above
    'center-right', // Right side, vertically centered
    'center-left'   // Left side, vertically centered
  ] as const,

  // Transform origins for smooth positioning
  TRANSFORM_ORIGINS: {
    'bottom-right': 'top left',
    'bottom-left': 'top right',
    'top-right': 'bottom left',
    'top-left': 'bottom right',
    'bottom-center': 'top center',
    'top-center': 'bottom center',
    'center-right': 'center left',
    'center-left': 'center right',
    'center': 'center'
  } as const
} as const

// Status indicators and error styling
export const STATUS_CONSTANTS = {
  // Cache indicator
  CACHE_COLOR: "rgb(255, 212, 59)",
  CACHE_BG_COLOR: "rgba(255, 212, 59, 0.1)",
  CACHE_BORDER_COLOR: "rgba(255, 212, 59, 0.3)",

  // Configuration warning
  CONFIG_WARNING_COLOR: "rgb(255, 204, 102)",
  CONFIG_WARNING_BG_COLOR: "rgba(255, 204, 102, 0.1)",
  CONFIG_WARNING_BORDER_COLOR: "rgba(255, 204, 102, 0.3)",

  // Error state
  ERROR_COLOR: "rgb(255, 107, 107)",
  ERROR_BG_COLOR: "rgba(255, 107, 107, 0.1)",
  ERROR_BORDER_COLOR: "rgba(255, 107, 107, 0.3)",

  // Success/primary button
  PRIMARY_COLOR: "rgb(29,155,240)",
  PRIMARY_DISABLED_BG: "rgba(29,155,240,0.1)",
  PRIMARY_DISABLED_TEXT: "rgba(255,255,255,0.7)",

  // Connected wallet
  WALLET_BG_COLOR: "rgba(29,155,240,0.1)",
  WALLET_BORDER_COLOR: "rgba(29,155,240,0.3)",

  // Font sizes
  FONT_SIZE_SMALL: 10,
  FONT_SIZE_DEFAULT: 11,
  FONT_SIZE_MEDIUM: 12,
  FONT_SIZE_LARGE: 13,
  FONT_SIZE_HEADER: 14,

  // Wallet dropdown colors
  DROPDOWN_BG_COLOR: "rgba(255, 255, 255, 0.1)",
  DROPDOWN_BORDER_COLOR: "rgba(255, 255, 255, 0.2)",
  DROPDOWN_HOVER_BG_COLOR: "rgba(255, 255, 255, 0.15)",
  DROPDOWN_DISCONNECT_COLOR: "#FF453A",
  DROPDOWN_DISCONNECT_BG_COLOR: "rgba(255, 69, 58, 0.1)",
  DROPDOWN_DISCONNECT_HOVER_BG_COLOR: "rgba(255, 69, 58, 0.2)"
} as const

// Animation and timing constants
export const ANIMATION_CONSTANTS = {
  // Button hover transition
  BUTTON_TRANSITION: "background-color 0.2s ease-in-out",

  // Button state transitions
  ALL_TRANSITION: "all 0.2s ease",

  // Spinner animation duration
  SPIN_DURATION: "1s",

  // Loading spinner dimensions
  SPINNER_SIZE_SMALL: 14,
  SPINNER_SIZE_MEDIUM: 16,
  SPINNER_BORDER_WIDTH: "2px",

  // Modal animation constants
  MODAL_ENTER_DURATION: "100ms",
  MODAL_EXIT_DURATION: "80ms",
  MODAL_TIMING_FUNCTION: "cubic-bezier(0.34, 1.56, 0.64, 1)", // snappy ease-out with slight overshoot
  MODAL_SCALE_START: 0,
  MODAL_SCALE_END: 1,

  // Transform origins for all 4 quadrants
  MODAL_TRANSFORM_ORIGIN_TOP_LEFT: "top left",
  MODAL_TRANSFORM_ORIGIN_TOP_RIGHT: "top right",
  MODAL_TRANSFORM_ORIGIN_BOTTOM_LEFT: "bottom left",
  MODAL_TRANSFORM_ORIGIN_BOTTOM_RIGHT: "bottom right",
  MODAL_TRANSFORM_ORIGIN_TOP_CENTER: "top center",
  MODAL_TRANSFORM_ORIGIN_BOTTOM_CENTER: "bottom center",
  MODAL_TRANSFORM_ORIGIN_CENTER_LEFT: "center left",
  MODAL_TRANSFORM_ORIGIN_CENTER_RIGHT: "center right",
  MODAL_TRANSFORM_ORIGIN_CENTER: "center",

  OVERLAY_FADE_DURATION: "120ms",

  // Wallet dropdown animation constants
  DROPDOWN_EXPAND_DURATION: "200ms",
  DROPDOWN_SLIDE_DURATION: "190ms",
  DROPDOWN_TIMING_FUNCTION: "cubic-bezier(0.16, 1, 0.3, 1)", // Smooth ease-out
  DROPDOWN_HOVER_DELAY: "100ms" // Small delay before showing disconnect option
} as const

// API and cache timing constants
export const TIMING_CONSTANTS = {
  // Cache duration (5 minutes in milliseconds)
  NFT_CACHE_DURATION: 5 * 60 * 1000,

  // API timeouts
  API_TIMEOUT: 15000, // 15 seconds
  RATE_LIMIT_DELAY: 1000, // 1 second

  // Retry delays
  RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff
  RETRY_MAX_ATTEMPTS: 3
} as const

// Validation constants
export const VALIDATION_CONSTANTS = {
  // API key validation
  MIN_API_KEY_LENGTH: 10,
  ALCHEMY_KEY_PREFIX: "alcht_",

  // NFT limits
  MAX_NFTS_PER_REQUEST: 50,

  // Image validation
  SUPPORTED_IMAGE_EXTENSIONS: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg"
  ],

  // Trusted domains for NFT images
  TRUSTED_DOMAINS: [
    "ipfs.io",
    "gateway.pinata.cloud",
    "cloudflare-ipfs.com",
    "i.seadn.io",
    "openseauserdata.com",
    "nft-cdn.alchemy.com",
    "res.cloudinary.com",
    "arweave.net",
    "gateway.arweave.net",
    "gateway.ipfs.io",
    "api.alchemy.com"
  ]
} as const
