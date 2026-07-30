import type { AuthError } from '@supabase/supabase-js';

export function toReadableError(error: AuthError | Error | null | undefined): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (message.includes('already registered')) return 'An account already exists for this email.';
  if (message.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (message.includes('network')) return 'Check your internet connection and try again.';

  return error.message;
}
