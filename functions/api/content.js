/* GET /api/content — public. Returns the content saved from the dashboard, or
   204 when nothing has been saved yet (the browser then falls back to the
   static data/site.json shipped in the repo).

   Writing is handled by /api/admin/content, which sits behind Cloudflare Access.
   Bindings: CONTENT (KV) */

export async function onRequestGet({ env }) {
  if (!env.CONTENT) return new Response(null, { status: 204 });
  const saved = await env.CONTENT.get('site');
  if (!saved) return new Response(null, { status: 204 });
  return new Response(saved, {
    headers: {
      'Content-Type': 'application/json',
      // Edge-cached briefly: keeps KV reads low, edits still appear within ~30s.
      'Cache-Control': 'public, max-age=30, s-maxage=30'
    }
  });
}

export const onRequestPost = () =>
  new Response(JSON.stringify({ error: 'moved', message: 'Saving happens at /api/admin/content.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } });
