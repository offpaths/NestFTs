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
- **Event System**: Uses custom DOM events (`NFTORY_TOGGLE_NFT_MODAL`, `NFTORY_NFT_CLICKED`) for component communication
- **Button Integration**: Injects buttons into `[data-testid="ScrollSnap-List"]` containers within toolbars
- **Click-to-Add System**: Modal-aware compose area targeting for NFT uploads:
  - Prioritizes high z-index modal compose areas over background areas
  - Modal-aware file input discovery with container matching
  - Smart file input selection based on DOM hierarchy and proximity
  - Direct file upload triggering without drag-and-drop complexity

#### Modal System (`src/contents/inventory-modal-ui.tsx`)
- **Shadow DOM Management**: Uses `ensureShadowRoot()` to create isolated Shadow DOM containers
- **Event Handling**: Listens for toggle events with coordinate data for positioning and NFT click events for upload processing
- **React Integration**: Uses `createRoot()` to render React components within Shadow DOM
- **Click-to-Add Handler**: Processes `NFTORY_NFT_CLICKED` events with modal-aware compose area detection and file upload triggering

#### NFT Modal Component (`src/popup/inventory-modal.tsx`)
- **Click-to-Add Implementation**: NFT images are clickable with pre-loaded File objects ready for upload
- **File Pre-loading**: Converts NFT images to proper File objects during modal open for instant click-to-add functionality
- **Auto-close on Click**: Modal closes automatically after NFT click to provide user feedback
- **Event Communication**: Dispatches `NFTORY_NFT_CLICKED` events with NFT metadata and pre-loaded file data

#### Configuration System (`src/utils/app-config.tsx`)
- Centralized constants for DOM IDs (`nftory-nft-inventory-icon`, `nftory-nft-inventory-modal`)
- Event types (`NFTORY_TOGGLE_NFT_MODAL`, `NFTORY_NFT_CLICKED`)
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
6. **Click-to-Add Integration**: 
   - NFT images upload directly when clicked
   - Modal-aware compose area targeting and file input discovery
   - Automatic file conversion from NFT image URLs
   - Instant feedback with modal auto-close

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

## Click-to-Add Workflow
1. **User opens NFT modal** → Click toolbar button to display NFT collection with wallet connection
2. **NFT selection** → Click NFT image in modal (shows visual feedback with selected state)
3. **Modal targeting** → System detects active compose area, prioritizing high z-index modal areas over background
4. **File processing** → Uses pre-loaded File object or converts NFT image URL to File on-demand
5. **Upload trigger** → File object directly triggers Twitter's native file input system
6. **User feedback** → Modal auto-closes after successful click, providing immediate visual confirmation
7. **Twitter processing** → Twitter handles the file as if user selected it through normal file picker

## Click-to-Add Technical Implementation

### **Modal-Aware Targeting**
- **Primary Strategy**: Finds active compose areas with high z-index values (modals, popups)
- **Fallback Strategy**: Falls back to background compose areas if no modal areas found
- **File Input Discovery**: Locates file inputs within the same modal container as the compose area
- **Container Matching**: Uses DOM hierarchy to match file inputs to their corresponding compose areas

### **File Pre-loading System**
- **On Modal Open**: Converts all NFT image URLs to File objects in background
- **Cross-Origin Support**: Uses `mode: 'cors'` fetch for external NFT image URLs
- **File Naming**: Sanitizes NFT names for valid filenames with `.png` extension
- **Error Handling**: Graceful fallback to URL-based conversion if pre-loading fails

### **Event Architecture**
- **Click Detection**: NFT images have `draggable="false"` and click handlers
- **Event Dispatch**: Dispatches `NFTORY_NFT_CLICKED` custom events with NFT data and pre-loaded files
- **Cross-Component Communication**: Content script listens for click events from popup modal
- **State Management**: Tracks selected NFT with visual feedback and auto-reset

### **Upload Processing**
- **File Input Simulation**: Creates synthetic click and change events on Twitter's file inputs
- **Data Transfer**: Uses pre-loaded File objects or converts URLs to File objects on-demand
- **Error Recovery**: Comprehensive error handling with specific user feedback messages
- **Security Validation**: URL protocol validation prevents internal network access

## Troubleshooting Click-to-Add Issues

### **NFT goes to background instead of modal**
- **Cause**: File input discovery finding background file inputs instead of modal ones
- **Solution**: Enhanced modal-aware file input discovery with container prioritization
- **Debug**: Check z-index values and DOM hierarchy of compose areas

### **"No active compose area found" Error**
- **Cause**: Compose area detection failing on current Twitter UI state
- **Solution**: Comprehensive selector list covers modern and legacy Twitter UI elements
- **Debug**: Verify compose area is visible and focused before clicking NFT

### **"Could not find file input" Error**
- **Cause**: File input discovery failing within modal containers
- **Solution**: Multi-strategy approach with proximity-based fallback and container matching
- **Debug**: Inspect file input elements and their relationship to compose areas

### **"Failed to process NFT click upload" Error**
- **Cause**: Network issues fetching NFT image or file processing failures
- **Solution**: Pre-loading system with fallback to URL-based conversion
- **Debug**: Check NFT image URL accessibility and browser network logs

### **Modal not closing after click**
- **Cause**: Event handling issues or error states preventing auto-close
- **Solution**: 100ms timeout ensures proper event processing before modal close
- **Debug**: Check click event logs and modal state management

## TypeScript Configuration
- Uses Plasmo's base TypeScript config via `plasmo/templates/tsconfig.base`
- Path aliases: `~*` maps to `./src/*` for clean imports
- Includes all `.ts` and `.tsx` files in src directory