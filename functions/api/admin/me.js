/* GET /api/admin/me — returns the signed-in person, for the dashboard header. */
export async function onRequestGet({ data }) {
  return new Response(JSON.stringify({ email: data.user.email }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
