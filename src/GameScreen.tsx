export function GameScreen() {
  return (
    <div className="game-screen">
      <div className="game-ui panel-elevated">
        <header className="game-header">
          <h1 className="heading-main">Game Screen</h1>
          <p className="subtitle text-muted">Full-screen React view</p>
        </header>

        <main className="game-canvas canvas-framed">
          <div className="placeholder placeholder-card">Your game goes here</div>
        </main>
      </div>
    </div>
  )
}

