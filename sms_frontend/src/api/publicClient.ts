import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { resolveApiBaseUrl } from './baseUrl'

export const publicApiClient = axios.create({
  baseURL: `${resolveApiBaseUrl().replace(/\/$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

publicApiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})
