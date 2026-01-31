import { PlayerPanel } from '../components/PlayerPanel'
import { LocationView } from '../components/LocationView'
import { InventoryScreen } from './InventoryScreen'
import { Frame } from '../components/Frame'
import { DevControls } from '../components/DevControls'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { NewCharacterScreen, type Specialty } from './NewCharacterScreen'
import type { Hairstyle } from '../model/Player'
import { InfoScreen } from './InfoScreen'
import { QuestsScreen } from './QuestsScreen'
import { CharacterScreen } from './CharacterScreen'
import { SettingsScreen, useDebugMode } from './SettingsScreen'
import type { ScreenId } from '../components/ScreenSwitcher'

export function GameScreen() {
  const { game, initializeCharacter, refresh } = useGame()
  const { clearGame } = useGameLoader()
  const debugMode = useDebugMode()

  // Store screen in game object to survive HMR
  const currentScreen = game.uiScreen as ScreenId
  const setCurrentScreen = (screen: ScreenId) => {
    game.uiScreen = screen
    refresh()
  }

  // Show character creation screen if game hasn't been started yet
  if (!game.isStarted()) {
    const handleStart = (name: string, specialty: Specialty | null, hairstyle: Hairstyle) => {
      initializeCharacter({ name, specialty, hairstyle })
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
            <InventoryScreen onUseItem={() => setCurrentScreen('game')} />
          </Frame>
        )
      case 'quests':
        return <QuestsScreen />
      case 'info':
        return <InfoScreen />
      case 'settings':
        return <SettingsScreen />
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
      {debugMode && <DevControls />}
    </div>
  )
}

