export type AuthProvider = 'email' | 'google';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
}

export interface AuthSessionState {
  user: AuthUser | null;
  session?: {
    expiresAt?: string | null;
  } | null;
  reason?: 'no_session' | 'refresh_failed' | 'signed_out' | 'token_invalid';
}
