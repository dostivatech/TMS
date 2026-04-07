import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authAPI } from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token')
        if (token) {
          const { data } = await authAPI.me()
          setUser(data)
        }
      } catch {
        await AsyncStorage.clear()
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  const login = async (username, password) => {
    const { data } = await authAPI.login({ username, password })
    await AsyncStorage.setItem('access_token', data.access)
    await AsyncStorage.setItem('refresh_token', data.refresh)
    const { data: me } = await authAPI.me()
    setUser(me)
    return me
  }

  const logout = async () => {
    await AsyncStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
