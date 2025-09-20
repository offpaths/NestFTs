import { useEffect, useState } from "react"

import "~style.css"
import { createLogger } from "~utils/logger"

const log = createLogger('PopupIndex')

function IndexPopup() {
  const [currentUrl, setCurrentUrl] = useState<string>("")

  const getCurrentUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      setCurrentUrl(tab?.url || "Unable to get URL")
    } catch (error) {
      log.error("Failed to get current URL:", error)
      setCurrentUrl("Error getting URL")
    }
  }

  useEffect(() => {
    getCurrentUrl()
  }, []) // Removed currentUrl dependency to prevent infinite loop

  return (
    <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-16 plasmo-w-40">
      <h1>Hello, World</h1>
      <h1>You are currently at {currentUrl}</h1>
    </div>
  )
}

export default IndexPopup
