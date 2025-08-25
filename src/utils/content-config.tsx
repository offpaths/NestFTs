import type { PlasmoCSConfig } from "plasmo"

const globalContentConfig: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://x.com/*"],
  run_at: "document_idle"
}

export default globalContentConfig
