# Clothing System

The clothing system uses a **position + layer** grid to model what the player is wearing. Each item occupies one or more body positions at a single layer, allowing multiple garments to overlap realistically (e.g. bra + blouse + corset on the chest).

## Positions and Layers

**Positions** (where on the body):

| Position | Notes |
|----------|-------|
| `head`   | Hats, caps |
| `face`   | Masks, eyewear |
| `neck`   | Necklaces, scarves, neckties |
| `chest`  | Bras, shirts, corsets |
| `belly`  | Usually covered together with chest |
| `arms`   | Sleeves, armwear |
| `wrists` | Bracelets, cuffs |
| `hands`  | Gloves |
| `waist`  | Belts, sashes |
| `hips`   | Panties, skirts, trousers |
| `legs`   | Stockings, skirts, trousers |
| `feet`   | Socks, boots, shoes |

**Layers** (innermost to outermost):

| Layer       | Examples |
|-------------|----------|
| `body`      | Tattoos, body paint |
| `under`     | Underwear (bra, panties, chemise) |
| `inner`     | Main clothing (shirt, blouse, skirt, dress) |
| `outer`     | Outerwear (jacket, coat, corset over blouse) |
| `accessory` | Jewellery, scarves, hats, gloves |

### Slot Rules

- A **slot** is the combination of one position and one layer, expressed as a key like `"chest:inner"`.
- Only one item can occupy a slot at a time. Wearing a new item in an occupied slot automatically removes the old one.
- A single item can span **multiple positions** at the same layer. A dress occupies `chest`, `belly`, `arms`, `hips`, and `legs` all at the `inner` layer.
- Multiple items can share a **position** if they are on different layers. You can wear a bra (`chest:under`), blouse (`chest:inner`), and corset (`chest:outer`) simultaneously.

## Item Definitions

Clothing items are standard `ItemDefinition` entries with two extra fields:

```typescript
interface ItemDefinition {
  name: string
  description?: string
  image?: string
  category?: ItemCategory        // 'Clothes' for wearable items
  positions?: ClothingPosition[] // Body positions this item covers
  layer?: ClothingLayer          // Which layer it sits on
  calcStats?: (player, item, stats) => void  // Stat modifiers when worn
  onWorn?: (player, item) => void            // Hook called after item is worn
}
```

An item is considered **wearable** if it has both `positions` (non-empty) and `layer` set.

### Base Templates and Extension

Base templates define the standard position/layer combinations for each garment type. Specific items extend a base template to avoid repeating position and layer data:

```typescript
// In base-templates.ts
registerItemDefinition('base-top', {
  name: 'top',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms'],
  layer: 'inner',
})

// In torso.ts - specific item extends the base
registerItemDefinition('blouse-silk', extendItem('base-top', {
  name: 'silk blouse',
  description: 'A fine silk blouse with mother-of-pearl buttons.',
  calcStats: (player) => {
    player.modifyStat('Charm', 3)
  },
}))
```

`extendItem(baseId, overrides)` shallow-merges the base definition with overrides. The base templates are defined in `src/story/items/base-templates.ts`. Specific items are organised by body area across several files in `src/story/items/`.

### Available Base Templates

| Template ID | Positions | Layer |
|-------------|-----------|-------|
| `base-hat` | head | outer |
| `base-mask` | face | outer |
| `base-eyewear` | face | accessory |
| `base-necklace` | neck | accessory |
| `base-collar` | neck | under |
| `base-necktie` | neck | inner |
| `base-bracelet` | wrists | accessory |
| `base-armwear` | arms | accessory |
| `base-bra` | chest | under |
| `base-top` | chest, belly, arms | inner |
| `base-vest` | chest, belly | inner |
| `base-outerwear` | chest, belly, arms | outer |
| `base-corset` | chest, belly | outer |
| `base-panties` | hips | under |
| `base-bottom` | hips, legs | inner |
| `base-shorts` | hips | inner |
| `base-dress` | chest, belly, arms, hips, legs | inner |
| `base-stockings` | legs, feet | under |
| `base-socks` | feet | under |
| `base-footwear` | feet | outer |
| `base-gloves` | hands | accessory |
| `base-belt` | waist | accessory |

## Stat Modifiers

Worn clothing can modify player stats via the `calcStats` callback. The callback uses `player.modifyStat(statName, bonus)` to apply temporary bonuses or penalties:

```typescript
calcStats: (player) => {
  player.modifyStat('Charm', 5)    // Bonus
  player.modifyStat('Agility', -3) // Penalty
}
```

These modifiers are **transient** -- they are recalculated from scratch every time `player.calcStats()` runs. The calculation flow is:

1. Copy `basestats` to `stats`
2. Apply `calcStats` from each **worn** item (unworn wearable items are skipped)
3. Apply `calcStats` from active cards/effects
4. Clamp all stats to 0--100

Multi-position items (like dresses) apply their `calcStats` callback once, not per position.

## Wearing and Removing Items

Key `Player` methods:

| Method | Description |
|--------|-------------|
| `wearItem(itemSpec)` | Wear an item from inventory. Swaps out any existing item in the same slots. Returns `false` if blocked by a locked item. |
| `unwearItem(slotKeyOrItemId, force?)` | Remove by slot key (`"chest:inner"`) or item ID. Respects locked items unless `force` is true. |
| `isWearing(itemId)` | Check if an item ID is currently worn. |
| `getWorn(slotKey)` | Get the item at a specific slot. |
| `getWornAt(position, layer)` | Get the item at a position/layer combination. |
| `getWornItems()` | Get all currently worn items. |
| `stripAll(force?)` | Remove all worn items. Skips locked items unless `force` is true. |

### Locked Items

Items can be marked `locked = true`, typically via the `onWorn` hook (e.g. cursed items). Locked items:
- Cannot be removed by `unwearItem()` or `stripAll()` unless `force` is passed
- Block other items from being worn in the same slots
- Persist their locked state through save/load

## Outfits

Players can save and load named outfits -- snapshots of which items are currently worn.

| Method | Description |
|--------|-------------|
| `saveOutfit(name)` | Save current worn item IDs as a named outfit |
| `wearOutfit(name)` | Strip all, then wear each item in the outfit (skipping items not in inventory) |
| `deleteOutfit(name)` | Delete a saved outfit |

Outfit data is stored as `Record<string, string[]>` mapping outfit names to arrays of item IDs. This is fully JSON-serializable and persists across saves.

The outfit utilities in `src/model/Outfits.ts` use an immutable pattern -- all operations return new objects rather than mutating state.

## Shops

Clothing can be purchased from shops. A shop is defined as an `ActiveShop`:

```typescript
type ActiveShop = {
  name: string
  npcId?: string          // Optional shopkeeper NPC
  items: ShopItemEntry[]  // Available items with prices
}
```

Opening a shop sets `game.scene.shop`, which triggers the shop overlay UI. Purchases deduct Krona (`crown` item) and add the item to inventory. Shop definitions live in the relevant story files (e.g. `src/story/Market.ts`).

## Serialisation

Only mutable state is saved per item:

```typescript
interface ItemData {
  id: ItemId
  number: number
  worn?: boolean
  locked?: boolean
}
```

The `positions`, `layer`, `calcStats`, and other definitional data come from the item's registered template, which is reconstructed on load. This means clothing definitions can be changed without invalidating existing saves.

## Key Source Files

| File | Contents |
|------|----------|
| `src/model/Item.ts` | Types, `ItemDefinition`, `Item` class, registry |
| `src/model/Player.ts` | Wearing/removing methods, stat calculation |
| `src/model/Outfits.ts` | Outfit CRUD utilities |
| `src/story/items/base-templates.ts` | Base garment templates |
| `src/story/items/*.ts` | Specific clothing definitions by body area |
| `src/story/Market.ts` | Shop inventories and shopkeeper NPCs |
| `src/components/ClothingGrid.tsx` | Visual grid of worn items |
| `src/components/InventoryView.tsx` | Inventory with wear/remove actions |
| `src/components/OutfitManagement.tsx` | Save/load/delete outfits |
| `src/components/ShopOverlay.tsx` | Shop purchase UI |
| `src/story/Clothing.test.ts` | Tests for wearing, stats, serialisation |
