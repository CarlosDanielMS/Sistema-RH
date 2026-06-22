import { useState, useCallback } from 'react'
import api from '../services/api'

export interface AuthUser { id: number; name: string; email: string; role: 'admin' | 'user' }

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('rh_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (email: string, password: string) => {
    // OAuth2PasswordRequestForm exige x-www-form-urlencoded
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const { access_token, usuario } = res.data
    const u: AuthUser = {
      id:    usuario.id,
      name:  usuario.nome,
      email: usuario.email,
      role:  usuario.role as 'admin' | 'user',
    }
    localStorage.setItem('rh_token', access_token)
    localStorage.setItem('rh_user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('rh_user')
    localStorage.removeItem('rh_token')
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'

  return { user, login, logout, isAuthenticated: !!user, isAdmin }
}
