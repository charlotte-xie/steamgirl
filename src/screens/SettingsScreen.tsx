import { useSyncExternalStore, useState } from 'react'
import { Frame } from '../components/Frame'
import { BrassButton } from '../components/BrassButton'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { DEBUG_MODE } from '../constants/storage'

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

function getDebugSnapshot(): boolean {
  const stored = localStorage.getItem(DEBUG_MODE)
  if (stored !== null) return stored === 'true'
  return isLocalhost
}

// Simple pub/sub so all useDebugMode() consumers re-render on toggle
const debugListeners = new Set<() => void>()
function subscribeDebug(cb: () => void) {
  debugListeners.add(cb)
  return () => { debugListeners.delete(cb) }
}
function notifyDebugListeners() {
  debugListeners.forEach(cb => cb())
}

/** Reactive hook — re-renders when the debug toggle changes. */
export function useDebugMode(): boolean {
  return useSyncExternalStore(subscribeDebug, getDebugSnapshot)
}

export function SettingsScreen() {
  const { game } = useGame()
  const { saveGame, loadGame, hasManualSave, returnToStart } = useGameLoader()
  const debugEnabled = useDebugMode()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const toggleDebug = () => {
    const next = !debugEnabled
    localStorage.setItem(DEBUG_MODE, String(next))
    game.isDebug = next
    notifyDebugListeners()
  }

  const handleSave = () => {
    saveGame(game)
    setSaveMessage('Game saved!')
    setTimeout(() => setSaveMessage(null), 2000)
  }

  const handleLoad = () => {
    loadGame()
  }

  const handleExit = () => {
    returnToStart(game)
  }

  return (
    <Frame className="screen-frame">
      <div className="settings-screen">
        <section className="info-section">
          <h3>Save &amp; Load</h3>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Save Game</span>
              <span className="setting-desc">Save your progress to a manual save slot</span>
            </div>
            <BrassButton onClick={handleSave}>
              {saveMessage ?? 'Save'}
            </BrassButton>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Load Game</span>
              <span className="setting-desc">Load from your last manual save</span>
            </div>
            <BrassButton onClick={handleLoad} disabled={!hasManualSave}>
              Load
            </BrassButton>
          </div>
        </section>

        <section className="info-section">
          <h3>Settings</h3>

          {isLocalhost && (
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Debug Controls</span>
                <span className="setting-desc">Show developer tools overlay</span>
              </div>
              <button
                type="button"
                className={`steam-toggle ${debugEnabled ? 'on' : ''}`}
                onClick={toggleDebug}
                aria-pressed={debugEnabled}
                title={debugEnabled ? 'Disable debug controls' : 'Enable debug controls'}
              >
                <span className="steam-toggle-track">
                  <span className="steam-toggle-knob" />
                </span>
              </button>
            </div>
          )}

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Exit to Main Menu</span>
              <span className="setting-desc">Return to the start screen (progress is auto-saved)</span>
            </div>
            <BrassButton onClick={handleExit}>
              Exit
            </BrassButton>
          </div>
        </section>
      </div>
    </Frame>
  )
}
