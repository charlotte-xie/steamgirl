import { Button } from './Button'
import { Panel } from './Panel'
import { useGame } from '../context/GameContext'
import type { SceneData } from '../model/Game'
import { renderScene } from './Content'
import { getNPCDefinition } from '../model/NPC'
import { assetUrl } from '../utils/assetUrl'

interface SceneOverlayProps {
  scene: SceneData
}

export function SceneOverlay({ scene }: SceneOverlayProps) {
  const { game, runScript, dismissScene } = useGame()

  const inScene = game.inScene
  const npcId = scene.npc
  const npcDef = npcId ? getNPCDefinition(npcId) : undefined
  const npcImage = npcDef?.image && !scene.hideNpcImage ? npcDef.image : undefined

  return (
    <Panel className="scene-overlay">
      {npcImage && (
        <div className="scene-npc-image-wrap">
          <img src={assetUrl(npcImage)} alt={npcDef?.name || npcId || 'NPC'} className="scene-npc-image" />
        </div>
      )}
      {renderScene(scene)}
      {(inScene) && (
        <div className="scene-actions">
            {scene.options.map((option, index) => {
              if (option.type === 'button') {
                const buttonLabel = option.label || 'Continue'
                const isDisabled = option.disabled || !option.action
                return (
                  <Button
                    key={index}
                    onClick={() => runScript(option.action)}
                    disabled={isDisabled}
                  >
                    {buttonLabel}
                  </Button>
                )
              }
              return null
            })}
        </div>
      )}
      {!inScene && scene.content.length > 0 && (
        <button
          className="scene-dismiss-button"
          onClick={dismissScene}
          title="Dismiss"
          aria-label="Dismiss scene"
        >
          ×
        </button>
      )}
    </Panel>
  )
}
