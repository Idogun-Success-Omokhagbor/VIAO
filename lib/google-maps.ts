const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim()
export const GOOGLE_MAPS_MAP_ID = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "").trim() || "DEMO_MAP_ID"
const GOOGLE_MAPS_FAILURE_STORAGE_PREFIX = "viao-google-maps-failure:"

type GoogleMapsBrowserApi = {
  importLibrary?: (library: string) => Promise<unknown>
  event?: {
    clearInstanceListeners?: (instance: object) => void
    trigger?: (instance: object, eventName: string) => void
  }
}

type GoogleMapsWindow = Window &
  typeof globalThis & {
    google?: {
      maps?: GoogleMapsBrowserApi
    }
    __viaoGoogleMapsInit__?: () => void
    __viaoGoogleMapsAuthFailed__?: boolean
    __viaoGoogleMapsAuthFailureReason__?: string
    gm_authFailure?: () => void
  }

let googleMapsPromise: Promise<GoogleMapsBrowserApi> | null = null

function getFailureStorageKey() {
  return `${GOOGLE_MAPS_FAILURE_STORAGE_PREFIX}${GOOGLE_MAPS_API_KEY || "missing"}`
}

function readStoredFailure(win: GoogleMapsWindow) {
  try {
    return win.sessionStorage?.getItem(getFailureStorageKey()) || ""
  } catch {
    return ""
  }
}

function storeFailure(win: GoogleMapsWindow, reason: string) {
  try {
    win.sessionStorage?.setItem(getFailureStorageKey(), reason)
  } catch {
    // ignore storage issues
  }
}

function clearStoredFailure(win: GoogleMapsWindow) {
  try {
    win.sessionStorage?.removeItem(getFailureStorageKey())
  } catch {
    // ignore storage issues
  }
}

function getConsoleMessage(args: unknown[]) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg
      if (arg instanceof Error) return arg.message
      return ""
    })
    .join(" ")
}

function normalizeGoogleMapsError(message: string) {
  if (/ApiNotActivatedMapError/i.test(message)) {
    return "Google Maps JavaScript API is not activated on this Google Cloud project."
  }

  if (/BillingNotEnabledMapError|ClientBillingNotEnabledMapError/i.test(message)) {
    return "Google Maps billing is not enabled for this Google Cloud project."
  }

  if (/RefererNotAllowedMapError|ApiTargetBlockedMapError/i.test(message)) {
    return "This Google Maps key is not authorized for the current URL or API restrictions."
  }

  return message
}

function interceptGoogleMapsConsoleErrors(onFailure: (message: string) => void) {
  const originalConsoleError = console.error.bind(console)

  console.error = (...args: unknown[]) => {
    const message = getConsoleMessage(args)
    if (/Google Maps JavaScript API error:/i.test(message)) {
      onFailure(normalizeGoogleMapsError(message))
      return
    }

    originalConsoleError(...args)
  }

  return () => {
    console.error = originalConsoleError
  }
}

export function getGoogleMapsApiKey() {
  return GOOGLE_MAPS_API_KEY
}

export async function loadGoogleMaps(): Promise<GoogleMapsBrowserApi> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only load in the browser")
  }

  const win = window as GoogleMapsWindow

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set")
  }

  const storedFailure = readStoredFailure(win)
  if (storedFailure) {
    win.__viaoGoogleMapsAuthFailed__ = true
    win.__viaoGoogleMapsAuthFailureReason__ = storedFailure
    throw new Error(storedFailure)
  }

  if (win.__viaoGoogleMapsAuthFailed__) {
    throw new Error(win.__viaoGoogleMapsAuthFailureReason__ || "Google Maps authentication failed")
  }

  if (win.google?.maps?.importLibrary) {
    return win.google.maps as GoogleMapsBrowserApi
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise<GoogleMapsBrowserApi>((resolve, reject) => {
    let settled = false

    const finalize = () => {
      restoreConsoleError()
    }

    function fail(message: string) {
      if (settled) return
      settled = true
      win.__viaoGoogleMapsAuthFailed__ = true
      win.__viaoGoogleMapsAuthFailureReason__ = message
      storeFailure(win, message)
      finalize()
      reject(new Error(message))
    }

    function succeed(maps: GoogleMapsBrowserApi) {
      if (settled) return
      settled = true
      win.__viaoGoogleMapsAuthFailed__ = false
      win.__viaoGoogleMapsAuthFailureReason__ = ""
      clearStoredFailure(win)
      finalize()
      resolve(maps)
    }

    const restoreConsoleError = interceptGoogleMapsConsoleErrors(fail)

    win.gm_authFailure = () => {
      fail(
        "Google Maps authorization failed. Enable the Maps JavaScript API and billing for this Google Cloud project.",
      )
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-viao-google-maps="true"]')
    if (existing) {
      existing.addEventListener("load", () => {
        if (win.__viaoGoogleMapsAuthFailed__) {
          fail(win.__viaoGoogleMapsAuthFailureReason__ || "Google Maps authentication failed")
          return
        }
        if (win.google?.maps?.importLibrary) {
          succeed(win.google.maps as GoogleMapsBrowserApi)
        } else {
          fail("Google Maps loaded without importLibrary")
        }
      })
      existing.addEventListener("error", () => fail("Google Maps failed to load"))
      return
    }

    const script = document.createElement("script")
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      loading: "async",
      libraries: "marker",
      callback: "__viaoGoogleMapsInit__",
    })

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    script.dataset.viaoGoogleMaps = "true"

    win.__viaoGoogleMapsInit__ = () => {
      if (win.__viaoGoogleMapsAuthFailed__) {
        fail(win.__viaoGoogleMapsAuthFailureReason__ || "Google Maps authentication failed")
        delete win.__viaoGoogleMapsInit__
        return
      }
      if (win.google?.maps?.importLibrary) {
        succeed(win.google.maps as GoogleMapsBrowserApi)
      } else {
        fail("Google Maps loaded without importLibrary")
      }
      delete win.__viaoGoogleMapsInit__
    }

    script.onerror = () => {
      delete win.__viaoGoogleMapsInit__
      fail("Google Maps failed to load")
    }

    document.head.appendChild(script)
  }).catch((error) => {
    googleMapsPromise = null
    throw error
  })

  return googleMapsPromise!
}
