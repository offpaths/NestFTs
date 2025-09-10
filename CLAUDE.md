# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Plasmo-based Chrome Extension MV3** project called "Niftory" that adds NFT inventory functionality to Twitter/X. It injects a custom button into Twitter's toolbar and provides a modal interface for viewing NFT collections.

## Development Commands

```bash
# Start development server (auto-reload enabled)
npm run dev
# or
pnpm dev

# Create production build
npm run build
# or  
pnpm build

# Package extension for distribution
npm run package
# or
pnpm package
```

After running `dev`, load the extension from `build/chrome-mv3-dev` in your browser's extension developer mode.

## Architecture & Key Concepts

### Plasmo Framework Structure
- **Content Scripts**: `src/contents/` - Code injected into Twitter/X pages
  - `inventory-button.tsx` - Injects NFT buttons into Twitter toolbars
  - `inventory-modal-ui.tsx` - Renders the NFT selection modal in Shadow DOM
- **Popup**: `src/popup/` - Extension popup UI and modal components
  - `inventory-modal.tsx` - Main modal component with wallet connection and NFT grid
- **Background**: `src/background/` - Service worker scripts (empty directory currently)
- **Utils**: Shared configuration and utilities
  - `app-config.tsx` - Centralized constants for DOM IDs and event types
  - `content-config.tsx` - Content script configuration

### Core Components

#### Content Script Architecture (`src/contents/inventory-button.tsx`)
- **DOM Injection Strategy**: Uses MutationObserver to watch for Twitter's SPA navigation and dynamically inject NFT inventory buttons into all toolbars (`div[data-testid="toolBar"]`)
- **Shadow DOM Styling**: Custom CSS processing via `getStyle()` function that:
  - Converts Tailwind's `:root` selectors to `:host(plasmo-csui)` for Shadow DOM compatibility
  - Converts `rem` units to pixel values using a 16px base font size
  - Ensures consistent styling regardless of host page's font size
- **Event System**: Uses custom DOM events (`NFTORY_TOGGLE_NFT_MODAL`) for component communication
- **Button Integration**: Injects buttons into `[data-testid="ScrollSnap-List"]` containers within toolbars
- **Drag & Drop System**: Comprehensive drop zone setup for Twitter compose areas:
  - Multi-selector approach covering legacy and modern Twitter UI elements
  - Smart file input discovery with proximity-based fallback
  - Validates compose areas and file inputs for compatibility
  - Handles drag feedback with visual indicators

#### Modal System (`src/contents/inventory-modal-ui.tsx`)
- **Shadow DOM Management**: Uses `ensureShadowRoot()` to create isolated Shadow DOM containers
- **Event Handling**: Listens for toggle events with coordinate data for positioning
- **React Integration**: Uses `createRoot()` to render React components within Shadow DOM

#### NFT Modal Component (`src/popup/inventory-modal.tsx`)
- **Drag Implementation**: NFT images are draggable with pre-loaded File objects
- **File Pre-loading**: Converts NFT images to proper File objects for native drag behavior
- **Auto-close on Drag**: Modal closes automatically during drag to reveal drop zones
- **Event Communication**: Dispatches selection events for cross-component communication

#### Configuration System (`src/utils/app-config.tsx`)
- Centralized constants for DOM IDs (`nftory-nft-inventory-icon`, `nftory-nft-inventory-modal`)
- Event types (`NFTORY_TOGGLE_NFT_MODAL`)
- Prevents ID conflicts and enables consistent component identification

### Styling Architecture
- **Tailwind CSS**: Main styling framework with `plasmo-` prefix to avoid host page conflicts
- **Shadow DOM Adaptation**: Custom CSS processing handles Tailwind incompatibilities:
  - Root selector replacement (`:root` → `:host(plasmo-csui)`)
  - Unit conversion (`rem` → `px`)
- **Twitter/X Integration**: 
  - Button styling matches native Twitter/X interface
  - Uses Twitter's color scheme: `rgb(29,155,240)` (primary blue) and `rgb(231,233,234)` (secondary gray)
  - Modal uses dark theme: `rgb(21,32,43)` background with proper borders and shadows

### Key Technical Patterns
1. **SPA-Aware Injection**: MutationObserver pattern handles Twitter's dynamic DOM changes and route navigation
2. **Shadow DOM Isolation**: Plasmo's Shadow DOM prevents style conflicts with Twitter/X
3. **Event-Driven Architecture**: Custom events enable communication between injected components and modals with coordinate-based positioning
4. **Twitter UI Mimicking**: Precise button styling (34px dimensions, rounded corners, hover effects) matches native toolbar buttons
5. **Positioning System**: Modal supports both centered and anchor-based positioning using click coordinates
6. **Native Drag & Drop Integration**: 
   - NFT images behave like native files when dragged
   - Automatic file input discovery and triggering
   - Cross-Shadow DOM drag operations
   - Visual feedback during drag states

## Twitter/X Integration Points
- **Target Elements**: `div[data-testid="toolBar"]` for toolbar identification
- **Injection Point**: `[data-testid="ScrollSnap-List"]` within toolbars for button placement
- **Compose Area Detection**: Comprehensive selectors for modern and legacy Twitter compose UI:
  - `[role="textbox"]`, `[data-testid*="tweetTextarea"]`, `[contenteditable="true"]`
  - Reply areas: `[data-testid*="replyTextarea"]`, DM composer: `[data-testid="dmComposerTextInput"]`
  - Aria labels: `[aria-label*="Post text"]`, `[aria-label*="Tweet text"]`, `[aria-label*="Reply"]`
- **File Upload Integration**: Smart file input discovery with fallback strategies
- **Styling Compatibility**: Matches Twitter/X dark mode design patterns
- **Permission Requirements**: `tabs`, `scripting`, `activeTab`, `storage` and `https://*/*` host permissions

## Drag & Drop Workflow
1. **User opens NFT modal** → Click toolbar button to display NFT collection
2. **NFT selection** → Drag NFT image from modal (auto-closes to show drop zones)
3. **Drop zone activation** → Twitter compose areas highlight when dragging over them
4. **File upload trigger** → Dropped NFT converts to File object and triggers native upload
5. **Twitter processing** → Twitter handles the file as if user selected it normally

## TypeScript Configuration
- Uses Plasmo's base TypeScript config via `plasmo/templates/tsconfig.base`
- Path aliases: `~*` maps to `./src/*` for clean imports
- Includes all `.ts` and `.tsx` files in src directory