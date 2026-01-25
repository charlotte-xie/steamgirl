import type { Player } from '../model/Player'
import type { ClothingPosition, ClothingLayer } from '../model/Item'
import type { Item } from '../model/Item'
import { capitalise } from '../model/Text'
import { Tooltip } from './Tooltip'
import { ItemIcon } from './ItemIcon'

// Grid layout: rows = positions (top to bottom of body), columns = layers (outermost to innermost)
// Arms/hands/wrists before chest so that connected items (chest+belly+waist, chest+arms) are adjacent
const POSITIONS: ClothingPosition[] = ['head', 'face', 'neck', 'hands', 'wrists', 'arms', 'chest', 'belly', 'waist', 'legs', 'feet']
const LAYERS: ClothingLayer[] = ['accessory', 'outer', 'inner', 'under', 'body']

// Always show these positions even if empty
const ALWAYS_SHOW: ClothingPosition[] = ['head', 'chest', 'belly', 'legs', 'feet']

// Short labels for header
const LAYER_LABELS: Record<ClothingLayer, string> = {
  accessory: 'Acc.',
  outer: 'Outer',
  inner: 'Inner',
  under: 'Under',
  body: 'Body',
}

// Short labels for positions
const POSITION_LABELS: Record<ClothingPosition, string> = {
  head: 'Head',
  face: 'Face',
  neck: 'Neck',
  chest: 'Chest',
  belly: 'Belly',
  arms: 'Arms',
  wrists: 'Wrists',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
}

interface ClothingGridProps {
  player: Player
  selectedItem: Item | null
  onSelectItem: (item: Item | null) => void
}

export function ClothingGrid({ player, selectedItem, onSelectItem }: ClothingGridProps) {
  const getWornItem = (position: ClothingPosition, layer: ClothingLayer): Item | undefined => {
    return player.getWornAt(position, layer)
  }

  // Check if a position has any items worn
  const hasItemsAtPosition = (position: ClothingPosition): boolean => {
    return LAYERS.some(layer => getWornItem(position, layer) !== undefined)
  }

  // Filter positions: always show essential ones, others only if they have items
  const visiblePositions = POSITIONS.filter(position =>
    ALWAYS_SHOW.includes(position) || hasItemsAtPosition(position)
  )

  const handleCellClick = (item: Item | undefined) => {
    if (item) {
      onSelectItem(item)
    }
  }

  return (
    <div className="clothing-grid">
      {/* Header row */}
      <div className="clothing-grid-row clothing-grid-header">
        <div className="clothing-grid-label"></div>
        {LAYERS.map(layer => (
          <div key={layer} className="clothing-grid-cell clothing-grid-header-cell">
            {LAYER_LABELS[layer]}
          </div>
        ))}
      </div>

      {/* Body rows */}
      {visiblePositions.map(position => (
        <div key={position} className="clothing-grid-row">
          <div className="clothing-grid-label">{POSITION_LABELS[position]}</div>
          {LAYERS.map(layer => {
            const item = getWornItem(position, layer)
            const isSelected = item && selectedItem && item === selectedItem

            return (
              <div
                key={`${position}-${layer}`}
                className={`clothing-grid-cell ${item ? 'has-item' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCellClick(item)}
              >
                {item ? (
                  <Tooltip content={item.template.description || capitalise(item.template.name)}>
                    <ItemIcon item={item} />
                  </Tooltip>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
