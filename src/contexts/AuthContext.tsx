import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types';
import type { User, Session } from '@supabase/supabase-js';

const DEMO_PROFILE: Profile = {
  id: 'demo-profile-001',
  auth_user_id: 'demo-auth-001',
  name: 'Gabriel',
  email: 'gabriel@conectafinancas.app',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const DEMO_COUPLE_ID = 'demo-couple-001';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  coupleId: string | null;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
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
    profile: DEMO_PROFILE,
    loading: false,
    coupleId: DEMO_COUPLE_ID,
  });

  async function fetchProfile(userId: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();
    return data as Profile | null;
  }

  async function fetchCoupleId(profileId: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('profile_id', profileId)
      .limit(1)
      .single();
    return data?.couple_id ?? null;
  }

  async function loadUser(session: Session | null) {
    if (!session?.user) {
      setState({
        user: null,
        session: null,
        profile: DEMO_PROFILE,
        loading: false,
        coupleId: DEMO_COUPLE_ID,
      });
      return;
    }
    const profile = await fetchProfile(session.user.id);
    const coupleId = profile ? await fetchCoupleId(profile.id) : DEMO_COUPLE_ID;
    setState({
      user: session.user,
      session,
      profile: profile || DEMO_PROFILE,
      loading: false,
      coupleId: coupleId || DEMO_COUPLE_ID,
    });
  }

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      setState(s => ({ ...s, loading: false, profile: DEMO_PROFILE, coupleId: DEMO_COUPLE_ID }));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, name: string) {
    if (!supabase) return { error: 'Supabase não configurado' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: 'Supabase não configurado' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: DEMO_PROFILE,
      loading: false,
      coupleId: DEMO_COUPLE_ID,
    });
  }

  async function resetPassword(email: string) {
    if (!supabase) return { error: 'Supabase não configurado' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }

  async function updateProfile(data: Partial<Pick<Profile, 'name' | 'avatar_url'>>) {
    if (supabase && state.profile && state.user) {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', state.profile.id);
      if (error) return { error: error.message };
    }
    setState(s => ({
      ...s,
      profile: s.profile ? { ...s.profile, ...data } : null,
    }));
    return { error: null };
  }

  async function refreshProfile() {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    const coupleId = profile ? await fetchCoupleId(profile.id) : DEMO_COUPLE_ID;
    setState(s => ({ ...s, profile: profile || DEMO_PROFILE, coupleId: coupleId || DEMO_COUPLE_ID }));
  }

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, resetPassword, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
