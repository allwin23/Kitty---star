import { adminClient, fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

type NotificationInput = {
  type:
    | 'submission_received'
    | 'submission_approved'
    | 'submission_rejected'
    | 'achievement_unlocked'
    | 'partner_connected';
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { user } = await requireUser(request);
    const body = await readJson<NotificationInput>(request);
    if (!body.type || !body.title?.trim() || !body.body?.trim())
      throw new Error('type, title, and body are required.');
    const { data, error } = await adminClient()
      .from('notifications')
      .insert({
        user_id: user.id,
        type: body.type,
        title: body.title.trim(),
        body: body.body.trim(),
        data: body.data ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return json({ notification: data });
  } catch (error) {
    return fail(error);
  }
});
