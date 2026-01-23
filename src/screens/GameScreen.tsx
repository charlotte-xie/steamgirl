import { PlayerPanel } from '../components/PlayerPanel'
import { LocationView } from '../components/LocationView'
import { useGame } from '../context/GameContext'

export function GameScreen() {
  const { game } = useGame()
  return (
    <div className="game-screen">
      <PlayerPanel />
      <main style={{ flex: 1, height: '100%' }}>
        <LocationView location={game.location} />
      </main>
    </div>
  )
}

