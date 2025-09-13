import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type AuthUser } from '@/services/authApi'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
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
      fetchMe: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await authApi.me()
          set({ user: data.user, isLoading: false })
        } catch {
          set({ user: null, isLoading: false })
        }
      },
      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          await authApi.login(username, password)
          const data = await authApi.me()
          set({ user: data.user, isLoading: false })
          return true
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Login failed', isLoading: false })
          return false
        }
      },
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({ user: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

