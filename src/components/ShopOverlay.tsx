import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { ShopItemView } from './ShopItemView'
import { Button } from './Button'
import { getNPCDefinition } from '../model/NPC'
import { getItem } from '../model/Item'
import { capitalise } from '../model/Text'
import { assetUrl } from '../utils/assetUrl'
import type { ActiveShop } from '../model/Game'

interface ShopOverlayProps {
  shop: ActiveShop
}

export function ShopOverlay({ shop }: ShopOverlayProps) {
  const { game, runScript, refresh } = useGame()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const npcDef = shop.npcId ? getNPCDefinition(shop.npcId) : undefined
  const npcImage = npcDef?.image

  const playerKrona = game.player.countItem('crown')

  const selectedDef = selectedItemId ? getItem(selectedItemId) : null
  const selectedEntry = selectedItemId ? shop.items.find(e => e.itemId === selectedItemId) : null

  const handleBuy = (itemId: string, price: number) => {
    if (playerKrona < price) return
    game.player.removeItem('crown', price)
    game.player.addItem(itemId)
    game.player.calcStats()
    refresh()
  }

  const handleLeave = () => {
    runScript(['leaveShop', { text: 'You leave the shop.' }])
  }

  return (
    <div className="shop-overlay">
      <div className="shop-header">
        <div className="shop-header-left">
          {npcImage && (
            <img src={assetUrl(npcImage)} alt={npcDef?.name || 'Shopkeeper'} className="shop-npc-image" />
          )}
          <h3 className="shop-title">{shop.name}</h3>
        </div>
        <span className="shop-krona" title={`You have ${playerKrona} Krona`}>{playerKrona} Kr</span>
      </div>

      <div className="shop-items">
        {shop.items.map((entry) => {
          const ownedCount = game.player.countItem(entry.itemId)
          const canAfford = playerKrona >= entry.price

          return (
            <ShopItemView
              key={entry.itemId}
              itemId={entry.itemId}
              price={entry.price}
              ownedCount={ownedCount}
              canAfford={canAfford}
              selected={selectedItemId === entry.itemId}
              onClick={() => setSelectedItemId(selectedItemId === entry.itemId ? null : entry.itemId)}
              onBuy={() => handleBuy(entry.itemId, entry.price)}
            />
          )
        })}
      </div>

      {selectedDef && selectedEntry && (
        <div className="shop-details">
          <h4>{capitalise(selectedDef.name)} — {selectedEntry.price} Kr</h4>
          {selectedDef.description && <p>{selectedDef.description}</p>}
        </div>
      )}

      <div className="shop-actions">
        <Button onClick={handleLeave}>Leave Shop</Button>
      </div>
    </div>
  )
}
