import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  tenantId: string | null
  username: string | null
  role: string | null
  permissions: string[]
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setTenant: (tenantId: string | null) => void
  setUsername: (username: string | null) => void
  setRole: (role: string | null) => void
  setPermissions: (permissions: string[]) => void
  logout: () => void
}

const ACCESS_TOKEN_KEY = 'sms_access_token'
const REFRESH_TOKEN_KEY = 'sms_refresh_token'
const TENANT_ID_KEY = 'sms_tenant_id'
const USERNAME_KEY = 'sms_username'
const ROLE_KEY = 'sms_role'
const PERMISSIONS_KEY = 'sms_permissions'

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const accessToken = readStorage(ACCESS_TOKEN_KEY)
  const refreshToken = readStorage(REFRESH_TOKEN_KEY)
  const tenantId = readStorage(TENANT_ID_KEY)
  const username = readStorage(USERNAME_KEY)
  const role = readStorage(ROLE_KEY)
  const permissions = (() => {
    const raw = readStorage(PERMISSIONS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string') as string[]
    } catch {
      // ignore
    }
    return raw.split(',').map((item) => item.trim()).filter(Boolean)
  })()

  return {
    accessToken,
    refreshToken,
    tenantId,
    username,
    role,
    permissions,
    isAuthenticated: Boolean(accessToken),
    setTokens: (nextAccess, nextRefresh) => {
      writeStorage(ACCESS_TOKEN_KEY, nextAccess)
      writeStorage(REFRESH_TOKEN_KEY, nextRefresh)
      set({
        accessToken: nextAccess,
        refreshToken: nextRefresh,
        isAuthenticated: Boolean(nextAccess),
      })
    },
    setTenant: (nextTenant) => {
      writeStorage(TENANT_ID_KEY, nextTenant)
      set({ tenantId: nextTenant })
    },
    setUsername: (nextUsername) => {
      writeStorage(USERNAME_KEY, nextUsername)
      set({ username: nextUsername })
    },
    setRole: (nextRole) => {
      writeStorage(ROLE_KEY, nextRole)
      set({ role: nextRole })
    },
    setPermissions: (nextPermissions) => {
      writeStorage(PERMISSIONS_KEY, JSON.stringify(nextPermissions))
      set({ permissions: nextPermissions })
    },
    logout: () => {
      writeStorage(ACCESS_TOKEN_KEY, null)
      writeStorage(REFRESH_TOKEN_KEY, null)
      writeStorage(TENANT_ID_KEY, null)
      writeStorage(USERNAME_KEY, null)
      writeStorage(ROLE_KEY, null)
      writeStorage(PERMISSIONS_KEY, null)
      set({
        accessToken: null,
        refreshToken: null,
        tenantId: null,
        username: null,
        role: null,
        permissions: [],
        isAuthenticated: false,
      })
    },
  }
})
