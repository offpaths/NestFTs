// API Keys Configuration Template
// Copy this file to api-keys.ts and add your actual keys

export const API_KEYS = {
  // Alchemy NFT Access Token
  // Get from: https://dashboard.alchemy.com/
  // Format: alcht_XXXxxxXXXxxxXXX
  ALCHEMY_ACCESS_TOKEN: "your_alchemy_access_token_here",
  
  // OpenSea API Key (optional fallback)
  // Get from: https://docs.opensea.io/reference/api-keys
  OPENSEA_API_KEY: "your_opensea_api_key_here",
}

// Helper to check if keys are configured
export function getAPIKeyStatus() {
  return {
    alchemy: !!API_KEYS.ALCHEMY_ACCESS_TOKEN && API_KEYS.ALCHEMY_ACCESS_TOKEN !== "your_alchemy_access_token_here",
    opensea: !!API_KEYS.OPENSEA_API_KEY && API_KEYS.OPENSEA_API_KEY !== "your_opensea_api_key_here"
  }
}