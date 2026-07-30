import { adminClient, fail, handleOptions, json, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { user } = await requireUser(request);
    const { error } = await adminClient().rpc('unlock_user_achievements', { p_user_id: user.id });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return fail(error);
  }
});
