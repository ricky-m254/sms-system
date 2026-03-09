import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { resolveApiBaseUrl } from './baseUrl'

export const apiClient = axios.create({
  baseURL: `${resolveApiBaseUrl().replace(/\/$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const { accessToken, tenantId } = useAuthStore.getState()
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  if (tenantId) {
    config.headers = config.headers ?? {}
    config.headers['X-Tenant-ID'] = tenantId
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState()
      if (isAuthenticated) {
        logout()
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  },
)
