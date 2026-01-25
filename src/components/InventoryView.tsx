import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'
import { Button } from './Button'
import { capitalise } from '../model/Text'
import type { ItemCategory } from '../model/Item'

type FilterOption = 'All' | ItemCategory

const FILTER_OPTIONS: FilterOption[] = ['All', 'Consumables', 'Clothes', 'Components', 'Valuables', 'Special']

interface InventoryViewProps {
  onUseItem?: () => void
}

export function InventoryView({ onUseItem }: InventoryViewProps) {
  const { game, runScript } = useGame()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterOption>('All')
  const inventory = game.player.inventory

  // Filter inventory based on selected category
  const filteredInventory = filter === 'All'
    ? inventory
    : inventory.filter(item => item.template.category === filter)

  if (inventory.length === 0) {
    return (
      <div className="inventory">
        <p>Inventory is empty</p>
      </div>
    )
  }

  // Find the selected item from the filtered list
  const selectedItem = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < filteredInventory.length
    ? filteredInventory[selectedIndex]
    : null

  // Reset selection when filter changes and selected item is no longer visible
  const handleFilterChange = (newFilter: FilterOption) => {
    setFilter(newFilter)
    setSelectedIndex(null)
  }

  const handleDiscard = () => {
    if (selectedItem) {
      runScript('loseItem', { item: selectedItem.id, number: 1 })
      // Reset selection if item is fully removed
      const remaining = inventory.find(i => i.id === selectedItem.id)
      if (!remaining || remaining.number <= 1) {
        setSelectedIndex(null)
      }
    }
  }

  const canDiscard = selectedItem && selectedItem.template.category !== 'Special'
  const inScene = game.scene.options.length > 0
  const sceneTooltip = inScene ? 'Cannot use items during scene' : undefined

  return (
    <div className="inventory">
      <div className="inventory-filter-bar">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option}
            className={`inventory-filter-btn ${filter === option ? 'active' : ''}`}
            onClick={() => handleFilterChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="inventory-items">
        {filteredInventory.length === 0 ? (
          <p className="text-muted">No {filter.toLowerCase()} items</p>
        ) : (
          filteredInventory.map((item, index) => (
            <ItemView
              key={`${item.id}-${index}`}
              item={item}
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
            />
          ))
        )}
      </div>
      <div className="inventory-details">
        {selectedItem ? (
          <>
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
                  disabled={inScene}
                  title={sceneTooltip}
                  onClick={() => runScript('examineItem', { item: selectedItem.id })}
                >
                  Examine
                </Button>
              )}
              {selectedItem.template.onConsume && (
                <Button
                  disabled={inScene}
                  title={sceneTooltip}
                  onClick={() => {
                    runScript('consumeItem', { item: selectedItem.id })
                    onUseItem?.()
                  }}
                >
                  Use
                </Button>
              )}
              <Button
                disabled={inScene || !canDiscard}
                title={!canDiscard ? 'Cannot discard special items' : sceneTooltip}
                onClick={handleDiscard}
              >
                Discard
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted">Select an item to view details</p>
        )}
      </div>
    </div>
  )
}
