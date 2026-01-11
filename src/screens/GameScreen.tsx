import { PlayerPanel } from '../components/PlayerPanel'
import { LocationView } from '../components/LocationView'
import { useGame } from '../context/GameContext'

export function GameScreen() {
  const { game } = useGame()

  if (!game) {
    return null
  }

  return (
    <div className="game-screen">
      <PlayerPanel />
      <div style={{ flex: 1, height: '100%' }}>
        <LocationView location={game.location} />
      </div>
    </div>
  )
}

