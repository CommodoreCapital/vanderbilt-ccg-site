/* GET /api/admin/stats?days=30 — analytics summary for the dashboard.
   Identity is proven by _middleware.js; there is no password.
   Bindings: DB (D1 database) */

const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'setup', message: 'No D1 database bound. Create one and bind it as DB under Settings → Bindings.' }, 503);

  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days'), 10) || 30, 1), 365);
  const since = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(Date.now() - (days - 1) * 86400000));

  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all();

  try {
    const [totals, daily, byLabel, byRef, byReport, byDevice, byCountry, allTime] = await Promise.all([
      q(`SELECT
           SUM(CASE WHEN type='apply'  THEN 1 ELSE 0 END) AS applyClicks,
           SUM(CASE WHEN type='view'   THEN 1 ELSE 0 END) AS pageViews,
           SUM(CASE WHEN type='report' THEN 1 ELSE 0 END) AS reportOpens,
           COUNT(DISTINCT session)                        AS visitors,
           COUNT(DISTINCT CASE WHEN type='apply' THEN session END) AS applicantSessions
         FROM events WHERE day >= ?`, since),
      q(`SELECT day,
           SUM(CASE WHEN type='apply' THEN 1 ELSE 0 END) AS applyClicks,
           SUM(CASE WHEN type='view'  THEN 1 ELSE 0 END) AS pageViews,
           COUNT(DISTINCT session)                       AS visitors
         FROM events WHERE day >= ? GROUP BY day ORDER BY day ASC`, since),
      q(`SELECT COALESCE(label,'unknown') AS label, COUNT(*) AS n
         FROM events WHERE type='apply' AND day >= ? GROUP BY label ORDER BY n DESC`, since),
      q(`SELECT COALESCE(ref,'direct') AS ref, COUNT(DISTINCT session) AS n
         FROM events WHERE day >= ? AND ref <> 'internal' GROUP BY ref ORDER BY n DESC LIMIT 12`, since),
      q(`SELECT COALESCE(label,'unknown') AS label, COUNT(*) AS n
         FROM events WHERE type='report' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 15`, since),
      q(`SELECT COALESCE(device,'unknown') AS device, COUNT(DISTINCT session) AS n
         FROM events WHERE day >= ? GROUP BY device`, since),
      q(`SELECT COALESCE(country,'??') AS country, COUNT(DISTINCT session) AS n
         FROM events WHERE day >= ? GROUP BY country ORDER BY n DESC LIMIT 10`, since),
      q(`SELECT SUM(CASE WHEN type='apply' THEN 1 ELSE 0 END) AS applyClicks,
                COUNT(DISTINCT session) AS visitors, MIN(day) AS firstDay FROM events`)
    ]);

    const t = totals.results[0] || {}, a = allTime.results[0] || {};
    return json({
      rangeDays: days, since,
      totals: {
        applyClicks: t.applyClicks || 0, pageViews: t.pageViews || 0,
        reportOpens: t.reportOpens || 0, visitors: t.visitors || 0,
        applicantSessions: t.applicantSessions || 0,
        conversionRate: t.visitors ? (t.applicantSessions / t.visitors) : 0
      },
      allTime: { applyClicks: a.applyClicks || 0, visitors: a.visitors || 0, firstDay: a.firstDay || null },
      daily: daily.results, byLabel: byLabel.results, byRef: byRef.results,
      byReport: byReport.results, byDevice: byDevice.results, byCountry: byCountry.results
    });
  } catch (err) {
    return json({ error: 'query', message: String(err) }, 500);
  }
}
