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
2. **NFT selection** → Drag NFT image from modal (auto-closes after 150ms to show drop zones)
3. **Drop zone activation** → Twitter compose areas highlight with pulsing animation and drop hints
4. **Multi-format data transfer** → System transfers File objects, URLs, and metadata simultaneously
5. **Smart processing** → Handler prioritizes File objects, falls back to URL-to-File conversion if needed
6. **File upload trigger** → Converted/direct File object triggers Twitter's native upload system
7. **User feedback** → Visual indicators show loading, success, or error states with specific messages
8. **Twitter processing** → Twitter handles the file as if user selected it normally

## Drag & Drop Technical Implementation

### **Data Transfer Strategy**
- **Primary Path**: Pre-loaded File objects for direct compatibility
- **Fallback Path #1**: Canvas-generated data URLs for cross-domain scenarios  
- **Fallback Path #2**: Raw image URLs + NFT metadata with on-demand conversion
- **Fallback Path #3**: Plain text descriptions for basic compatibility

### **Cross-Shadow DOM Compatibility**
- Multiple data formats ensure transfer works across Shadow DOM boundaries
- Extended modal close delay (150ms) allows proper drag data establishment
- Event delegation and React-compatible event sequences for modern Twitter UI

### **Error Handling & Debugging**
- Comprehensive logging of drag data types and transfer success/failure
- Specific user feedback for different failure scenarios (no file input, network errors, invalid data)
- Graceful degradation through multiple data format attempts

### **Visual Feedback System**
- **Drag Over**: Dashed border, background highlight, pulse animation, contextual drop hints
- **Loading State**: Processing spinner with descriptive messages  
- **Success State**: Green checkmark with confirmation (2s auto-dismiss)
- **Error State**: Red X with specific error details (3s auto-dismiss)
- **Animations**: Smooth fade-in/fade-out transitions with proper cleanup

## Troubleshooting Drag & Drop Issues

### **"No files received" Error**
- **Cause**: Drag data not transferring across Shadow DOM boundaries
- **Solution**: System automatically falls back to URL-based transfer
- **Debug**: Check browser console for drag data types and transfer logs

### **"Upload area not found" Error** 
- **Cause**: File input discovery failing on current Twitter UI
- **Solution**: Enhanced proximity-based search with multiple container strategies
- **Debug**: Verify compose area is visible and active before dragging

### **"Failed to process image" Error**
- **Cause**: Network issues fetching NFT image or CORS restrictions
- **Solution**: Pre-loading system caches images, fallback to direct URLs
- **Debug**: Check NFT image URL accessibility and CORS headers

### **Drop zones not highlighting**
- **Cause**: Compose area selectors not matching current Twitter DOM
- **Solution**: Comprehensive selector list covers modern and legacy Twitter UI
- **Debug**: Inspect Twitter compose elements to verify data-testid attributes

### **Modal not closing during drag**
- **Cause**: Drag event timing issues with modal state management
- **Solution**: 150ms delay ensures proper drag data establishment before close
- **Debug**: Check dragStart event logs and modal close timing

## TypeScript Configuration
- Uses Plasmo's base TypeScript config via `plasmo/templates/tsconfig.base`
- Path aliases: `~*` maps to `./src/*` for clean imports
- Includes all `.ts` and `.tsx` files in src directory