import { useGame } from '../context/GameContext'
import { Frame } from '../components/Frame'
import { getLocation } from '../model/Location'
import { capitalise } from '../model/Text'

// Capitalize each word in a string (for unames like "spice dealer" -> "Spice Dealer")
const capitalizeWords = (str: string): string => {
  return str.split(' ').map(word => capitalise(word)).join(' ')
}

export function InfoScreen() {
  const { game } = useGame()

  const npcList = Array.from(game.npcs.values())

  return (
    <Frame className="screen-frame">
      <div className="info-screen">
        <section className="info-section">
          <h3>Characters</h3>
          {npcList.length === 0 ? (
            <p className="text-muted">No characters met yet.</p>
          ) : (
            <div className="info-list">
              {npcList
                .map((npc) => {
                  const def = npc.template
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
                    className="info-item"
                    title={npc.template.description || npc.id}
                  >
                    {displayName} <span className="text-muted">({locName})</span>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </Frame>
  )
}
