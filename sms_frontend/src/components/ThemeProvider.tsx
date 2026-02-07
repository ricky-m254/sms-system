import { useEffect } from 'react'
import { useModuleSettings } from '../settings/useModuleSettings'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { values } = useModuleSettings('global')
  const preference = typeof values.themePreference === 'string' ? values.themePreference : 'system'

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const shouldUseDark =
        preference === 'dark' || (preference !== 'light' && mediaQuery.matches)
      root.classList.toggle('dark', shouldUseDark)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [preference])

  return <>{children}</>
}
