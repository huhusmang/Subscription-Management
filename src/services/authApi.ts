import { apiClient } from '@/utils/api-client';

export interface AuthUser {
  username: string;
  role?: string;
}

export const authApi = {
  async me(): Promise<{ user: AuthUser }> {
    return apiClient.get('/auth/me');
  },
  async login(username: string, password: string): Promise<{ message: string }> {
    return apiClient.post('/auth/login', { username, password });
  },
  async logout(): Promise<{ message: string }> {
    return apiClient.post('/auth/logout', {});
  },
  async changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword?: string }): Promise<{ message: string }> {
    return apiClient.post('/auth/change-password', payload);
  },
};

