import { adminClient, fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const { user } = await requireUser(request);
    const { paths } = await readJson<{ paths: string[] }>(request);
    if (!Array.isArray(paths) || paths.length === 0)
      throw new Error('At least one proof-image path is required.');
    if (
      paths.some(
        (path) =>
          typeof path !== 'string' || !path.startsWith(`${user.id}/`) || path.includes('..'),
      )
    )
      throw new Error('Only your own proof-image paths may be deleted.');
    const { error } = await adminClient().storage.from('proof-images').remove(paths);
    if (error) throw error;
    return json({ deleted: paths.length });
  } catch (error) {
    return fail(error);
  }
});
