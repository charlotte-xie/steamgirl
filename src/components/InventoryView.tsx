import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ItemView } from './ItemView'
import { Button } from './Button'
import { ClothingGrid } from './ClothingGrid'
import { OutfitManagement } from './OutfitManagement'
import { capitalise } from '../model/Text'
import type { Item, ItemCategory } from '../model/Item'

type FilterOption = 'All' | 'Worn' | ItemCategory

const FILTER_OPTIONS: FilterOption[] = ['All', 'Worn', 'Consumables', 'Clothes', 'Components', 'Valuables', 'Special']

interface InventoryViewProps {
  onUseItem?: () => void
}

export function InventoryView({ onUseItem }: InventoryViewProps) {
  const { game, runScript, refresh } = useGame()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [filter, setFilter] = useState<FilterOption>('All')
  const inventory = game.player.inventory

  // Filter inventory based on selected category
  const filteredInventory = filter === 'All'
    ? inventory
    : filter === 'Worn'
      ? inventory.filter(item => item.worn)
      : inventory.filter(item => item.template.category === filter)

  // Reset selection when filter changes
  const handleFilterChange = (newFilter: FilterOption) => {
    setFilter(newFilter)
    setSelectedItem(null)
  }

  // Select item from list - find by reference
  const handleSelectFromList = (item: Item) => {
    setSelectedItem(item)
  }

  // Select item from clothing grid
  const handleSelectFromGrid = (item: Item | null) => {
    setSelectedItem(item)
  }

  const handleDiscard = () => {
    if (selectedItem) {
      runScript('loseItem', { item: selectedItem.id, number: 1 })
      setSelectedItem(null)
    }
  }

  const handleWear = () => {
    if (selectedItem && !selectedItem.worn) {
      game.player.wearItem(selectedItem)
      game.player.calcStats()
      refresh()
    }
  }

  const handleRemove = () => {
    if (selectedItem && selectedItem.worn) {
      game.player.unwearItem(selectedItem.id)
      game.player.calcStats()
      refresh()
    }
  }

  // Check if selected item is wearable
  const isWearable = selectedItem?.template.positions && selectedItem.template.positions.length > 0 && selectedItem.template.layer
  const canWear = isWearable && !selectedItem?.worn
  const isLocked = selectedItem?.locked
  const canDiscard = selectedItem && selectedItem.template.category !== 'Special' && !selectedItem.worn
  const inScene = game.scene.options.length > 0
  const sceneTooltip = inScene ? 'Cannot use items during scene' : undefined
  const lockedTooltip = isLocked ? 'This item is locked and cannot be removed' : undefined

  if (inventory.length === 0) {
    return (
      <div className="inventory">
        <p>Inventory is empty</p>
      </div>
    )
  }

  return (
    <div className="inventory inventory-with-grid">
      <div className="inventory-main">
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
                selected={selectedItem === item}
                onClick={() => handleSelectFromList(item)}
              />
            ))
          )}
        </div>
        <div className="inventory-details">
          {selectedItem ? (
            <>
              <h4>{capitalise(selectedItem.template.name)}{selectedItem.worn ? ' (worn)' : ''}</h4>
              {selectedItem.template.stackable && selectedItem.number > 1 && (
                <p>Quantity: {selectedItem.number}</p>
              )}
              {selectedItem.template.description && (
                <p style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{selectedItem.template.description}</p>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {selectedItem.template.onExamine && (
                  <Button
                    size="small"
                    disabled={inScene}
                    title={sceneTooltip}
                    onClick={() => runScript('examineItem', { item: selectedItem.id })}
                  >
                    Examine
                  </Button>
                )}
                {selectedItem.template.onConsume && (
                  <Button
                    size="small"
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
                {canWear && (
                  <Button
                    size="small"
                    disabled={inScene}
                    title={sceneTooltip}
                    onClick={handleWear}
                  >
                    Wear
                  </Button>
                )}
                {isWearable && selectedItem?.worn && (
                  <Button
                    size="small"
                    disabled={inScene || isLocked}
                    title={isLocked ? lockedTooltip : sceneTooltip}
                    onClick={handleRemove}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  size="small"
                  disabled={inScene || !canDiscard}
                  title={!canDiscard ? (selectedItem.worn ? 'Remove item first' : 'Cannot discard special items') : sceneTooltip}
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
      <div className="inventory-clothing">
        <h4>Worn</h4>
        <ClothingGrid
          player={game.player}
          selectedItem={selectedItem}
          onSelectItem={handleSelectFromGrid}
        />
        <OutfitManagement />
      </div>
    </div>
  )
}
