import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.111.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Supabase Edge Function environment is incomplete.');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const handleOptions = (request: Request) =>
  request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;

export const readJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
};

export const userClient = (request: Request): SupabaseClient => {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Missing bearer token.');
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
};

export const requireUser = async (
  request: Request,
): Promise<{ client: SupabaseClient; user: User }> => {
  const client = userClient(request);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Invalid or expired access token.');
  return { client, user: data.user };
};

export const adminClient = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export const fail = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  const status = /Missing bearer|Invalid or expired|Authentication is required/.test(message)
    ? 401
    : 400;
  return json({ error: message }, status);
};
