import { PlayerPanel } from '../components/PlayerPanel'
import { LocationView } from '../components/LocationView'
import { InventoryView } from '../components/InventoryView'
import { Frame } from '../components/Frame'
import { DevControls } from '../components/DevControls'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { NewCharacterScreen, type Specialty } from './NewCharacterScreen'
import { InfoScreen } from './InfoScreen'
import { QuestsScreen } from './QuestsScreen'
import { CharacterScreen } from './CharacterScreen'
import type { ScreenId } from '../components/ScreenSwitcher'

export function GameScreen() {
  const { game, initializeCharacter, refresh } = useGame()
  const { clearGame } = useGameLoader()

  // Store screen in game object to survive HMR
  const currentScreen = game.uiScreen as ScreenId
  const setCurrentScreen = (screen: ScreenId) => {
    game.uiScreen = screen
    refresh()
  }

  // Show character creation screen if game hasn't been started yet
  if (!game.isStarted()) {
    const handleStart = (name: string, specialty: Specialty | null) => {
      initializeCharacter({ name, specialty })
    }

    const handleCancel = () => {
      clearGame()
    }

    return <NewCharacterScreen onStart={handleStart} onCancel={handleCancel} />
  }

  const renderMainContent = () => {
    switch (currentScreen) {
      case 'game':
        return <LocationView location={game.location} />
      case 'character':
        return <CharacterScreen />
      case 'inventory':
        return (
          <Frame className="screen-frame">
            <InventoryView onUseItem={() => setCurrentScreen('game')} />
          </Frame>
        )
      case 'quests':
        return <QuestsScreen />
      case 'info':
        return <InfoScreen />
      case 'settings':
        return <div className="placeholder">Settings screen</div>
      default:
        return <LocationView location={game.location} />
    }
  }

  return (
    <div className="game-screen">
      <PlayerPanel currentScreen={currentScreen} onScreenChange={setCurrentScreen} />
      <main style={{ flex: 1, height: '100%' }}>
        {renderMainContent()}
      </main>
      <DevControls />
    </div>
  )
}

