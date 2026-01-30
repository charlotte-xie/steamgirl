import { useGame } from '../context/GameContext'
import { Thumbnail } from './Thumbnail'
import { capitalise } from '../model/Text'

// Capitalize each word in a string (for unames like "spice dealer" -> "Spice Dealer")
const capitalizeWords = (str: string): string => {
  return str.split(' ').map(word => capitalise(word)).join(' ')
}

export function NPCOverlay() {
  const { game, runScript } = useGame()
  const npcsPresent = game.npcsPresent

  if (npcsPresent.length === 0) {
    return null
  }

  const handleNPCClick = (npcId: string) => {
    runScript(['approach', { npc: npcId }])
  }

  return (
    <div className="overlay-group">
      <div className="overlay-group-title">Characters</div>
      <div className="overlay-group-content overlay-group-content--center">
      {npcsPresent.map((npcId) => {
        const npc = game.getNPC(npcId)
        const npcDef = npc.template
        
        // Show name if known, otherwise show uname (never show description in thumbnail)
        // Capitalize uname if it's being used
        let displayName: string
        if (npc.nameKnown > 0 && npcDef.name) {
          displayName = npcDef.name
        } else if (npcDef.uname) {
          displayName = capitalizeWords(npcDef.uname)
        } else {
          displayName = npcDef.name || npcId
        }
        
        return (
          <Thumbnail
            key={npcId}
            image={npcDef.image}
            name={displayName}
            symbol="👤"
            onClick={() => handleNPCClick(npcId)}
            title={npcDef.description || npcDef.name || npcId}
          />
        )
      })}
      </div>
    </div>
  )
}
