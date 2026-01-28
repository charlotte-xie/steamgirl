import { BrassButton } from '../components/BrassButton'
import { useGameLoader } from '../context/GameLoaderContext'
import { useNavigate } from 'react-router-dom'
import { assetUrl } from '../utils/assetUrl'

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

export function StartScreen() {
  const { newGame, loadGame, continueGame, hasGame, hasManualSave } = useGameLoader()
  const navigate = useNavigate()

  return (
    <div className="start-screen">
      <div className="hero" style={{ backgroundImage: `url(${assetUrl('/steamgirl-hero.jpg')})` }} />
      <div className="overlay" />
      <main>
        <header>
          <h1>SteamGirl</h1>
          <p>Steampunk Life Simulator</p>
        </header>
        <nav>
          <BrassButton variant="primary" disabled={!hasGame} onClick={() => continueGame()}>Continue</BrassButton>
          <BrassButton variant="primary" onClick={newGame}>New Game</BrassButton>
          <BrassButton disabled={!hasManualSave} onClick={() => loadGame()}>Load Game</BrassButton>
          {isLocalhost && <BrassButton onClick={() => navigate('/demo')}>Demo</BrassButton>}
        </nav>
      </main>
    </div>
  )
}

