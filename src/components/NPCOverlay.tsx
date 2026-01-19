import { useGame } from '../context/GameContext'
import { Thumbnail } from './Thumbnail'

export function NPCOverlay() {
  const { game, runScript } = useGame()
  const npcsPresent = game.npcsPresent

  if (npcsPresent.length === 0) {
    return null
  }

  const handleNPCClick = (npcId: string) => {
    runScript('approach', { npc: npcId })
  }

  return (
    <div className="activities npcs">
      {npcsPresent.map((npcId) => {
        const npc = game.getNPC(npcId)
        const npcDef = npc.template
        
        // Show name if known, otherwise show description
        const displayName = npc.nameKnown && npcDef.name 
          ? npcDef.name 
          : (npcDef.description || npcDef.name || npcId)
        
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
  )
}
