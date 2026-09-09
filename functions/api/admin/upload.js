/* POST /api/admin/upload — stores one image, returns a reference "asset:<id>".
   Sent as multipart/form-data with a single "file" field.  Bindings: CONTENT (KV) */

const MAX_BYTES = 8 * 1024 * 1024;   // deal-report PDFs run 200-500KB; headroom for scans
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
                 'application/pdf'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  if (!env.CONTENT) return json({ error: 'setup', message: 'No KV namespace bound (CONTENT).' }, 503);

  let form;
  try { form = await request.formData(); } catch { return json({ error: 'bad form' }, 400); }

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'no file' }, 400);

  if (!ALLOWED.includes(file.type))
    return json({ error: 'type', message: `${file.type || 'That file type'} is not supported. Use a PDF, or PNG/JPG/WEBP/GIF/SVG for images.` }, 415);

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES)
    return json({ error: 'too big', message: `That file is ${(bytes.byteLength / 1048576).toFixed(1)}MB. The limit is 8MB — please compress it first.` }, 413);

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await env.CONTENT.put(`asset:${id}`, bytes, {
    metadata: { type: file.type, name: file.name || '', size: bytes.byteLength }
  });

  return json({ ok: true, ref: `asset:${id}`, id, bytes: bytes.byteLength });
}
