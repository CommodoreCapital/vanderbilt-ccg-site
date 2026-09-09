/* POST /api/admin/revert — restore the previous saved version. */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ env }) {
  if (!env.CONTENT) return json({ error: 'setup' }, 503);
  const prev = await env.CONTENT.get('site:previous');
  if (!prev) return json({ error: 'none', message: 'There is no previous version to go back to.' }, 404);
  const current = await env.CONTENT.get('site');
  await env.CONTENT.put('site', prev);
  if (current) await env.CONTENT.put('site:previous', current);   // lets you undo the undo
  return json({ ok: true });
}
