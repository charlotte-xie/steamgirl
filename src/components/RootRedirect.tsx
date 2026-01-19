import { Navigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'

export function RootRedirect() {
  const { game } = useGame()
  
  // Check if there's a game in context or a saved game in localStorage
  const hasGame = game !== null || localStorage.getItem('gameSave') !== null || localStorage.getItem('gameSaveAuto') !== null
  
  return <Navigate to={hasGame ? '/game' : '/start'} replace />
}
