import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type AuthUser } from '@/services/authApi'
import { ApiError } from '@/config/api'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  initialized: boolean
  fetchMe: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) => Promise<{ ok: boolean; message?: string; error?: string; code?: string }>
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
      changePassword: async (currentPassword, newPassword, confirmPassword) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.changePassword({ currentPassword, newPassword, confirmPassword })
          set({ isLoading: false })
          return { ok: true, message: response.message }
        } catch (error) {
          let message = 'Password update failed'
          let code: string | undefined

          if (error instanceof ApiError) {
            message = error.message || message
            if (error.data && typeof error.data === 'object' && 'code' in error.data) {
              code = (error.data as { code?: string }).code
            }
          } else if (error instanceof Error) {
            message = error.message
          }

          set({ error: message, isLoading: false })
          return { ok: false, error: message, code }
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
