import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'
import { Button } from './Button'
import { Game } from '../model/Game'
import { capitalise } from '../model/Text'

export function InventoryView() {
  const { game, setGame } = useGame()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!game) {
    return null
  }

  const inventory = game.player.inventory

  if (inventory.length === 0) {
    return (
      <div className="inventory">
        <p>Inventory is empty</p>
      </div>
    )
  }

  const selectedItem = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < inventory.length
    ? inventory[selectedIndex]
    : null

  return (
    <div className="inventory">
      <div className="inventory-items">
        {inventory.map((item, index) => (
          <ItemView
            key={`${item.id}-${index}`}
            item={item}
            selected={selectedIndex === index}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>
      {selectedItem && (
        <div className="inventory-details">
          <h4>{capitalise(selectedItem.template.name)}</h4>
          {selectedItem.template.stackable && selectedItem.number > 1 && (
            <p>Quantity: {selectedItem.number}</p>
          )}
          {selectedItem.template.description && (
            <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{selectedItem.template.description}</p>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {selectedItem.template.onExamine && (
              <Button
                disabled={game.scene.options.length > 0}
                onClick={() => {
                  if (!game || !selectedItem) return
                  const itemDef = selectedItem.template
                  if (itemDef.onExamine) {
                    game.clearScene()
                    itemDef.onExamine(game, {})
                    // Trigger React update
                    const gameJson = JSON.stringify(game.toJSON())
                    const updatedGame = Game.fromJSON(gameJson)
                    setGame(updatedGame)
                    localStorage.setItem('gameSave', gameJson)
                  }
                }}
              >
                Examine
              </Button>
            )}
            {selectedItem.template.onConsume && (
              <Button
                disabled={game.scene.options.length > 0}
                onClick={() => {
                  if (!game || !selectedItem) return
                  const itemDef = selectedItem.template
                  if (itemDef.onConsume) {
                    game.clearScene()
                    // Remove the item from inventory first
                    game.player.removeItem(selectedItem.id, 1)
                    // Recalculate stats after removing item (in case item had stat modifiers)
                    game.player.calcStats()
                    // Then call the onConsume script
                    itemDef.onConsume(game, {})
                    // Run afterUpdate scripts for all cards
                    game.player.cards.forEach(card => {
                      const cardDef = card.template
                      if (cardDef.afterUpdate) {
                        cardDef.afterUpdate(game, {})
                      }
                    })
                    // Trigger React update
                    const gameJson = JSON.stringify(game.toJSON())
                    const updatedGame = Game.fromJSON(gameJson)
                    setGame(updatedGame)
                    localStorage.setItem('gameSave', gameJson)
                  }
                }}
              >
                Use
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
