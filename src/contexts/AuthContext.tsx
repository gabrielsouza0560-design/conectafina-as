import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { migrateDemo } from '../services/api';
import type { Profile } from '../types';
import type { User, Session } from '@supabase/supabase-js';

const LOCAL_AUTH_KEY = 'conecta_auth';
const LOCAL_USERS_KEY = 'conecta_users';

interface LocalUser {
  email: string;
  password: string;
  name: string;
  partnerName?: string;
  profileId: string;
  coupleId: string;
  createdAt: string;
}

function getLocalUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch { return []; }
}

function saveLocalUsers(users: LocalUser[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalAuth(): string | null {
  return localStorage.getItem(LOCAL_AUTH_KEY);
}

function setLocalAuth(email: string | null) {
  if (email) localStorage.setItem(LOCAL_AUTH_KEY, email);
  else localStorage.removeItem(LOCAL_AUTH_KEY);
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const VISIBILITY_OPTIONS = [
  { value: 'shared', label: 'Casa (todos)' },
  { value: 'individual', label: 'Gabriel' },
  { value: 'household', label: 'Rayane' },
  { value: 'children', label: 'Filhos' },
];

export const VISIBILITY_LABELS: Record<string, string> = {
  shared: 'Casa',
  individual: 'Gabriel',
  household: 'Rayane',
  children: 'Filhos',
};

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  coupleId: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string, partnerName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Pick<Profile, 'name' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    coupleId: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (supabase && supabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        loadSupabaseUser(session);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        loadSupabaseUser(session);
      });
      return () => subscription.unsubscribe();
    }

    const savedEmail = getLocalAuth();
    if (savedEmail) {
      const users = getLocalUsers();
      const user = users.find(u => u.email === savedEmail);
      if (user) {
        setState({
          user: null,
          session: null,
          profile: {
            id: user.profileId,
            auth_user_id: user.profileId,
            name: user.name,
            email: user.email,
            avatar_url: null,
            created_at: user.createdAt,
          },
          loading: false,
          coupleId: user.coupleId,
          isAuthenticated: true,
        });

        if (user.name) {
          VISIBILITY_OPTIONS[1] = { value: 'individual', label: user.name };
          VISIBILITY_LABELS.individual = user.name;
        }
        if (user.partnerName) {
          VISIBILITY_OPTIONS[2] = { value: 'household', label: user.partnerName };
          VISIBILITY_LABELS.household = user.partnerName;
        }
        migrateDemo(user.coupleId, user.profileId);
        return;
      }
    }
    setState(s => ({ ...s, loading: false }));
  }, []);

  async function loadSupabaseUser(session: Session | null) {
    if (!session?.user || !supabase) {
      setState({
        user: null, session: null, profile: null,
        loading: false, coupleId: null, isAuthenticated: false,
      });
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', session.user.id).single();
    let coupleId: string | null = null;
    if (profile) {
      const { data: cm } = await supabase.from('couple_members').select('couple_id').eq('profile_id', profile.id).limit(1).single();
      coupleId = cm?.couple_id ?? null;
    }
    setState({
      user: session.user,
      session,
      profile: profile as Profile | null,
      loading: false,
      coupleId,
      isAuthenticated: true,
    });
  }

  async function signUp(email: string, password: string, name: string, partnerName?: string) {
    if (supabase && supabaseConfigured) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      return { error: error?.message ?? null };
    }

    const users = getLocalUsers();
    if (users.find(u => u.email === email)) {
      return { error: 'Este email já está cadastrado. Faça login.' };
    }

    const profileId = generateId();
    const coupleId = generateId();
    const newUser: LocalUser = {
      email, password, name, partnerName,
      profileId, coupleId,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveLocalUsers(users);
    setLocalAuth(email);

    if (name) {
      VISIBILITY_OPTIONS[1] = { value: 'individual', label: name };
      VISIBILITY_LABELS.individual = name;
    }
    if (partnerName) {
      VISIBILITY_OPTIONS[2] = { value: 'household', label: partnerName };
      VISIBILITY_LABELS.household = partnerName;
    }

    migrateDemo(coupleId, profileId);
    setState({
      user: null, session: null,
      profile: { id: profileId, auth_user_id: profileId, name, email, avatar_url: null, created_at: newUser.createdAt },
      loading: false, coupleId, isAuthenticated: true,
    });
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    if (supabase && supabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    }

    const users = getLocalUsers();
    const user = users.find(u => u.email === email);
    if (!user) return { error: 'Email não encontrado. Cadastre-se primeiro.' };
    if (user.password !== password) return { error: 'Senha incorreta.' };

    setLocalAuth(email);

    if (user.name) {
      VISIBILITY_OPTIONS[1] = { value: 'individual', label: user.name };
      VISIBILITY_LABELS.individual = user.name;
    }
    if (user.partnerName) {
      VISIBILITY_OPTIONS[2] = { value: 'household', label: user.partnerName };
      VISIBILITY_LABELS.household = user.partnerName;
    }

    migrateDemo(user.coupleId, user.profileId);
    setState({
      user: null, session: null,
      profile: { id: user.profileId, auth_user_id: user.profileId, name: user.name, email: user.email, avatar_url: null, created_at: user.createdAt },
      loading: false, coupleId: user.coupleId, isAuthenticated: true,
    });
    return { error: null };
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setLocalAuth(null);
    setState({
      user: null, session: null, profile: null,
      loading: false, coupleId: null, isAuthenticated: false,
    });
  }

  async function resetPassword(email: string) {
    if (supabase && supabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    }
    return { error: 'Recuperação de senha não disponível no modo local.' };
  }

  async function updateProfile(data: Partial<Pick<Profile, 'name' | 'avatar_url'>>) {
    if (supabase && state.profile && state.user) {
      const { error } = await supabase.from('profiles').update(data).eq('id', state.profile.id);
      if (error) return { error: error.message };
    }

    if (!supabaseConfigured && state.profile && data.name) {
      const users = getLocalUsers();
      const idx = users.findIndex(u => u.profileId === state.profile!.id);
      if (idx >= 0) {
        users[idx].name = data.name;
        saveLocalUsers(users);
        VISIBILITY_OPTIONS[1] = { value: 'individual', label: data.name };
        VISIBILITY_LABELS.individual = data.name;
      }
    }

    setState(s => ({ ...s, profile: s.profile ? { ...s.profile, ...data } : null }));
    return { error: null };
  }

  async function refreshProfile() {
    if (!supabase || !state.user) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', state.user.id).single();
    let coupleId: string | null = null;
    if (profile) {
      const { data: cm } = await supabase.from('couple_members').select('couple_id').eq('profile_id', profile.id).limit(1).single();
      coupleId = cm?.couple_id ?? null;
    }
    setState(s => ({ ...s, profile: profile as Profile | null, coupleId }));
  }

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, resetPassword, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
