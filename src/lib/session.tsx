import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SiteUser } from '../../shared/types'
import { api } from './api'

const SessionContext = createContext<SiteUser | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SiteUser | null>(null)

  useEffect(() => {
    api
      .me()
      .then((me) => setUser({ id: me.id, name: me.name }))
      .catch(() => setUser(null))
  }, [])

  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}
