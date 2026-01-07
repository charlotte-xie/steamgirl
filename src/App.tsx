import { GameProvider } from './context/GameContext'
import { GameScreen } from './screens/GameScreen'

export function App() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  )
}
