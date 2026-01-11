import type { Script } from "./Scripts"

export type CardId = string
export type CardType = 'Quest' | 'Effect' | 'Trait' | 'Task'

// Mutable data for a card, used for serialization
export interface CardData {
  id?: CardId
  type?: CardType
  // Additional instance-specific properties can be added here
  [key: string]: unknown
}

// Static / library information for a card
export interface CardDefinition {
  name: string
  description?: string
  image?: string
  type: CardType
  script?: Script
  condition?: Script
  afterUpdate?: Script
  // Additional definition properties can be added here
  [key: string]: unknown
}

// Card definitions - currently empty, can be populated in story files
const CARD_DEFINITIONS: Record<CardId, CardDefinition> = {
  // Card definitions will be added here
}

/** Represents a game card instance with mutable state. Definitional data is accessed via the template property. */
export class Card {
  id: CardId
  type: CardType
  // Additional instance-specific properties
  [key: string]: unknown

  constructor(id: CardId, type: CardType) {
    this.id = id
    this.type = type
  }

  /** Gets the card definition template. */
  get template(): CardDefinition {
    const definition = CARD_DEFINITIONS[this.id]
    if (!definition) {
      throw new Error(`Card definition not found: ${this.id}`)
    }
    return definition
  }

  toJSON(): CardData {
    // Serialize id, type, and any additional properties
    const data: CardData = {
      id: this.id,
      type: this.type,
    }
    
    // Include any additional properties that are not part of the base class
    Object.keys(this).forEach(key => {
      if (key !== 'id' && key !== 'type' && key !== 'template') {
        data[key] = this[key]
      }
    })
    
    return data
  }

  static fromJSON(json: string | CardData): Card {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const cardId = data.id
    const cardType = data.type
    
    if (!cardId) {
      throw new Error('Card.fromJSON requires an id')
    }
    
    if (!cardType) {
      throw new Error('Card.fromJSON requires a type')
    }
    
    // Verify definition exists
    if (!CARD_DEFINITIONS[cardId]) {
      throw new Error(`Card definition not found: ${cardId}`)
    }
    
    // Create card instance
    const card = new Card(cardId, cardType)
    
    // Apply any additional serialized properties
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'type') {
        card[key] = data[key]
      }
    })
    
    return card
  }
}

// Get a card definition by id
export function getCard(id: CardId): CardDefinition | undefined {
  return CARD_DEFINITIONS[id]
}

// Export for use in story files
export function registerCardDefinition(id: CardId, definition: CardDefinition): void {
  CARD_DEFINITIONS[id] = definition
}
