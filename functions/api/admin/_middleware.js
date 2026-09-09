/* ==========================================================================
   Gate for every /api/admin/* endpoint.

   Cloudflare Access authenticates the person at the edge before the request
   ever reaches us, then forwards a signed token. We verify that signature
   ourselves so these endpoints are safe even if an Access policy is later
   misconfigured or removed.

   There is no password anywhere in this system. Access decides who gets in,
   using the identity provider you configured (email one-time codes, Google,
   etc.), and you manage the list of allowed people in the Cloudflare
   dashboard.

   Required environment variables (plain variables, not secrets):
     ACCESS_TEAM_DOMAIN   e.g. vanderbilt-ccg.cloudflareaccess.com
     ACCESS_AUD           the Application Audience tag from the Access app
   ========================================================================== */

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

// --- tiny JWT helpers -------------------------------------------------------
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlToJSON = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let cachedKeys = null, cachedAt = 0;
async function getKeys(teamDomain) {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < 3600e3) return cachedKeys;   // refresh hourly
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`could not fetch Access certs (${res.status})`);
  const { keys } = await res.json();
  cachedKeys = keys || []; cachedAt = now;
  return cachedKeys;
}

async function verify(token, teamDomain, aud) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const [h64, p64, s64] = parts;

  const header  = b64urlToJSON(h64);
  const payload = b64urlToJSON(p64);

  if (header.alg !== 'RS256') throw new Error('unexpected signing algorithm');

  const jwk = (await getKeys(teamDomain)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('signing key not recognised');

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key,
    b64urlToBytes(s64),
    new TextEncoder().encode(`${h64}.${p64}`)
  );
  if (!ok) throw new Error('bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp)      throw new Error('token expired');
  if (payload.nbf && now < payload.nbf - 60)  throw new Error('token not yet valid');
  if (payload.iss !== `https://${teamDomain}`) throw new Error('wrong issuer');

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(aud)) throw new Error('wrong audience');

  return payload;
}

function readToken(request) {
  const header = request.headers.get('Cf-Access-Jwt-Assertion');
  if (header) return header;
  // Browser navigations carry it as a cookie instead.
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD;
  if (!team || !aud) {
    // Fail closed: without these we cannot prove who is calling.
    return json({
      error: 'setup',
      message: 'Admin access is not configured yet. Set ACCESS_TEAM_DOMAIN and ACCESS_AUD in the Pages project settings (see DEPLOY.md step 5).'
    }, 503);
  }

  const token = readToken(request);
  if (!token) {
    return json({
      error: 'unauthenticated',
      message: 'No Cloudflare Access session. Open this page through vanderbiltccg.com/dashboard and sign in.'
    }, 401);
  }

  let claims;
  try {
    claims = await verify(token, team, aud);
  } catch (err) {
    return json({ error: 'unauthenticated', message: `Access token rejected: ${err.message}` }, 401);
  }

  // Hand the verified identity to the endpoint.
  context.data.user = {
    email: claims.email || request.headers.get('Cf-Access-Authenticated-User-Email') || 'unknown',
    sub: claims.sub || null
  };
  return next();
}
