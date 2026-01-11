import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'
import { Button } from './Button'
import { Game } from '../model/Game'

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
          <h4>{selectedItem.template.name}</h4>
          {selectedItem.template.stackable && selectedItem.number > 1 && (
            <p>Quantity: {selectedItem.number}</p>
          )}
          {selectedItem.template.description && (
            <p>{selectedItem.template.description}</p>
          )}
          <Button
            disabled={!selectedItem.template.onConsume || game.scene.options.length > 0}
            onClick={() => {
              if (!game || !selectedItem) return
              const itemDef = selectedItem.template
              if (itemDef.onConsume) {
                game.clearScene()
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
        </div>
      )}
    </div>
  )
}
