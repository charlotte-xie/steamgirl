import { Button } from './Button'
import { Panel } from './Panel'
import { useGame } from '../context/GameContext'
import type { SceneData, SceneOptionItem } from '../model/Game'
import { getScript } from '../model/Scripts'
import { renderScene } from './Content'
import { getNPCDefinition } from '../model/NPC'
import { assetUrl } from '../utils/assetUrl'

interface SceneOverlayProps {
  scene: SceneData
}

export function SceneOverlay({ scene }: SceneOverlayProps) {
  const { game, runScript, dismissScene } = useGame()

  const handleOption = (option: SceneOptionItem) => {
    if (option.type === 'button') {
      const [scriptName, params] = option.script
      const script = getScript(scriptName)
      if (script) {
        runScript(scriptName, params)
      }
    }
  }

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
                const [scriptName] = option.script
                const scriptExists = getScript(scriptName) !== undefined
                const buttonLabel = option.label || 'Continue'
                return (
                  <Button
                    key={index}
                    onClick={() => handleOption(option)}
                    disabled={!scriptExists}
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
