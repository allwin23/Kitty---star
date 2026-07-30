import { fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { client } = await requireUser(request);
    const body = await readJson<{ planId: string; remark?: string }>(request);
    if (!body.planId) throw new Error('planId is required.');
    const { data, error } = await client.rpc('submit_day', {
      p_plan_id: body.planId,
      p_remark: body.remark ?? null,
    });
    if (error) throw error;
    return json({ submission: data });
  } catch (error) {
    return fail(error);
  }
});
