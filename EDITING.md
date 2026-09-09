# How to update the website

There are two ways. **Use the first one.**

---

## 1. The dashboard (what you'll actually use)

Go to **vanderbiltccg.com/dashboard**, sign in, and click **Edit site**.

No password — you sign in as yourself through Cloudflare. If you can't get in,
ask whoever runs the Cloudflare account to add your email (see `DEPLOY.md`,
"Handing it to next year's board").

Four tabs cover almost everything the club changes year to year:

### Apply link
The single most important one. Change the Google Form URL here when you make a
new form — **every Apply button on the site updates at once**, and click
tracking keeps working with no extra steps.

You can also flip applications **Open / Closed**. When closed, every Apply
button is replaced by your "closed" message automatically.

### Exec team
Edit names, roles, emails, LinkedIn URLs and bios for the executive board and
the managing directors. **Change** on a headshot uploads a new photo. Arrows
reorder people, ✕ removes them, **+ Add person** adds one.

Portrait photos look best. Max 2 MB — if a photo is rejected, open it in
Preview, *Tools → Adjust Size*, set the width to about 800 pixels, and save.

### Analyst classes
One class per block, **one name per line**. Use **+ Add a class** for a new
semester; the top block shows first on the Our Team page. The count updates as
you type.

### Logo slider
The scrolling row of firm logos on the homepage. **+ Add a logo** uploads an
image and adds it. PNG with a transparent background works best — the homepage
renders these in white, so a dark logo on transparency is ideal.

### Saving
A bar appears at the bottom as soon as you change anything. Press **Save
changes**; the live site updates within about 30 seconds. **Undo last save**
rolls back to the previous version if you make a mess.

If you close the tab with unsaved changes, the browser will warn you.

---

## 2. Editing the file directly (rare)

Everything the dashboard doesn't cover — the mission text, the FAQs, the
homepage statistics, deal reports — lives in **`data/site.json`** in the GitHub
repo.

1. Open `data/site.json` on GitHub → click the **pencil** icon.
2. Make your change → **Commit changes**. The site rebuilds in about a minute.

> **The one rule:** JSON is fussy about commas and quotes. Every entry needs a
> comma after it *except the last one in a list*. If something breaks, paste the
> file into <https://jsonlint.com> — it points at the exact typo. Or undo your
> commit on GitHub.

### Adding a deal report
1. Upload the PDF into the `reports/` folder on GitHub (**Add file → Upload files**).
2. Add an entry at the **top** of `"dealReports"`:

```json
{ "title": "Company X Acquires Y", "date": "March 2026", "sortDate": "2026-03-01",
  "type": "M&A", "file": "company-x-y.pdf" },
```

`sortDate` controls the order (newest first). `type` fills the filter buttons —
reuse one (`M&A`, `Take-Private`, `Venture`, `Real Estate`) or invent a new one
and a filter button appears by itself.

### How the two methods fit together

`data/site.json` is the **starting point**. The moment you press Save in the
dashboard, the dashboard's version takes over and is what visitors see.

That means: **after you've used the dashboard, editing `data/site.json` will no
longer change those parts of the site.** Use the dashboard for anything it
covers, and the file only for the things it doesn't (FAQs, mission, stats, deal
reports) — those pass straight through either way.

---

## Where everything lives

| Path | What it is |
|---|---|
| `data/site.json` | Starting content: text, people, reports, FAQs |
| `index.html` `team.html` `deal-reports.html` `apply.html` | The four public pages |
| `dashboard.html` | Analytics + the site editor (staff only) |
| `assets/js/site.js` | Fills the public pages with content |
| `assets/js/admin.js` | The editor in the dashboard |
| `assets/js/track.js` | The only file that talks to analytics |
| `functions/api/` | Server endpoints. Anything under `admin/` requires sign-in. |
| `reports/` | Deal report PDFs |

## Previewing on your own laptop

```bash
cd ~/vanderbilt-ccg-site && python3 -m http.server 8788
```

Then open <http://127.0.0.1:8788>. The `/api/*` routes only exist on Cloudflare,
so locally the site falls back to `data/site.json` and the dashboard won't load
data. That's expected.
