import { useState } from 'react'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { Clock } from './Clock'
import { InventoryView } from './InventoryView'
import { Game } from '../model/Game'
import { Card } from './Card'
import { StatsPanel } from './StatsPanel'
import { EffectTag } from './EffectTag'
import { assetUrl } from '../utils/assetUrl'
import { SKILL_NAMES, SKILL_INFO } from '../model/Stats'

type TabId = 'Status' | 'Inventory' | 'Quests' | 'Skills' | 'Settings'

export function PlayerPanel() {
  const navigate = useNavigate()
  const { game, newGame, saveGame, loadGame, setGame } = useGame()
  const [selectedTab, setSelectedTab] = useState<TabId>('Status')

  const tabs: TabId[] = ['Status', 'Inventory', 'Quests', 'Skills', 'Settings']

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Status':
        const effectCards = game?.player.cards.filter(card => card && card.type === 'Effect') || []
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Clock />
            <StatsPanel />
            
            {effectCards.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>Effects</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {effectCards.map((card, index) => (
                    <EffectTag key={`${card.id}-${index}`} card={card} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      case 'Inventory':
        return <InventoryView />
      case 'Quests':
        const questCards = game?.player.cards.filter(card => card && card.type === 'Quest') || []
        if (questCards.length === 0) {
          return <p>No quests available.</p>
        }
        return (
          <div className="cards-container">
            {questCards.map((card, index) => (
              card ? <Card key={`${card.id}-${index}`} card={card} /> : null
            ))}
          </div>
        )
      case 'Skills':
        const skillsWithBase = game
          ? SKILL_NAMES.filter((name) => (game.player.basestats.get(name) || 0) > 0)
          : []
        if (skillsWithBase.length === 0) {
          return <p>No skills learned yet.</p>
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {skillsWithBase.map((name) => {
              const base = game!.player.basestats.get(name) || 0
              const info = SKILL_INFO[name]
              return (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--bg-panel-soft)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  title={info?.description}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{base}</span>
                </div>
              )
            })}
          </div>
        )
      case 'Settings':
        return <p>Settings content will be added later.</p>
      default:
        return null
    }
  }

  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <div className="avatar-container" style={{ position: 'relative' }}>
        <div className="avatar-frame">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>
          <div className="avatar-rivet avatar-rivet-bl"></div>
          <div className="avatar-rivet avatar-rivet-br"></div>
          <div className="avatar-placeholder">
            <img 
              src={assetUrl('/girl/SteamGirl.png')} 
              alt="Player Avatar"
            />
          </div>
        </div>
        {/* Status effect tags overlay - top left */}
        {(() => {
          const effectCards = game?.player.cards.filter(card => card && card.type === 'Effect') || []
          if (effectCards.length === 0) return null
          return (
            <div className="avatar-effects-overlay">
              {effectCards.map((card, index) => (
                <EffectTag key={`${card.id}-${index}`} card={card} />
              ))}
            </div>
          )
        })()}
        {/* Player name overlay in bottom right */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          right:20,
          color: 'var(--text-main)',
          fontWeight: 500,
          pointerEvents: 'none'
        }}>
          <h3>{game?.player.name || 'Unknown'}</h3>
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
