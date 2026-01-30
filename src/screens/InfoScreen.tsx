import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { useDebugMode } from './SettingsScreen'
import { Frame } from '../components/Frame'
import { Panel } from '../components/Panel'
import { Thumbnail } from '../components/Thumbnail'
import { TabbedView } from '../components/TabbedView'
import { getLocation } from '../model/Location'
import { capitalise } from '../model/Text'
import type { NPC } from '../model/NPC'

// Capitalize each word in a string (for unames like "spice dealer" -> "Spice Dealer")
const capitalizeWords = (str: string): string => {
  return str.split(' ').map(word => capitalise(word)).join(' ')
}

function npcDisplayName(npc: NPC): string {
  const def = npc.template
  if (npc.nameKnown > 0 && def.name) return def.name
  if (def.uname) return capitalizeWords(def.uname)
  return def.name || npc.id
}

function NpcDetail({ npc }: { npc: NPC }) {
  const { game, refresh } = useGame()
  const debug = useDebugMode()
  const [, setTick] = useState(0)
  const def = npc.template
  const locName = npc.location
    ? (getLocation(npc.location)?.name ?? npc.location)
    : 'Unknown'

  // Collect all stats into sorted entries
  const statEntries = Array.from(npc.stats.entries()).sort(([a], [b]) => a.localeCompare(b))

  const adjustStat = (stat: string, delta: number) => {
    const cur = npc.stats.get(stat) ?? 0
    npc.stats.set(stat, cur + delta)
    setTick(t => t + 1)
    refresh()
  }

  const teleportNpcHere = () => {
    npc.location = game.currentLocation
    game.updateNPCsPresent()
    refresh()
  }

  const teleportToNpc = () => {
    if (!npc.location) return
    game.moveToLocation(npc.location)
    refresh()
  }

  return (
    <div className="npc-detail">
      <div className="npc-detail-header">
        <strong>{npcDisplayName(npc)}</strong>
        <span className="text-muted">{locName}</span>
      </div>

      {def.description && (
        <p className="npc-detail-desc text-muted">{def.description}</p>
      )}

      <div className="npc-detail-info">
        <span className="text-muted">ID:</span> {npc.id}
      </div>
      {def.pronouns && (
        <div className="npc-detail-info">
          <span className="text-muted">Pronouns:</span> {def.pronouns.subject}/{def.pronouns.object}/{def.pronouns.possessive}
        </div>
      )}

      {statEntries.length > 0 && (
        <div className="npc-detail-stats">
          <h4>Stats</h4>
          {statEntries.map(([stat, value]) => (
            <div key={stat} className="npc-stat-row">
              <span className="npc-stat-name">{stat}</span>
              <span className="npc-stat-value">{value}</span>
              {debug && (
                <span className="npc-stat-controls">
                  <button className="dev-btn-sm" onClick={() => adjustStat(stat, -10)}>-10</button>
                  <button className="dev-btn-sm" onClick={() => adjustStat(stat, 10)}>+10</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {debug && (
        <div className="npc-detail-actions">
          <button className="dev-btn-action" onClick={teleportNpcHere}>
            Teleport NPC Here
          </button>
          <button
            className="dev-btn-action"
            onClick={teleportToNpc}
            disabled={!npc.location}
            title={npc.location ? `Go to ${locName}` : 'NPC has no location'}
          >
            Teleport to NPC
          </button>
        </div>
      )}
    </div>
  )
}

function CharactersTab() {
  const { game } = useGame()
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)

  const npcList = Array.from(game.npcs.values())

  const sortedNpcs = npcList
    .map((npc) => ({
      npc,
      displayName: npcDisplayName(npc),
      locName: npc.location
        ? (getLocation(npc.location)?.name ?? npc.location)
        : '—',
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const selectedNpc = selectedNpcId ? game.npcs.get(selectedNpcId) ?? null : null

  return (
    <>
      {npcList.length === 0 ? (
        <p className="text-muted">No characters met yet.</p>
      ) : (
        <div className="overlay-group-content overlay-group-content--center">
          {sortedNpcs.map(({ npc, displayName, locName }) => (
            <Thumbnail
              key={npc.id}
              image={npc.template.image}
              name={displayName}
              subtitle={locName}
              symbol="👤"
              onClick={() => setSelectedNpcId(selectedNpcId === npc.id ? null : npc.id)}
              title={npc.template.description || npc.id}
              selected={selectedNpcId === npc.id}
            />
          ))}
        </div>
      )}

      {selectedNpc && (
        <Panel>
          <NpcDetail npc={selectedNpc} />
        </Panel>
      )}
    </>
  )
}

export function InfoScreen() {
  return (
    <Frame className="screen-frame">
      <TabbedView tabs={[
        { id: 'characters', label: 'Characters', content: <CharactersTab /> },
      ]} />
    </Frame>
  )
}
