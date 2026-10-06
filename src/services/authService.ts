import { UserProfile, AuthState } from '../types/auth';

const STORAGE_KEY_AUTH_USER = 'folio_auth_user_session_v1';
const STORAGE_KEY_USER_ACCOUNTS = 'folio_registered_accounts_v1';
const STORAGE_KEY_VAULT_PIN = 'folio_vault_pin_v1';

export const DEMO_USERS: Record<string, UserProfile & { password: string }> = {
  scholar: {
    id: 'user-demo-scholar',
    email: 'scholar@oxford.edu',
    name: 'Dr. Evelyn Vance',
    role: 'lecturer',
    institution: 'University of Oxford • Computer Science',
    createdAt: Date.now() - 86400000 * 30,
    lastLoginAt: Date.now(),
    vaultEncryptionEnabled: true,
    password: 'password123',
  },
  student: {
    id: 'user-demo-student',
    email: 'alex.chen@mit.edu',
    name: 'Alex Chen',
    role: 'student',
    institution: 'MIT • Electrical Engineering & CS',
    createdAt: Date.now() - 86400000 * 14,
    lastLoginAt: Date.now(),
    vaultEncryptionEnabled: true,
    password: 'password123',
  },
  researcher: {
    id: 'user-demo-researcher',
    email: 'marcus.ross@cmu.edu',
    name: 'Marcus Ross',
    role: 'researcher',
    institution: 'Carnegie Mellon • Language Technologies',
    createdAt: Date.now() - 86400000 * 45,
    lastLoginAt: Date.now(),
    vaultEncryptionEnabled: true,
    password: 'password123',
  },
};

class AuthService {
  private currentUser: UserProfile | null = null;
  private isVaultLocked: boolean = false;
  private listeners: Set<(auth: AuthState) => void> = new Set();

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed loading auth session', e);
    }
  }

  public getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.currentUser && !this.isVaultLocked,
      currentUser: this.currentUser,
      isVaultLocked: this.isVaultLocked,
    };
  }

  public subscribe(listener: (auth: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAuthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getAuthState();
    this.listeners.forEach((fn) => fn(state));
  }

  public async signIn(email: string, password?: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    // Artificial slight delay for realistic secure hashing
    await new Promise((r) => setTimeout(r, 450));

    const cleanEmail = email.toLowerCase().trim();

    // Check demo accounts
    const demoKey = Object.keys(DEMO_USERS).find(
      (k) => DEMO_USERS[k].email.toLowerCase() === cleanEmail
    );
    if (demoKey) {
      const demo = DEMO_USERS[demoKey];
      if (password && password !== demo.password && password !== 'password123' && password !== 'admin') {
        return { success: false, error: 'Invalid password. (Hint: Try "password123" or use 1-click demo login)' };
      }
      const user: UserProfile = {
        ...demo,
        lastLoginAt: Date.now(),
      };
      this.setSession(user);
      return { success: true, user };
    }

    // Check registered local accounts
    const registered = this.getRegisteredAccounts();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      const user: UserProfile = {
        ...existing,
        lastLoginAt: Date.now(),
      };
      this.setSession(user);
      return { success: true, user };
    }

    // If new user entering sign in, auto-provision guest account with nice name
    const generatedName = cleanEmail.split('@')[0]
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: generatedName || 'Scholar',
      role: 'student',
      institution: cleanEmail.includes('.edu') ? 'Academic Institution' : 'Independent Scholar',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      vaultEncryptionEnabled: true,
    };

    this.saveRegisteredAccount(newUser);
    this.setSession(newUser);
    return { success: true, user: newUser };
  }

  public async signUp(
    name: string,
    email: string,
    role: UserProfile['role'] = 'student',
    institution?: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    await new Promise((r) => setTimeout(r, 450));
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      email: cleanEmail,
      name: name.trim() || 'Scholar',
      role,
      institution: institution?.trim() || 'Academic Institution',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      vaultEncryptionEnabled: true,
    };

    this.saveRegisteredAccount(newUser);
    this.setSession(newUser);
    return { success: true, user: newUser };
  }

  public async loginAsDemo(roleKey: 'scholar' | 'student' | 'researcher'): Promise<UserProfile> {
    const demo = DEMO_USERS[roleKey] || DEMO_USERS.scholar;
    const user: UserProfile = {
      ...demo,
      lastLoginAt: Date.now(),
    };
    this.setSession(user);
    return user;
  }

  public signOut() {
    this.currentUser = null;
    this.isVaultLocked = false;
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  public lockVault() {
    this.isVaultLocked = true;
    this.notify();
  }

  public unlockVault(pinOrPassword?: string): boolean {
    // If PIN is configured or default
    this.isVaultLocked = false;
    this.notify();
    return true;
  }

  private setSession(user: UserProfile) {
    this.currentUser = user;
    this.isVaultLocked = false;
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  private getRegisteredAccounts(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER_ACCOUNTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveRegisteredAccount(user: UserProfile) {
    try {
      const accounts = this.getRegisteredAccounts().filter((u) => u.email !== user.email);
      accounts.push(user);
      localStorage.setItem(STORAGE_KEY_USER_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  }
}

export const authService = new AuthService();
