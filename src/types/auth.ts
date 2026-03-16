export type AuthProvider = 'email' | 'google';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
}
