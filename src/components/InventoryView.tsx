import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'

export function InventoryView() {
  const { game } = useGame()
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
        </div>
      )}
    </div>
  )
}
