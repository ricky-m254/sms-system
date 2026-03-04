export function resolveApiBaseUrl(): string {
  const forcedBase = import.meta.env.VITE_FORCE_API_BASE_URL?.trim()
  if (forcedBase) {
    return forcedBase
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBase) {
    return configuredBase
  }

  const fallbackPort = import.meta.env.VITE_API_PORT?.trim() || '8000'
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${fallbackPort}`
  }

  return `http://localhost:${fallbackPort}`
}
