import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'
import { Button } from './Button'
import { capitalise } from '../model/Text'

export function InventoryView() {
  const { game, runScript } = useGame()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
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
                onClick={() => runScript('examineItem', { item: selectedItem.id })}
              >
                Examine
              </Button>
            )}
            {selectedItem.template.onConsume && (
              <Button
                disabled={game.scene.options.length > 0}
                onClick={() => runScript('consumeItem', { item: selectedItem.id })}
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
