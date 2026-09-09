/* POST /api/admin/content — saves site content edited in the dashboard.
   Identity is already proven by _middleware.js.  Bindings: CONTENT (KV) */

const MAX_BYTES = 512 * 1024;
const REQUIRED = ['org', 'apply', 'pillars', 'placements', 'executiveBoard', 'dealReports', 'faqs'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env, data: ctx }) {
  if (!env.CONTENT) return json({ error: 'setup', message: 'No KV namespace bound. Bind one named CONTENT under Settings → Bindings.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const content = body.data;
  if (!content || typeof content !== 'object' || Array.isArray(content))
    return json({ error: 'invalid', message: 'Content must be an object.' }, 400);

  for (const k of REQUIRED)
    if (!(k in content)) return json({ error: 'invalid', message: `Missing "${k}" — refusing to save.` }, 400);

  const text = JSON.stringify(content);
  if (text.length > MAX_BYTES)
    return json({ error: 'too big', message: `Content is ${Math.round(text.length / 1024)}KB; limit is ${MAX_BYTES / 1024}KB.` }, 413);

  const prev = await env.CONTENT.get('site');
  if (prev) await env.CONTENT.put('site:previous', prev);
  await env.CONTENT.put('site', text);
  await env.CONTENT.put('site:meta', JSON.stringify({
    savedAt: new Date().toISOString(), savedBy: ctx.user.email
  }));

  return json({ ok: true, bytes: text.length, savedBy: ctx.user.email });
}
