import { useEffect, useState } from "react"

import { CountButton } from "~features/count-button"

import "~style.css"

function IndexPopup() {
  const [currentUrl, setCurrentUrl] = useState<string>("")

  useEffect(() => {
    getCurrentUrl()
  }, [currentUrl])

  const getCurrentUrl = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    setCurrentUrl(tab.url)
  }

  return (
    <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-16 plasmo-w-40">
      <h1>Hello, World</h1>
      <h1>You are currently at {currentUrl}</h1>
    </div>
  )
}

export default IndexPopup
