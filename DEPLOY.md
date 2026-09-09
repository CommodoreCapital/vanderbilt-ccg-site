# Putting this site online (free)

You do **not** need Node.js, a terminal, or any build step. Everything below is
done in a web browser.

Total cost: **$0**. You keep paying Squarespace only for the *domain*
(~$20/yr), and cancel the website subscription.

---

## Step 1 — Put the code on GitHub

1. Create a free account at <https://github.com> (use the CCG email so it can be
   passed down, not a personal account).
2. Click **+ → New repository**. Name it `vanderbilt-ccg-site`. Keep it Public.
3. On the new repo page click **uploading an existing file**.
4. Drag in **everything inside the `vanderbilt-ccg-site` folder** — the `.html`
   files, and the `assets`, `data`, `reports`, `functions` folders. Click
   **Commit changes**.

## Step 2 — Connect Cloudflare Pages

1. Create a free account at <https://dash.cloudflare.com>.
2. Go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick your `vanderbilt-ccg-site` repo.
4. Build settings: leave **Framework preset = None**, leave the build command
   **empty**, and set **Build output directory** to `/`.
5. Click **Save and Deploy**. In about a minute you get a live URL like
   `vanderbilt-ccg-site.pages.dev`. The website is now working.

## Step 3 — Point vanderbiltccg.com at it

### First: the email records on your domain

`vanderbiltccg.com` has **MX records pointing at Google Workspace**, left over
from an earlier board. Nobody on the current board pays for that Workspace
account, so mail sent to `@vanderbiltccg.com` most likely bounces or lands in an
inbox no one can open. Every address CCG actually publishes is `@vanderbilt.edu`.

So this is **not a blocker** — but copy the records across anyway. It takes two
minutes, Cloudflare imports them automatically, and it means you haven't
quietly broken something if an account does still exist.

**MX records** (host `@`, the root domain):

| Priority | Server |
|---|---|
| 1  | `aspmx.l.google.com` |
| 5  | `alt1.aspmx.l.google.com` |
| 5  | `alt2.aspmx.l.google.com` |
| 10 | `alt3.aspmx.l.google.com` |
| 10 | `alt4.aspmx.l.google.com` |

**TXT record** (host `@`) — SPF, keeps mail from being flagged as spam:

```
v=spf1 include:_spf.google.com ~all
```

That is the entire list. There is no DKIM, DMARC or CAA record on the domain.

### Optional upgrade: working email at the domain, free

Once DNS is on Cloudflare you can turn on **Email Routing** (Cloudflare dashboard
→ your domain → **Email**). It forwards `anything@vanderbiltccg.com` to a real
inbox — your Vanderbilt address, or the next president's — and it is free with
no limit on addresses or rules.
([Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/))

This is worth doing. It means `apply@vanderbiltccg.com` or
`president@vanderbiltccg.com` can go on a resume or a flyer and simply follow
whoever holds the role, instead of being tied to one student's account. Turning
it on **replaces** the Google MX records above, which is fine — they weren't
delivering anywhere anyway.

One caveat: Email Routing receives and forwards only. To *send* from a
`@vanderbiltccg.com` address you also need Gmail's "Send mail as" with an SMTP
relay, which is a separate setup.

### Why the nameservers have to move

Cloudflare Pages can only serve a **root** domain (`vanderbiltccg.com`, no `www.`)
if Cloudflare is also running the domain's DNS. Pointing a single record at it
from Squarespace only works for a subdomain like `www.` — the root needs
Cloudflare's nameservers.
See [Cloudflare's custom domains docs](https://developers.cloudflare.com/pages/configuration/custom-domains/).

**You are not transferring the domain.** It stays registered with Squarespace and
you keep renewing it there. You are only changing which servers answer DNS
questions, which is free and reversible.

### The steps

1. **Add the domain to Cloudflare.** Cloudflare dashboard → **Add a domain** →
   `vanderbiltccg.com` → choose the **Free** plan. Cloudflare scans your existing
   DNS and imports what it finds.
2. **Check the imported records before going further.** Confirm all five MX
   records and the SPF TXT record from the table above are present. Add anything
   missing by hand. Do not skip this — it is the step that protects your email.
3. **Copy the two Cloudflare nameservers** it shows you (they look like
   `xxx.ns.cloudflare.com`).
4. **In Squarespace:** *Settings → Domains → vanderbiltccg.com → Advanced settings
   → Nameservers* → switch to custom nameservers and paste Cloudflare's two.
   ([Squarespace's guide](https://support.squarespace.com/hc/en-us/articles/4404183898125-Making-changes-to-nameservers))
5. **Wait.** Usually under an hour, but allow up to 48 hours. Cloudflare emails
   you when the domain is active.
6. **Attach the domain to the site.** Cloudflare → **Workers & Pages** → your
   project → **Custom domains** → *Set up a custom domain* → add
   `vanderbiltccg.com`, then repeat for `www.vanderbiltccg.com`. Because
   Cloudflare now runs the DNS, it creates the records itself.
7. **Test before cancelling anything:** load the site over https on both
   `vanderbiltccg.com` and `www.vanderbiltccg.com`, and click an Apply button to
   confirm it opens the Google Form. If you did set up Email Routing, send
   yourself a test message too.
8. Only then cancel the Squarespace **website** plan. **Keep the domain
   registration** — and note it renews **6 October 2026**, so make sure a card on
   file is valid or the domain lapses.

> The old Squarespace links (`/our-team`, `/ccg-dealreports`, `/apply-now`)
> redirect automatically to the new pages, so existing links and Google results
> keep working.

### If you'd rather not move the nameservers

You can leave DNS at Squarespace and run the site at **www.vanderbiltccg.com**
only, by adding one CNAME record in Squarespace DNS: host `www`, pointing to
`<your-project>.pages.dev`. Then set the root domain to forward to the `www`
version using Squarespace's domain forwarding. Email is untouched. It is simpler
and lower-risk, but `vanderbiltccg.com` without the `www` will be a redirect
rather than the real address.

## Step 4 — Turn on apply-click tracking

1. Cloudflare dashboard → **Storage & Databases → D1 → Create database**.
   Name it `ccg-analytics`.
2. Open it → **Console** tab → paste the whole of `schema.sql` → **Execute**.
3. Pages project → **Settings → Bindings → Add → D1 database**
   - Variable name: `DB` (exactly this, capitals)
   - Database: `ccg-analytics`

## Step 5 — Turn on site editing

The dashboard can edit the website itself. That needs somewhere to keep the
edited text and any pictures you upload.

1. Cloudflare dashboard → **Storage & Databases → KV → Create namespace**.
   Name it `ccg-content`.
2. Pages project → **Settings → Bindings → Add → KV namespace**
   - Variable name: `CONTENT` (exactly this, capitals)
   - Namespace: `ccg-content`

Nothing is stored there until the first time you press Save; until then the site
serves `data/site.json` from the repo.

## Step 6 — Lock the dashboard with Cloudflare Access

**There is no password anywhere in this system.** Instead, Cloudflare checks who
you are *before* the request reaches the site, using your real identity. You
manage who is allowed from the Cloudflare dashboard — so when someone graduates
you remove their email and they are locked out instantly, with no shared secret
to rotate or leak.

Cloudflare Access is free for up to 50 people, which is far more than the exec
board will ever need.

1. Go to <https://one.dash.cloudflare.com> → **Access → Applications → Add an
   application → Self-hosted**.
2. **Application name:** `CCG Dashboard`. Add these two paths on
   `vanderbiltccg.com`:
   - `vanderbiltccg.com/dashboard*`
   - `vanderbiltccg.com/api/admin/*`
3. **Add a policy:**
   - Name: `Exec board`
   - Action: **Allow**
   - Include → **Emails** → list each exec board member's email
     (or use **Emails ending in** → `@vanderbilt.edu` to allow anyone at
     Vanderbilt — simpler, but much broader; the explicit list is safer)
4. **Login methods:** if you don't want to configure anything, leave
   **One-time PIN** on. People enter their email, get a code, and are in.
   You can add Google sign-in later.
5. Save the application, then open it and copy the **Application Audience (AUD)
   tag** — a long string of letters and numbers.
6. Pages project → **Settings → Variables and secrets** → add two **plaintext
   variables** (not secrets):
   - `ACCESS_AUD` → the AUD tag you just copied
   - `ACCESS_TEAM_DOMAIN` → your team domain, e.g. `yourteam.cloudflareaccess.com`
     (shown at the top of the Zero Trust dashboard)
7. **Deployments → … → Retry deployment** so the new settings load.

Go to `vanderbiltccg.com/dashboard`. You should be asked to sign in, and after
that see the dashboard with your email in the top-right corner.

### Why both the Access policy *and* those two variables

Access blocks unauthorised people at Cloudflare's edge. The variables let the
site *independently verify* the signed token Access attaches to each request, so
the admin endpoints stay protected even if someone later edits the Access policy
by mistake. If the variables are missing, the admin endpoints refuse to work at
all rather than falling open — that is deliberate.

### One hardening step worth doing

Your site is also reachable at `<project>.pages.dev`, which the policy above does
not cover. The admin endpoints there will reject every request (no valid Access
token), so your data is safe either way — but to hide it completely, add a second
Access application covering `<project>.pages.dev` with the same policy.

## Handing it to next year's board

1. **Zero Trust → Access → Applications → CCG Dashboard → Policies** — add the
   new board members' emails and remove the outgoing ones. This is the important
   one: it is what grants and revokes dashboard access.
2. GitHub repo → **Settings → Collaborators** → add the new president.
3. Cloudflare → **Manage account → Members** → invite them.
4. Point them at `EDITING.md`.

There is no password to hand over, and nothing to change on the site itself.

Because the account is tied to the CCG email rather than a person, nothing
breaks when you graduate.
