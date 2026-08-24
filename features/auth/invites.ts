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
  try {
    // 1. Return any existing active code if valid and not expired
    const { data: existingInvite } = await supabase
      .from('partner_invites')
      .select('code')
      .eq('created_by', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (existingInvite?.code) {
      return { code: existingInvite.code };
    }

    
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('generate_invite');
    if (!rpcError && rpcData?.code) {
      return { code: rpcData.code };
    }

    // 3. Fallback direct table insertion
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = generateInviteCode();
      const { data, error } = await supabase
        .from('partner_invites')
        .insert({
          code,
          created_by: userId,
          expires_at: addHours(new Date(), 24).toISOString(),
          status: 'active',
        })
        .select('code')
        .single();

      if (!error && data?.code) return { code: data.code };
      if (error && error.code !== '23505') return { error: toReadableError(error) };
    }

    return { error: 'Could not generate a unique invite code. Please try again.' };
  } catch (err) {
    return { error: toReadableError(err as any) };
  }
}

export async function connectWithInvite(code: string): Promise<{ error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  const { error } = await supabase.rpc('connect_partner_with_code', { invite_code: cleanCode });
  if (!error) return {};

  // Fallback to redeem_invite RPC parameter style
  const { error: redeemErr } = await (supabase as any).rpc('redeem_invite', { p_invite_code: cleanCode });
  if (!redeemErr) return {};

  return { error: toReadableError(error) };
}
