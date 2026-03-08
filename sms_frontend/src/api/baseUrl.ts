export function resolveApiBaseUrl(): string {
  const forcedBase = import.meta.env.VITE_FORCE_API_BASE_URL?.trim()
  if (forcedBase) {
    return forcedBase
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBase) {
    return configuredBase
  }

  // In production, frontend and backend are served from the same origin.
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  // In development, use an empty base so all /api calls are relative.
  // Vite's dev server proxies /api/* → localhost:8000 (see vite.config.ts).
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  return ''
}
