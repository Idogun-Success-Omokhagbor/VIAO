declare global {
  interface Window {
    google?: any
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
    speechSynthesis: SpeechSynthesis
    User: User
    Event: Event
    Post: Post
    Comment: Comment
    Message: Message
    Conversation: Conversation
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onresult: (event: SpeechRecognitionEvent) => void
    onerror: (event: SpeechRecognitionErrorEvent) => void
    onend: () => void
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
  }

  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative
    length: number
    isFinal: boolean
  }

  interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }

  interface SpeechRecognitionErrorEvent {
    error: string
    message: string
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition
    new (): SpeechRecognition
  }

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition
    new (): SpeechRecognition
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions)
    }

    class Marker {
      constructor(opts?: MarkerOptions)
      addListener(eventName: string, handler: Function): void
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions)
      open(map?: Map, anchor?: Marker): void
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral
      zoom?: number
      styles?: MapTypeStyle[]
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral
      map?: Map
      title?: string
      icon?: string | Icon | Symbol
    }

    interface InfoWindowOptions {
      content?: string | Element
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    interface LatLng {
      lat(): number
      lng(): number
    }

    interface Icon {
      url: string
      size?: Size
      scaledSize?: Size
    }

    interface Symbol {
      path: SymbolPath | string
      scale?: number
      fillColor?: string
      fillOpacity?: number
      strokeColor?: string
      strokeWeight?: number
    }

    interface Size {
      width: number
      height: number
    }

    interface MapTypeStyle {
      featureType?: string
      elementType?: string
      stylers?: MapTypeStyler[]
    }

    interface MapTypeStyler {
      color?: string
      lightness?: number
    }

    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
    }
  }
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  isOrganizer?: boolean
  bio?: string
  location?: string
  interests?: string[]
  createdAt: Date
}

export interface Event {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location: string
  category: string
  image?: string
  organizer: User
  attendees: User[]
  price?: number
  isBoosted?: boolean
  coordinates?: {
    lat: number
    lng: number
  }
  createdAt: Date
}

export interface Post {
  id: string
  content: string
  author: User
  images?: string[]
  tags?: string[]
  likes: string[]
  comments: Comment[]
  createdAt: Date
}

export interface Comment {
  id: string
  content: string
  author: User
  postId: string
  createdAt: Date
}

export interface Message {
  id: string
  content: string
  sender: User
  recipient: User
  timestamp: Date
  read: boolean
}

export interface Conversation {
  id: string
  participants: User[]
  messages: Message[]
  lastMessage?: Message
  updatedAt: Date
}
