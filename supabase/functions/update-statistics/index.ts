import { adminClient, fail, handleOptions, json, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { user } = await requireUser(request);
    const { data, error } = await adminClient().rpc('recalculate_user_stats', {
      p_user_id: user.id,
    });
    if (error) throw error;
    return json({ stats: data });
  } catch (error) {
    return fail(error);
  }
});
