import { useState } from 'react'
import type { Player } from '../model/Player'
import { getOutfitNames } from '../model/Outfits'
import { Button } from './Button'

interface OutfitManagementProps {
  player: Player
  onOutfitChange: () => void
}

export function OutfitManagement({ player, onOutfitChange }: OutfitManagementProps) {
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
      onOutfitChange()
    }
  }

  const handleCancelSave = () => {
    setIsNaming(false)
    setNewName('')
  }

  const handleUpdate = () => {
    if (selectedOutfit) {
      player.saveOutfit(selectedOutfit)
      onOutfitChange()
    }
  }

  const handleStrip = () => {
    player.stripAll()
    player.calcStats()
    onOutfitChange()
  }

  const handleWear = () => {
    if (selectedOutfit) {
      player.wearOutfit(selectedOutfit)
      player.calcStats()
      onOutfitChange()
    }
  }

  const handleDelete = () => {
    if (selectedOutfit) {
      player.deleteOutfit(selectedOutfit)
      setSelectedOutfit(null)
      onOutfitChange()
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
          <Button onClick={handleWear} disabled={!selectedOutfit}>Wear</Button>
          <Button onClick={handleStrip}>Strip</Button>
          <Button onClick={handleDelete} disabled={!selectedOutfit}>Delete</Button>
        </div>
      )}
    </div>
  )
}
