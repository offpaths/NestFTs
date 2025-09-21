# NFT Troubleshooting Guide

This guide helps you troubleshoot NFT discovery issues in the NestFTs extension.

## Quick Setup

### 1. Configure API Keys (Recommended)

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and add your API keys:

```env
# Alchemy API Key (primary service, recommended)
# IMPORTANT: Use PLASMO_PUBLIC_ prefix for Plasmo extensions
PLASMO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# OpenSea API Key (fallback service)
PLASMO_PUBLIC_OPENSEA_API_KEY=your_opensea_api_key_here

# Development mode (enables detailed logging)
NODE_ENV=development
```

### 2. Get API Keys

**Alchemy Access Token (Recommended Primary):**

1. Visit [Alchemy.com](https://www.alchemy.com/) and sign up
2. Create a new app for Ethereum Mainnet
3. Copy the **Access Token** for NFT API from your dashboard
   - ✅ **Correct**: Access token looks like `alcht_GTD7w0cplXTyUTzSrnvn6oh0DdEUgo`
   - This is specifically for Alchemy's NFT API endpoints
4. Add the access token to your `.env` file with `PLASMO_PUBLIC_` prefix
5. Alchemy provides better rate limits and specialized NFT endpoints

**OpenSea API Key (Optional Fallback):**

1. Visit [OpenSea Developer Portal](https://docs.opensea.io/reference/api-keys)
2. Create an account and request an API key
3. Add the key to your `.env` file for additional fallback

## Troubleshooting Common Issues

### "No NFTs found in your wallet"

**Possible Causes:**

1. **Missing API key** - Alchemy API key recommended for reliable access
2. **Rate limiting** - Too many requests without an API key
3. **Network mismatch** - Wallet on different network than expected
4. **Empty wallet** - Wallet actually has no NFTs

**Solutions:**

1. **Add Alchemy Access Token** (most common fix - better performance)
   - Make sure you're using the **Access Token** for NFT API
   - Access token starts with `alcht_` prefix and is for NFT endpoints
2. **Add OpenSea API key** as fallback
3. **Wait and retry** if rate limited
4. **Check wallet network** - extension shows connected chain
5. **Verify wallet contents** on OpenSea.io directly

### "Rate limit exceeded"

**Cause:** Too many API requests without authentication
**Solution:** Add Alchemy API key to `.env` file (primary), or OpenSea API key (fallback)

### "OpenSea API authentication failed"

**Cause:** Invalid API key
**Solutions:**

1. Verify Alchemy API key is correct in `.env` file
2. Check API key hasn't been revoked
3. Ensure no extra spaces/characters in key
4. Try adding OpenSea API key as well for fallback

### "Failed to load NFTs - check the errors above"

**Solutions:**

1. Check browser console for detailed error messages
2. Click "Retry" button in error message
3. Refresh page and try again

### Abstract Testnet Wallets

Currently, Abstract testnet doesn't have NFT indexing services available. The extension shows:

- **Mock test NFTs** for demonstration purposes
- **Chain indicator** showing "Abstract Testnet"
- **Limited functionality** until indexing services become available

## Debugging

### Enable Debug Mode

Set in `.env`:

```env
NODE_ENV=development
```

This enables detailed console logging showing:

- API request details
- Chain detection
- Error specifics
- Cache status

### Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages starting with `[NFT Service]`
4. Check for error details and API responses

### Test Wallet Connection

The modal shows:

- ✅ **Connected wallet address**
- 🔗 **Network/chain name**
- ⚠️ **Configuration warnings**
- 🔄 **Cache indicators**

## Common Error Messages

| Error                                 | Meaning                          | Solution                    |
| ------------------------------------- | -------------------------------- | --------------------------- |
| "Invalid wallet address format"       | Address validation failed        | Check wallet connection     |
| "OpenSea API error: 429"              | Rate limited                     | Add Alchemy/OpenSea API key |
| "OpenSea API error: 401"              | Authentication failed            | Check API key               |
| "Alchemy access token not configured" | Missing Alchemy NFT access token | Add Alchemy access token    |
| "Request timeout"                     | Network/server issue             | Check connection, retry     |

## Network Support

| Network          | NFT Support      | Notes                                  |
| ---------------- | ---------------- | -------------------------------------- |
| Ethereum Mainnet | ✅ Full          | Alchemy (primary) + OpenSea (fallback) |
| Abstract Testnet | ⚠️ Limited       | Mock data only                         |
| Other Networks   | ❌ Not supported | May show as Ethereum                   |

## Getting Help

1. **Check this guide first**
2. **Enable debug mode** and check console
3. **Try different wallet/network**
4. **Verify API keys are working**
5. **Report issues** with console logs

## Development Notes

- Extension caches NFT data for 5 minutes
- API requests timeout after 15 seconds
- Supports common image formats: JPG, PNG, GIF, WebP, SVG
- Uses secure HTTPS-only image sources
- Sanitizes all NFT metadata for security
