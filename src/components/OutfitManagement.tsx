import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { getOutfitNames, getOutfitThumbnail } from '../model/Outfits'
import { Button } from './Button'
import { captureAvatar } from '../utils/captureAvatar'

export function OutfitManagement() {
  const { game, refresh } = useGame()
  const player = game.player
  const inScene = game.inScene
  const sceneTooltip = inScene ? 'Cannot change clothes during scene' : undefined
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null)
  const [isNaming, setIsNaming] = useState(false)
  const [newName, setNewName] = useState('')

  const outfitNames = getOutfitNames(player.outfits)
  const nameMatchesExisting = isNaming && outfitNames.includes(newName.trim())

  const handleSaveAs = () => {
    setIsNaming(true)
    setNewName(selectedOutfit ?? '')
  }

  const handleConfirmSave = async () => {
    if (newName.trim()) {
      const thumbnail = await captureAvatar()
      player.saveOutfit(newName.trim(), thumbnail)
      setSelectedOutfit(newName.trim())
      setIsNaming(false)
      setNewName('')
      refresh()
    }
  }

  const handleCancelSave = () => {
    setIsNaming(false)
    setNewName('')
  }

  const handleUpdate = async () => {
    if (selectedOutfit) {
      const thumbnail = await captureAvatar()
      player.saveOutfit(selectedOutfit, thumbnail)
      refresh()
    }
  }

  const handleStrip = () => {
    player.stripAll()
    player.calcStats()
    refresh()
  }

  const handleWear = () => {
    if (selectedOutfit) {
      player.wearOutfit(selectedOutfit)
      player.calcStats()
      refresh()
    }
  }

  const handleDelete = () => {
    if (selectedOutfit) {
      player.deleteOutfit(selectedOutfit)
      setSelectedOutfit(null)
      refresh()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmSave()
    } else if (e.key === 'Escape') {
      handleCancelSave()
    }
  }

  return (
    <div className="outfit-management">
      <h4>Outfits</h4>

      {outfitNames.length > 0 && (
        <div className="inventory-items">
          {outfitNames.map(name => {
            const thumbnail = getOutfitThumbnail(player.outfits, name)
            return (
              <button
                key={name}
                type="button"
                className={`thumbnail outfit-item ${selectedOutfit === name ? 'selected' : ''}`}
                onClick={() => {
                  if (isNaming) {
                    setNewName(name)
                  } else {
                    setSelectedOutfit(name === selectedOutfit ? null : name)
                  }
                }}
                title={name}
              >
                <div className="thumbnail-image">
                  {thumbnail
                    ? <img src={thumbnail} alt={name} />
                    : '◇'
                  }
                </div>
                <p className="thumbnail-subtitle">{name}</p>
              </button>
            )
          })}
        </div>
      )}

      {isNaming ? (
        <div className="outfit-naming">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Outfit name..."
            autoFocus
          />
          <Button size="small" onClick={handleConfirmSave} disabled={!newName.trim()}>{nameMatchesExisting ? 'Update' : 'Save'}</Button>
          <Button size="small" onClick={handleCancelSave}>Cancel</Button>
        </div>
      ) : (
        <div className="outfit-actions">
          <Button size="small" onClick={handleSaveAs}>Save As...</Button>
          <Button size="small" onClick={handleUpdate} disabled={!selectedOutfit}>Update</Button>
          <Button size="small" onClick={handleWear} disabled={!selectedOutfit || inScene} title={sceneTooltip}>Wear</Button>
          <Button size="small" onClick={handleStrip} disabled={inScene} title={sceneTooltip}>Strip</Button>
          <Button size="small" onClick={handleDelete} disabled={!selectedOutfit}>Delete</Button>
        </div>
      )}
    </div>
  )
}
