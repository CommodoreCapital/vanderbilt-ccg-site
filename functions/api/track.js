/* POST /api/track — records one anonymous event.
   Bindings required: DB (D1 database)
   Never stores IP addresses, cookies, or any personal information. */

const TYPES  = ['view', 'apply', 'report'];
const MAXLEN = 120;

const clip = (v) =>
  (typeof v === 'string' && v.length) ? v.slice(0, MAXLEN) : null;

// Nashville-local calendar day, so the dashboard matches what Tyler sees on a clock.
function localDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // No database bound yet? Accept and drop, so the site never breaks.
  if (!env.DB) return new Response(null, { status: 204 });

  let body;
  try { body = await request.json(); }
  catch { return new Response('bad json', { status: 400 }); }

  const type = TYPES.includes(body.type) ? body.type : null;
  if (!type) return new Response('bad type', { status: 400 });

  const ua      = request.headers.get('user-agent') || '';
  const device  = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
  const country = (request.cf && request.cf.country) || null;
  const now     = new Date();

  try {
    await env.DB.prepare(
      `INSERT INTO events (ts, day, type, page, label, ref, device, country, session)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      now.toISOString(),
      localDay(now),
      type,
      clip(body.page),
      clip(body.label),
      clip(body.ref),
      device,
      country,
      clip(body.session)
    ).run();
  } catch (err) {
    // Analytics must never surface an error to a visitor.
    console.error('track insert failed', err);
  }

  return new Response(null, { status: 204 });
}

// Beacons are same-origin; nothing else needs this endpoint.
export const onRequestGet = () => new Response('method not allowed', { status: 405 });
