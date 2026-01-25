import { BrassButton } from '../components/BrassButton'
import { useGameLoader } from '../context/GameLoaderContext'
import { useNavigate } from 'react-router-dom'
import { assetUrl } from '../utils/assetUrl'

export function StartScreen() {
  const { newGame, loadGame, continueGame, hasGame } = useGameLoader()
  const navigate = useNavigate()

  const handleSettings = () => {
    // TODO: Implement settings
  }

  const handleDemo = () => {
    navigate('/demo')
  }

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
          <BrassButton onClick={() => loadGame()}>Load Game</BrassButton>
          <BrassButton onClick={handleSettings}>Settings</BrassButton>
          <BrassButton onClick={handleDemo}>Demo</BrassButton>
        </nav>
      </main>
    </div>
  )
}

