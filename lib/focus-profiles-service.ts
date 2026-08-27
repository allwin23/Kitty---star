import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export interface FocusProfile {
  id: string;
  user_id: string;
  name: string;
  duration_minutes: number;
  strict_mode: boolean;
  blocked_categories: string[];
  custom_domains: string[];
}

const db = supabase as any;

export const focusProfilesService = {
  async fetchProfiles(): Promise<FocusProfile[]> {
    const user = useAuthStore.getState().user;
    if (!user) return [];

    const { data: profiles, error } = await db
      .from('focus_profiles')
      .select(`
        id,
        user_id,
        name,
        duration_minutes,
        strict_mode,
        focus_profile_categories (category_id),
        focus_profile_custom_sites (domain)
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('[FocusProfilesService] Failed to fetch profiles:', error);
      throw error;
    }

    return (profiles || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      duration_minutes: p.duration_minutes,
      strict_mode: p.strict_mode,
      blocked_categories: p.focus_profile_categories?.map((c: any) => c.category_id) || [],
      custom_domains: p.focus_profile_custom_sites?.map((s: any) => s.domain) || [],
    }));
  },

  async createProfile(
    name: string,
    durationMinutes: number,
    blockedCategories: string[],
    strictMode: boolean,
    customDomains: string[]
  ): Promise<string> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');

    // Validation
    if (!name.trim()) throw new Error('Profile name is required');
    if (durationMinutes < 1) throw new Error('Duration must be at least 1 minute');
    
    // Domain validation
    const cleanDomains = customDomains
      .map(d => d.trim().toLowerCase())
      .filter(d => {
        if (!d) return false;
        const regex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(d)) throw new Error(`Invalid domain name: ${d}`);
        return true;
      });

    // 1. Insert profile
    const { data: profile, error: profileError } = await db
      .from('focus_profiles')
      .insert({
        user_id: user.id,
        name: name.trim(),
        duration_minutes: durationMinutes,
        strict_mode: strictMode,
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('[FocusProfilesService] Failed to create profile:', profileError);
      throw profileError;
    }

    const profileId = profile.id;

    // 2. Insert categories
    if (blockedCategories.length > 0) {
      const rows = blockedCategories.map(cat => ({
        profile_id: profileId,
        category_id: cat,
      }));
      const { error: catError } = await db.from('focus_profile_categories').insert(rows);
      if (catError) {
        await db.from('focus_profiles').delete().eq('id', profileId);
        throw catError;
      }
    }

    // 3. Insert custom sites
    if (cleanDomains.length > 0) {
      const rows = cleanDomains.map(dom => ({
        profile_id: profileId,
        domain: dom,
      }));
      const { error: domError } = await db.from('focus_profile_custom_sites').insert(rows);
      if (domError) {
        await db.from('focus_profiles').delete().eq('id', profileId);
        throw domError;
      }
    }

    return profileId;
  },

  async updateProfile(
    profileId: string,
    name: string,
    durationMinutes: number,
    blockedCategories: string[],
    strictMode: boolean,
    customDomains: string[]
  ): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');

    // Validation
    if (!name.trim()) throw new Error('Profile name is required');
    if (durationMinutes < 1) throw new Error('Duration must be at least 1 minute');

    const cleanDomains = customDomains
      .map(d => d.trim().toLowerCase())
      .filter(d => {
        if (!d) return false;
        const regex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(d)) throw new Error(`Invalid domain name: ${d}`);
        return true;
      });

    // 1. Update basic profile info
    const { error: profileError } = await db
      .from('focus_profiles')
      .update({
        name: name.trim(),
        duration_minutes: durationMinutes,
        strict_mode: strictMode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .eq('user_id', user.id);

    if (profileError) throw profileError;

    // 2. Refresh categories
    await db.from('focus_profile_categories').delete().eq('profile_id', profileId);
    if (blockedCategories.length > 0) {
      const rows = blockedCategories.map(cat => ({
        profile_id: profileId,
        category_id: cat,
      }));
      const { error: catError } = await db.from('focus_profile_categories').insert(rows);
      if (catError) throw catError;
    }

    // 3. Refresh custom sites
    await db.from('focus_profile_custom_sites').delete().eq('profile_id', profileId);
    if (cleanDomains.length > 0) {
      const rows = cleanDomains.map(dom => ({
        profile_id: profileId,
        domain: dom,
      }));
      const { error: domError } = await db.from('focus_profile_custom_sites').insert(rows);
      if (domError) throw domError;
    }
  },

  async deleteProfile(profileId: string): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');

    const { error } = await db
      .from('focus_profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[FocusProfilesService] Failed to delete profile:', error);
      throw error;
    }
  },
};
