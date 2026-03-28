import { useEffect, useState } from 'react'
import { publicApiClient } from '../api/publicClient'

const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'platform', 'app', 'mail', 'smtp',
  'ftp', 'static', 'media', 'cdn', 'status', 'help',
])

export type TenantDetectionState = {
  loading: boolean
  detected: boolean
  tenantId: string | null
  tenantName: string | null
  status: string | null
  subdomain: string | null
  errorCode: string | null
  errorMessage: string | null
}

function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null
  const parts = hostname.split('.')
  if (parts.length < 3) return null
  const sub = parts[0].toLowerCase()
  if (RESERVED_SUBDOMAINS.has(sub)) return null
  if (sub === 'localhost' || sub === '127') return null
  return sub
}

export function useTenantDetection(): TenantDetectionState {
  const [state, setState] = useState<TenantDetectionState>({
    loading: false,
    detected: false,
    tenantId: null,
    tenantName: null,
    status: null,
    subdomain: null,
    errorCode: null,
    errorMessage: null,
  })

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const subdomain = extractSubdomain(hostname)

    if (!subdomain) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    setState(s => ({ ...s, loading: true, subdomain }))

    publicApiClient
      .get('/tenant/info/', {
        headers: { 'X-Tenant-ID': subdomain },
      })
      .then(res => {
        const data = res.data as {
          schema_name: string
          tenant_name: string
          status: string
        }
        setState({
          loading: false,
          detected: true,
          tenantId: data.schema_name,
          tenantName: data.tenant_name,
          status: data.status,
          subdomain,
          errorCode: null,
          errorMessage: null,
        })
      })
      .catch(err => {
        const resp = err?.response
        const code: string = resp?.data?.code ?? 'TENANT_NOT_FOUND'
        const message: string =
          resp?.data?.error ?? resp?.data?.detail ?? 'School not found for this address.'
        const tenantName: string | null = resp?.data?.tenant_name ?? null
        setState({
          loading: false,
          detected: false,
          tenantId: null,
          tenantName,
          status: null,
          subdomain,
          errorCode: code,
          errorMessage: message,
        })
      })
  }, [])

  return state
}
