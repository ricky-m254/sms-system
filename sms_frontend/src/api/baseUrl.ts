export function resolveApiBaseUrl(): string {
  const forcedBase = import.meta.env.VITE_FORCE_API_BASE_URL?.trim()
  if (forcedBase) {
    return forcedBase
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBase) {
    return configuredBase
  }

  // In production builds, frontend and backend are served from the same origin.
  // Use the current window origin so API calls go to the same domain with no port suffix.
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  // In development, the backend runs on a separate port (default 8000).
  const fallbackPort = import.meta.env.VITE_API_PORT?.trim() || '8000'
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${fallbackPort}`
  }

  return `http://localhost:${fallbackPort}`
}
