import { addHours } from 'date-fns';

import { toReadableError } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateInviteCode(): string {
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export async function createPartnerInvite(
  userId: string,
): Promise<{ code?: string; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateInviteCode();
    const { error } = await supabase.from('partner_invites').insert({
      code,
      created_by: userId,
      expires_at: addHours(new Date(), 24).toISOString(),
      status: 'active',
    });

    if (!error) return { code };
    if (error.code !== '23505') return { error: toReadableError(error) };
  }

  return { error: 'Could not generate a unique invite code. Please try again.' };
}

export async function connectWithInvite(code: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('connect_partner_with_code', { invite_code: code });
  return error ? { error: toReadableError(error) } : {};
}
