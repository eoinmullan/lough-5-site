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

## Hosting Setup

| | |
|---|---|
| Worker | `lough-5-site` ([lough-5-site.eoin-mullan-a63.workers.dev](https://lough-5-site.eoin-mullan-a63.workers.dev)) |
| Custom domains | `lough5.com`, `www.lough5.com` (Worker → **Settings** → **Domains & Routes**) |
| DNS | Cloudflare (moved from AWS Route 53, Nov 2026) |
| Registrar | Blacknight — auto-renews each December |
| Email | None |

Workers Builds settings (Worker → **Settings** → **Build**):
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `master`, with builds for non-production branches enabled

The Worker name must match `name` in [wrangler.jsonc](wrangler.jsonc).

## Outstanding

### Decommission AWS

The site used to be served from CloudFront → S3 with Route 53 DNS (account `401894346357`). None of it is used now. Delete:

1. CloudFront distribution `d2uq5lau3gxc1s` (disable, then delete)
2. The S3 bucket
3. The Route 53 hosted zone for `lough5.com`
4. The ACM certificate, and the IAM user/keys and `lough-5-s3-push` role used for `aws s3 sync`

### Domain registration (optional)

The domain auto-renews at Blacknight. To move it to Cloudflare Registrar instead, unlock the domain and get the auth code from Blacknight, then start the transfer from the Cloudflare dashboard (**Add a site** → **Transfer a domain**). A transfer adds a year and is billed at cost. Allow up to 5 days.
