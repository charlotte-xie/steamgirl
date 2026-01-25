import { useGameLoader } from '../context/GameLoaderContext'
import { useGame } from '../context/GameContext'

export type ScreenId = 'game' | 'character' | 'inventory' | 'quests' | 'info' | 'settings'

interface ScreenSwitcherProps {
  currentScreen: ScreenId
  onScreenChange: (screen: ScreenId) => void
}

interface ScreenButton {
  id: ScreenId | 'exit'
  label: string
  icon: string
}

const SCREENS: ScreenButton[] = [
  { id: 'game', label: 'Game', icon: '🎭' },
  { id: 'character', label: 'Character', icon: '👤' },
  { id: 'inventory', label: 'Inventory', icon: '🎒' },
  { id: 'quests', label: 'Quests', icon: '📜' },
  { id: 'info', label: 'Info', icon: '📖' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'exit', label: 'Exit', icon: '🚪' },
]

export function ScreenSwitcher({ currentScreen, onScreenChange }: ScreenSwitcherProps) {
  const { game } = useGame()
  const { returnToStart } = useGameLoader()

  const handleClick = (id: ScreenId | 'exit') => {
    if (id === 'exit') {
      returnToStart(game)
    } else if (id === currentScreen) {
      // Toggle off: clicking selected screen returns to game view
      onScreenChange('game')
    } else {
      onScreenChange(id)
    }
  }

  return (
    <div className="screen-switcher">
      {SCREENS.map((screen) => (
        <button
          key={screen.id}
          type="button"
          className={`screen-btn ${currentScreen === screen.id ? 'active' : ''}`}
          onClick={() => handleClick(screen.id)}
          title={screen.label}
        >
          <span className="screen-btn-icon">{screen.icon}</span>
          <span className="screen-btn-label">{screen.label}</span>
        </button>
      ))}
    </div>
  )
}
