import { useSyncExternalStore } from 'react'
import { Frame } from '../components/Frame'
import { useGame } from '../context/GameContext'
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
  const debugEnabled = useDebugMode()

  const toggleDebug = () => {
    const next = !debugEnabled
    localStorage.setItem(DEBUG_MODE, String(next))
    game.isDebug = next
    notifyDebugListeners()
  }

  return (
    <Frame className="screen-frame">
      <div className="settings-screen">
        <section className="info-section">
          <h3>Settings</h3>

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
        </section>
      </div>
    </Frame>
  )
}
