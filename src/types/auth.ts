export type UserRole = 'student' | 'lecturer' | 'researcher' | 'scholar';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institution?: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  vaultEncryptionEnabled: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  isVaultLocked: boolean;
}
