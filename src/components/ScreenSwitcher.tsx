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
  icon: React.ReactNode
}

// Steampunk-styled SVG icons
const Icons = {
  // Theatre masks - for Game
  game: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10v1M16 10v1M9 15c1 1 2.5 1.5 3 1.5s2-.5 3-1.5" />
    </svg>
  ),
  // Silhouette profile - for Character
  character: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  ),
  // Satchel/bag - for Inventory
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  ),
  // Scroll - for Quests
  quests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4c0-1 1-2 2-2h8c1 0 2 1 2 2v16c0 1-1 2-2 2H8c-1 0-2-1-2-2V4z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  // Open book - for Info
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h6c1.1 0 2 .9 2 2v14c-1.5-1-3-1-4-1H4V4zM20 4h-6c-1.1 0-2 .9-2 2v14c1.5-1 3-1 4-1h4V4z" />
    </svg>
  ),
  // Cog - for Settings
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10.5 2h3l.5 3.2a8 8 0 0 1 2.1 1.2l3-.9 1.5 2.6-2.5 2.1a8 8 0 0 1 0 2.4l2.5 2.1-1.5 2.6-3-.9a8 8 0 0 1-2.1 1.2L13.5 22h-3l-.5-3.2a8 8 0 0 1-2.1-1.2l-3 .9-1.5-2.6 2.5-2.1a8 8 0 0 1 0-2.4L3.4 9.3l1.5-2.6 3 .9A8 8 0 0 1 10 6.4Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  // Door - for Exit
  exit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5" />
      <path d="M16 12H9M12 9l3 3-3 3" />
    </svg>
  ),
}

const SCREENS: ScreenButton[] = [
  { id: 'game', label: 'Game', icon: Icons.game },
  { id: 'character', label: 'Character', icon: Icons.character },
  { id: 'inventory', label: 'Inventory', icon: Icons.inventory },
  { id: 'quests', label: 'Quests', icon: Icons.quests },
  { id: 'info', label: 'Info', icon: Icons.info },
  { id: 'settings', label: 'Settings', icon: Icons.settings },
  { id: 'exit', label: 'Exit', icon: Icons.exit },
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
      <div className="switcher-rail" />
      {SCREENS.map((screen) => (
        <button
          key={screen.id}
          type="button"
          className={`screen-btn ${currentScreen === screen.id ? 'active' : ''}`}
          onClick={() => handleClick(screen.id)}
          title={screen.label}
        >
          <span className="screen-btn-icon">{screen.icon}</span>
        </button>
      ))}
    </div>
  )
}
