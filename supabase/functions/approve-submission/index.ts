import { fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { client } = await requireUser(request);
    const body = await readJson<{ submissionId: string; comment?: string }>(request);
    if (!body.submissionId) throw new Error('submissionId is required.');
    const { data, error } = await client.rpc('approve_day', {
      p_submission_id: body.submissionId,
      p_comment: body.comment ?? null,
    });
    if (error) throw error;
    return json({ report: data });
  } catch (error) {
    return fail(error);
  }
});
