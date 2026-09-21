export type ElectricityEntry = {
  id: string
  date: string
  recordTime: string
  startUnit: number
  endUnit: number
  rate: number
}

const CACHE_KEY = 'electricity-log.entries.v1'
const API_URL = (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined)?.trim() ?? ''

function readCache(): ElectricityEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ElectricityEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCache(entries: ElectricityEntry[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries))
}

async function request<T>(payload?: unknown, query = ''): Promise<T> {
  if (!API_URL) throw new Error('APPS_SCRIPT_URL_NOT_CONFIGURED')
  const response = payload === undefined
    ? await fetch(`${API_URL}${query}`, { method: 'GET', redirect: 'follow' })
    : await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })

  if (!response.ok) throw new Error(`API_HTTP_${response.status}`)
  const data = await response.json() as T & { ok?: boolean; error?: string }
  if (data && data.ok === false) throw new Error(data.error || 'API_ERROR')
  return data
}

export const electricityRepository = {
  isRemoteConfigured() {
    return Boolean(API_URL)
  },

  getCachedEntries() {
    return readCache()
  },

  async list(): Promise<{ entries: ElectricityEntry[]; source: 'remote' | 'cache' }> {
    if (!API_URL) return { entries: readCache(), source: 'cache' }
    try {
      const result = await request<{ ok: boolean; entries: ElectricityEntry[] }>(undefined, '?action=list')
      const entries = Array.isArray(result.entries) ? result.entries : []
      writeCache(entries)
      return { entries, source: 'remote' }
    } catch {
      return { entries: readCache(), source: 'cache' }
    }
  },

  async upsert(entry: ElectricityEntry): Promise<'remote' | 'cache'> {
    const cached = readCache()
    const next = cached.some((item) => item.id === entry.id)
      ? cached.map((item) => item.id === entry.id ? entry : item)
      : [...cached, entry]
    writeCache(next)
    if (!API_URL) return 'cache'
    await request<{ ok: boolean }>({ action: 'upsert', entry })
    return 'remote'
  },

  async remove(id: string): Promise<'remote' | 'cache'> {
    writeCache(readCache().filter((entry) => entry.id !== id))
    if (!API_URL) return 'cache'
    await request<{ ok: boolean }>({ action: 'delete', id })
    return 'remote'
  },
}
