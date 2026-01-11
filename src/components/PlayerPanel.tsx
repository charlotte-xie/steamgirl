import { useState } from 'react'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { Clock } from './Clock'
import { InventoryView } from './InventoryView'
import { Game } from '../model/Game'
import { Card } from './Card'

type TabId = 'Status' | 'Inventory' | 'Quests' | 'Attributes' | 'Settings'

export function PlayerPanel() {
  const navigate = useNavigate()
  const { game, newGame, saveGame, loadGame, setGame } = useGame()
  const [selectedTab, setSelectedTab] = useState<TabId>('Status')

  const tabs: TabId[] = ['Status', 'Inventory', 'Quests', 'Attributes', 'Settings']

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Status':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <p>Name: {game?.player.name || 'Unknown'}</p>
            <Clock />
            {/* Stats will be added here later */}
          </div>
        )
      case 'Inventory':
        return <InventoryView />
      case 'Quests':
        const questCards = game?.player.cards.filter(card => card.type === 'Quest') || []
        if (questCards.length === 0) {
          return <p>No quests available.</p>
        }
        return (
          <div className="cards-container">
            {questCards.map((card, index) => (
              <Card key={`${card.id}-${index}`} card={card} />
            ))}
          </div>
        )
      case 'Attributes':
        return <p>Attributes content will be added later.</p>
      case 'Settings':
        return <p>Settings content will be added later.</p>
      default:
        return null
    }
  }

  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <div className="avatar-container">
        <div className="avatar-frame">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>
          <div className="avatar-rivet avatar-rivet-bl"></div>
          <div className="avatar-rivet avatar-rivet-br"></div>
          <div className="avatar-placeholder">
            <img 
              src="/girl/SteamGirl.png" 
              alt="Player Avatar"
            />
          </div>
        </div>
      </div>

      <div className="game-canvas canvas-framed" >
        <div className="panel-tabs">
          <div className="tabs-header">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab-button ${selectedTab === tab ? 'active' : ''}`}
                onClick={() => setSelectedTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="tabs-content">
            {renderTabContent()}
          </div>
        </div>
      </div>

      <div className="dev-controls">
        <Button onClick={() => { newGame() }}>
          Restart
        </Button>
        <Button onClick={saveGame}>
          Save
        </Button>
        <Button onClick={loadGame}>
          Load
        </Button>
        <Button onClick={() => {
          if (game) {
            const gameJson = JSON.stringify(game.toJSON())
            const reloadedGame = Game.fromJSON(gameJson)
            setGame(reloadedGame)
          }
        }}>
          Reload
        </Button>
        <Button onClick={() => navigate('/start')}>
          Home
        </Button>
      </div>
    </div> 
  )
}
