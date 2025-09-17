import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type AuthUser } from '@/services/authApi'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  initialized: boolean
  fetchMe: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,
      initialized: false,
      fetchMe: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await authApi.me()
          set({ user: data.user, isLoading: false, initialized: true })
        } catch {
          set({ user: null, isLoading: false, initialized: true })
        }
      },
      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          await authApi.login(username, password)
          const data = await authApi.me()
          set({ user: data.user, isLoading: false, initialized: true })
          return true
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Login failed', isLoading: false, initialized: true })
          return false
        }
      },
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({ user: null, initialized: true })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
