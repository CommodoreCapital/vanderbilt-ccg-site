/* GET /api/asset/<id> — serves an image uploaded through the dashboard.
   Public (these are logos and headshots that appear on the site anyway).
   Bindings: CONTENT (KV) */

export async function onRequestGet({ params, env }) {
  if (!env.CONTENT) return new Response('not configured', { status: 503 });

  const id = String(params.id || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!id) return new Response('bad id', { status: 400 });

  const { value, metadata } = await env.CONTENT.getWithMetadata(`asset:${id}`, { type: 'arrayBuffer' });
  if (!value) return new Response('not found', { status: 404 });

  return new Response(value, {
    headers: {
      'Content-Type': (metadata && metadata.type) || 'application/octet-stream',
      // Content is immutable: a new upload always gets a new id.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
