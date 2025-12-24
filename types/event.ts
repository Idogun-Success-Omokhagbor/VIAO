export interface Event {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location: string
  category: string
  image?: string
  organizer: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  attendees: Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>
  price?: number
  isBoosted?: boolean
  coordinates?: {
    lat: number
    lng: number
  }
  createdAt: Date
}

export interface CreateEventData {
  title: string
  description: string
  date: Date
  time: string
  location: string
  category: string
  image?: string
  price?: number
  coordinates?: {
    lat: number
    lng: number
  }
}
