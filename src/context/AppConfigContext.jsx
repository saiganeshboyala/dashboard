import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { get } from '../utils/api'
import { getToken } from '../utils/auth'

const AppConfigContext = createContext(null)

/**
 * Provides app-wide config loaded from /api/v1/dynamic/config.
 * Contains all accessible objects with their column definitions.
 * Only fetches when the user is authenticated.
 */
export function AppConfigProvider({ children }) {
  const [config, setConfig]   = useState(null)
  const [loading, setLoading] = useState(false)

  const loadConfig = useCallback(async () => {
    if (!getToken()) return
    setLoading(true)
    try {
      const data = await get('/api/v1/dynamic/config')
      setConfig(data)
    } catch {
      // Non-fatal — app works without config (falls back to hardcoded columns)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  return (
    <AppConfigContext.Provider value={{ config, loading, reload: loadConfig }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  return useContext(AppConfigContext)
}

/** Convenience: get column metadata for a specific object from config */
export function useObjectColumns(objectName) {
  const { config } = useAppConfig()
  if (!config?.objects) return null
  const obj = config.objects.find(o => o.name === objectName)
  return obj?.columns || null
}
