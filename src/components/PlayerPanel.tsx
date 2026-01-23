import { useState } from 'react'
import { Button } from './Button'
import { useGame } from '../context/GameContext'
import { useGameLoader } from '../context/GameLoaderContext'
import { Clock } from './Clock'
import { WaitPanel } from './WaitPanel'
import { InventoryView } from './InventoryView'
import { Game } from '../model/Game'
import { Card } from './Card'
import { StatsPanel } from './StatsPanel'
import { EffectTag } from './EffectTag'
import { AvatarPanel } from './AvatarPanel'
import { SKILL_NAMES, SKILL_INFO } from '../model/Stats'
import { getLocation } from '../model/Location'
import { capitalise } from '../model/Text'

// Capitalize each word in a string (for unames like "spice dealer" -> "Spice Dealer")
const capitalizeWords = (str: string): string => {
  return str.split(' ').map(word => capitalise(word)).join(' ')
}

type TabId = 'Status' | 'Inventory' | 'Quests' | 'Skills' | 'Characters' | 'Settings'

export function PlayerPanel() {
  const { game, setGame } = useGame()
  const { newGame, saveGame, loadGameSave, hasManualSave, returnToStart } = useGameLoader()
  const [selectedTab, setSelectedTab] = useState<TabId>('Status')

  const tabs: TabId[] = ['Status', 'Inventory', 'Quests', 'Skills', 'Characters', 'Settings']

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Status':
        const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
        const questCards = game.player.cards.filter(card => card && card.type === 'Quest') || []
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
        const skillsWithBase = SKILL_NAMES.filter((name) => (game.player.basestats.get(name) || 0) > 0)
        if (skillsWithBase.length === 0) {
          return <p>No skills learned yet.</p>
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {skillsWithBase.map((name) => {
              const base = game.player.basestats.get(name) || 0
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
      case 'Characters': {
        const npcList = Array.from(game.npcs.values())
        if (npcList.length === 0) {
          return <p>No characters yet.</p>
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {npcList
              .map((npc) => {
                const def = npc.template
                // Show name if known, otherwise show uname (never show description in list)
                // Capitalize uname if it's being used
                let displayName: string
                if (npc.nameKnown > 0 && def.name) {
                  displayName = def.name
                } else if (def.uname) {
                  displayName = capitalizeWords(def.uname)
                } else {
                  displayName = def.name || npc.id
                }
                const locName = npc.location
                  ? (getLocation(npc.location)?.name ?? npc.location)
                  : '—'
                return { npc, displayName, locName }
              })
              .sort((a, b) => a.displayName.localeCompare(b.displayName))
              .map(({ npc, displayName, locName }) => (
                <div
                  key={npc.id}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--bg-panel-soft)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                  }}
                  title={npc.template.description || npc.id}
                >
                  {displayName} <span style={{ color: 'var(--text-muted)' }}>({locName})</span>
                </div>
              ))}
          </div>
        )
      }
      case 'Settings':
        return <p>Settings content will be added later.</p>
      default:
        return null
    }
  }

  return (
    <div className="player-panel panel-elevated" style={{ height: '100%' }}>
      <AvatarPanel />

      <div className="widget-container">
        <Clock />
        <WaitPanel />
      </div>

      <div className="game-canvas canvas-framed">
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
        <Button onClick={() => newGame({ replace: true })}>
          Restart
        </Button>
        <Button onClick={() => saveGame(game)}>
          Save
        </Button>
        <Button
          disabled={!hasManualSave}
          onClick={() => {
            const g = loadGameSave()
            if (g) setGame(g)
          }}
        >
          Load
        </Button>
        <Button onClick={() => setGame(Game.fromJSON(JSON.stringify(game.toJSON())))}>
          Reload
        </Button>
        <Button onClick={() => returnToStart(game)}>
          Exit Game
        </Button>
      </div>
    </div> 
  )
}
