// Outfit management utilities

export type OutfitName = string

export interface OutfitEntry {
  items: string[]
  thumbnail?: string  // data URL of avatar snapshot
}

// Supports both new OutfitEntry format and legacy string[] format for backwards compatibility
export type OutfitData = Record<OutfitName, OutfitEntry | string[]>

/** Normalise a raw entry (which may be a legacy string[]) into an OutfitEntry */
function normalise(entry: OutfitEntry | string[]): OutfitEntry {
  if (Array.isArray(entry)) return { items: entry }
  return entry
}

/**
 * Get the list of item IDs that make up an outfit
 */
export function getOutfitItems(outfits: OutfitData, name: OutfitName): string[] {
  const entry = outfits[name]
  if (!entry) return []
  return normalise(entry).items
}

/**
 * Get the thumbnail data URL for an outfit, if one exists
 */
export function getOutfitThumbnail(outfits: OutfitData, name: OutfitName): string | undefined {
  const entry = outfits[name]
  if (!entry) return undefined
  return normalise(entry).thumbnail
}

/**
 * Get all outfit names
 */
export function getOutfitNames(outfits: OutfitData): OutfitName[] {
  return Object.keys(outfits).filter(name => !name.startsWith('_'))
}

/**
 * Check if an outfit exists
 */
export function hasOutfit(outfits: OutfitData, name: OutfitName): boolean {
  return name in outfits
}

/**
 * Create or update an outfit with the given item IDs and optional thumbnail
 */
export function saveOutfit(outfits: OutfitData, name: OutfitName, itemIds: string[], thumbnail?: string): OutfitData {
  return {
    ...outfits,
    [name]: { items: [...itemIds], thumbnail }
  }
}

/**
 * Delete an outfit
 */
export function deleteOutfit(outfits: OutfitData, name: OutfitName): OutfitData {
  const { [name]: _, ...rest } = outfits
  return rest
}

/**
 * Rename an outfit
 */
export function renameOutfit(outfits: OutfitData, oldName: OutfitName, newName: OutfitName): OutfitData {
  if (oldName === newName || !(oldName in outfits)) {
    return outfits
  }
  const { [oldName]: entry, ...rest } = outfits
  return {
    ...rest,
    [newName]: entry
  }
}
