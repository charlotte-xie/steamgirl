import { PlayerPanel } from '../components/PlayerPanel'
import { LocationView } from '../components/LocationView'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { NewCharacterScreen, type Specialty } from './NewCharacterScreen'

export function GameScreen() {
  const { game, initializeCharacter } = useGame()
  const { clearGame } = useGameLoader()

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

  return (
    <div className="game-screen">
      <PlayerPanel />
      <main style={{ flex: 1, height: '100%' }}>
        <LocationView location={game.location} />
      </main>
    </div>
  )
}

