import { adminClient, fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    await requireUser(request);
    const body = await readJson<{
      status: 'approved' | 'rejected';
      focusPomodoros: number;
      streak: number;
    }>(request);
    if (
      !['approved', 'rejected'].includes(body.status) ||
      !Number.isInteger(body.focusPomodoros) ||
      !Number.isInteger(body.streak)
    )
      throw new Error('Invalid XP calculation input.');
    const { data, error } = await adminClient().rpc('calculate_day_xp', {
      p_status: body.status,
      p_focus_pomodoros: body.focusPomodoros,
      p_streak: body.streak,
    });
    if (error) throw error;
    return json({ xp: data });
  } catch (error) {
    return fail(error);
  }
});
