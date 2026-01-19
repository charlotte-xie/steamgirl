import { GameProvider } from './context/GameContext'
import { GameLoaderProvider } from './context/GameLoaderContext'
import { GameScreen } from './screens/GameScreen'
import { DemoControls } from './screens/DemoControls'
import { Routes, Route, BrowserRouter, useLocation } from 'react-router-dom'
import { StartScreen } from './screens/StartScreen'
import { RootRedirect } from './components/RootRedirect'
import { NotFoundScreen } from './screens/NotFoundScreen'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function GameRoute() {
  const { key, state } = useLocation()
  return (
    <GameProvider key={state?._t ?? key}>
      <GameScreen />
    </GameProvider>
  )
}

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <GameLoaderProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/start" element={<StartScreen />} />
          <Route path="/demo" element={<DemoControls />} />
          <Route path="/game" element={<GameRoute />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </GameLoaderProvider>
    </BrowserRouter>
  )
}
