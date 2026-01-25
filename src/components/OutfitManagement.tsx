import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { getOutfitNames } from '../model/Outfits'
import { Button } from './Button'

export function OutfitManagement() {
  const { game, refresh } = useGame()
  const player = game.player
  const inScene = game.scene.options.length > 0
  const sceneTooltip = inScene ? 'Cannot change clothes during scene' : undefined
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null)
  const [isNaming, setIsNaming] = useState(false)
  const [newName, setNewName] = useState('')

  const outfitNames = getOutfitNames(player.outfits)

  const handleSaveAs = () => {
    setIsNaming(true)
    setNewName('')
  }

  const handleConfirmSave = () => {
    if (newName.trim()) {
      player.saveOutfit(newName.trim())
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

  const handleUpdate = () => {
    if (selectedOutfit) {
      player.saveOutfit(selectedOutfit)
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
        <div className="outfit-list">
          {outfitNames.map(name => (
            <button
              key={name}
              className={`outfit-item ${selectedOutfit === name ? 'selected' : ''}`}
              onClick={() => setSelectedOutfit(name === selectedOutfit ? null : name)}
            >
              {name}
            </button>
          ))}
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
          <Button onClick={handleConfirmSave} disabled={!newName.trim()}>Save</Button>
          <Button onClick={handleCancelSave}>Cancel</Button>
        </div>
      ) : (
        <div className="outfit-actions">
          <Button onClick={handleSaveAs}>Save As...</Button>
          <Button onClick={handleUpdate} disabled={!selectedOutfit}>Update</Button>
          <Button onClick={handleWear} disabled={!selectedOutfit || inScene} title={sceneTooltip}>Wear</Button>
          <Button onClick={handleStrip} disabled={inScene} title={sceneTooltip}>Strip</Button>
          <Button onClick={handleDelete} disabled={!selectedOutfit}>Delete</Button>
        </div>
      )}
    </div>
  )
}
