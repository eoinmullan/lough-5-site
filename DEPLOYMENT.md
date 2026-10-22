# Deployment Guide

The site is a static build hosted on **Cloudflare Workers (static assets)**. Cloudflare Workers Builds watches the GitHub repo:

- Push to `master` → build and deploy to production
- Push to any other branch → build and upload a preview version with its own URL

## How the Build Works

Cloudflare runs `npm run build`, which:
1. Regenerates `assets/runner-stats/` (gitignored) from the committed yearly results, records and profiles
2. Runs `vite build` to produce `dist/`

It then runs `npx wrangler deploy`, which uploads `dist/` as configured in [wrangler.jsonc](wrangler.jsonc).

All other generated data (`runner-database.json`, `records/*.json`, position fields in results) is committed, so run `npm run generate-all` locally and commit the output before pushing data changes.

### Caching

[assets/_headers](assets/_headers) is copied to `dist/_headers`. Vite's hashed files under `/assets/` are cached for a year. Everything else uses the Cloudflare default (revalidate with ETag), so data updates appear immediately.

## Manual Deploy

Requires `npx wrangler login` once.

```bash
npm run deploy
```

## Testing the Production Build Locally

```bash
npm run build
npm run preview    # http://localhost:4173
```

## One-Time Setup

### 1. Connect the repo to Cloudflare

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → GitHub → `eoinmullan/lough-5-site`
2. Project name: `lough-5-site` (must match `name` in `wrangler.jsonc`)
3. Build command: `npm run build`
4. Deploy command: `npx wrangler deploy`
5. Production branch: `master`; enable builds for non-production branches
6. Deploy and check the site at `https://lough-5-site.<your-subdomain>.workers.dev`

### 2. Move DNS for lough5.com to Cloudflare

Current setup (as of Oct 2026):

| | |
|---|---|
| Registrar | Blacknight — **registration expires 13 Dec 2026** |
| DNS | AWS Route 53 |
| Hosting | CloudFront → S3 (both `lough5.com` and `www.lough5.com`) |
| Email | None (no MX records) |
| DNSSEC | Off |

Steps:

1. **Export the Route 53 zone** so nothing is missed:
   ```bash
   aws route53 list-hosted-zones --profile <profile>
   aws route53 list-resource-record-sets --hosted-zone-id <zone-id> --profile <profile>
   ```
   Note the CloudFront distribution domain (`dxxxxxxxx.cloudfront.net`) on the apex/`www` alias records.
2. **Add the zone to Cloudflare**: dashboard → **Add a domain** → `lough5.com` → Free plan. Compare the imported records against the export.
3. **Fix the imported apex/`www` records.** Route 53 aliases import as A/AAAA records pointing at CloudFront IPs, which change over time. Replace them with `CNAME` records to the CloudFront domain, set to **DNS only** (grey cloud), so the old site keeps working during the switch.
4. **Change nameservers at Blacknight** to the two Cloudflare nameservers shown in the dashboard.
5. **Wait for Cloudflare to show the zone as Active.** This is usually under an hour, but the `.com` NS TTL is 48h, so allow up to 2 days.
6. **Point the domain at the Worker**: delete the apex and `www` CNAMEs, then Worker → **Settings** → **Domains & Routes** → add custom domains `lough5.com` and `www.lough5.com`.
7. Optional: add a redirect rule from `www.lough5.com` to `lough5.com` (or vice versa) so there is one canonical URL.

### 3. Decommission AWS

After a few days of traffic on Cloudflare:

1. Disable, then delete, the CloudFront distribution
2. Delete the S3 bucket
3. Delete the Route 53 hosted zone
4. Delete the ACM certificate and the IAM user/keys used for `aws s3 sync`

### 4. Domain registration

Either renew at Blacknight before 13 Dec 2026, or transfer the domain to Cloudflare Registrar once the zone is Active. A transfer adds a year and is billed at cost. To transfer, unlock the domain and get the auth code from Blacknight, then start it from the Cloudflare dashboard. Allow up to 5 days, so start well before the expiry date.
