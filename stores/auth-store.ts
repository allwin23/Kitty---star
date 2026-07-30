import { create } from 'zustand';

import { toReadableError } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase';
import type { AuthResult, AuthState, Profile } from '@/types';

type AuthStore = AuthState & {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  refreshProfile: () => Promise<AuthResult>;
  updateProfile: (values: Pick<Profile, 'full_name' | 'avatar_url'>) => Promise<AuthResult>;
};

let hasSubscribedToAuthChanges = false;

async function getProfile(user: {
  email?: string;
  id: string;
}): Promise<{ profile: Profile | null; error?: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return { profile: null, error: toReadableError(error) };
  if (data) return { profile: data };
  if (!user.email) return { profile: null, error: 'Your account does not have an email address.' };

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, email: user.email });

  if (insertError && insertError.code !== '23505') {
    return { profile: null, error: toReadableError(insertError) };
  }

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return createdProfileError
    ? { profile: null, error: toReadableError(createdProfileError) }
    : { profile: createdProfile };
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,

  initialize: async () => {
    if (!hasSubscribedToAuthChanges) {
      hasSubscribedToAuthChanges = true;
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
          set({ session: null, user: null, profile: null, loading: false, error: null });
          return;
        }

        set({ session, user: session.user, loading: true, error: null });
        const result = await getProfile(session.user);
        set({ profile: result.profile, loading: false, error: result.error ?? null });
      });
    }

    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      set({
        session: null,
        user: null,
        profile: null,
        loading: false,
        error: toReadableError(error),
      });
      return;
    }

    if (!data.session) {
      set({ session: null, user: null, profile: null, loading: false });
      return;
    }

    set({ session: data.session, user: data.session.user });
    const result = await getProfile(data.session.user);
    set({ profile: result.profile, loading: false, error: result.error ?? null });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const message = toReadableError(error);
      set({ loading: false, error: message });
      return { error: message };
    }

    set({ session: data.session, user: data.user });
    const result = await getProfile(data.user);
    set({ profile: result.profile, loading: false, error: result.error ?? null });
    return result.error ? { error: result.error } : {};
  },

  signup: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const message = toReadableError(error);
      set({ loading: false, error: message });
      return { error: message };
    }

    if (!data.session || !data.user) {
      const message = 'Account created. Confirm your email, then sign in to continue.';
      set({ loading: false, error: null });
      return { error: message };
    }

    set({ session: data.session, user: data.user });
    const result = await getProfile(data.user);
    set({ profile: result.profile, loading: false, error: result.error ?? null });
    return result.error ? { error: result.error } : {};
  },

  logout: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();

    if (error) {
      const message = toReadableError(error);
      set({ loading: false, error: message });
      return { error: message };
    }

    set({ session: null, user: null, profile: null, loading: false, error: null });
    return {};
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return { error: 'You are not signed in.' };

    const result = await getProfile(user);
    set({ profile: result.profile, error: result.error ?? null });
    return result.error ? { error: result.error } : {};
  },

  updateProfile: async (values) => {
    const user = get().user;
    if (!user) return { error: 'You are not signed in.' };

    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: values.full_name, avatar_url: values.avatar_url })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      const message = toReadableError(error);
      set({ loading: false, error: message });
      return { error: message };
    }

    set({ profile: data, loading: false });
    return {};
  },
}));
