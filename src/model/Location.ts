export interface LocationData {
  id?: string
  name?: string
  image?: string
}

export class Location {
  id?: string
  name?: string
  image?: string

  constructor() {
    this.id = undefined
    this.name = undefined
    this.image = undefined
  }

  toJSON(): LocationData {
    return {
      id: this.id,
      name: this.name,
      image: this.image,
    }
  }

  static fromJSON(json: string | LocationData): Location {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const location = new Location()
    location.id = data.id
    location.name = data.name
    location.image = data.image
    return location
  }
}

