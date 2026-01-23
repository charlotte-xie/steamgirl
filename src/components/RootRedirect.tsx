import { Navigate } from 'react-router-dom'
import { useGameLoader } from '../context/GameLoaderContext'

export function RootRedirect() {
  const { hasGame } = useGameLoader()
  return <Navigate to={hasGame ? '/game' : '/start'} replace />
}
