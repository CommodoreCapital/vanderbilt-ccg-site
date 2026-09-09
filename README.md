# vanderbiltccg.com

The public website for Vanderbilt's Commodore Capital Group, plus a private
dashboard that tracks Apply-link clicks and lets the exec board edit the site
without touching code.

- **Updating content:** `EDITING.md`
- **Deploying it:** `DEPLOY.md` — free, browser-only, no Node.js required

## What it is

Plain HTML, CSS and JavaScript. **No build step and no framework**, so it can be
handed to a non-technical exec board every year and still work in five years.

| Page | Path |
|---|---|
| Home | `/` |
| Our Team | `/team.html` |
| Deal Reports | `/deal-reports.html` |
| Apply | `/apply.html` |
| Dashboard (private) | `/dashboard` |

Old Squarespace URLs (`/our-team`, `/ccg-dealreports`, `/apply-now`) 301-redirect
to their new homes.

## How content works

Two layers, checked in this order:

1. **Saved content** in a Cloudflare KV namespace — whatever was last saved from
   the dashboard. Served by `GET /api/content`.
2. **`data/site.json`** in this repo — the starting point, and the fallback when
   nothing has been saved yet or the backend is unreachable.

Pictures are either files in `assets/img/`, or `"asset:<id>"` for something
uploaded through the dashboard, which is served from `GET /api/asset/<id>`.

## Security model

**There are no passwords.** `/dashboard` and every `/api/admin/*` endpoint sit
behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/),
which authenticates the person at Cloudflare's edge before the request reaches
the site. Access is managed as a list of allowed emails in the Cloudflare
dashboard, so revoking someone is immediate and there is no shared secret.

`functions/api/admin/_middleware.js` then independently verifies the signed
token Access attaches (RS256 against the team's public keys, checking issuer,
audience and expiry) before any admin endpoint runs. If the `ACCESS_AUD` /
`ACCESS_TEAM_DOMAIN` variables are missing, admin endpoints **fail closed**.

Public endpoints — `POST /api/track`, `GET /api/content`, `GET /api/asset/<id>` —
are intentionally open, because the website itself calls them.

## Analytics

`assets/js/track.js` posts three anonymous event types to `/api/track`: a
pageview, an **apply** click (tagged with which of the five Apply buttons was
used), and a deal-report open. A Pages Function writes them to D1 (SQLite).

No cookies, no IP addresses, no personal data. Visitors are counted with a
random id in `sessionStorage` that disappears when the tab closes, so "visitors"
means browser sessions rather than people or devices.

If D1, KV or Access is not configured, the public site still works normally —
tracking no-ops and the dashboard explains exactly what is missing.

## Bindings and variables

| Name | Type | Used for |
|---|---|---|
| `DB` | D1 database | Analytics events |
| `CONTENT` | KV namespace | Saved site content + uploaded images |
| `ACCESS_AUD` | Plaintext variable | Verifying the Access token |
| `ACCESS_TEAM_DOMAIN` | Plaintext variable | Verifying the Access token |

## Local preview

```bash
python3 -m http.server 8788
```

`/api/*` only exists on Cloudflare, so the site falls back to `data/site.json`
and the dashboard won't load data locally. That is expected.
