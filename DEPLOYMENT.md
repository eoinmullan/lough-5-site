# Deployment Guide

This guide covers building and deploying the Lough 5 website to production.

## Building for Production

To build the project for production:

```bash
npm run build
```

This will create a `dist` directory with all the necessary files for deployment. The build process:
1. Creates the dist directory structure
2. Copies all HTML files and assets to the dist directory
3. Bundles and minifies all JavaScript files into a single bundle.js file using esbuild

## Deploying to AWS S3

Deploy the production build to AWS S3:

```bash
aws s3 sync dist/ s3://<bucket-name>/ --acl public-read --cache-control max-age=3600 --profile <profile-name> --delete
```

Replace:
- `<bucket-name>` with your S3 bucket name
- `<profile-name>` with your AWS CLI profile

The `--delete` flag removes files from S3 that are no longer in the dist directory.

## Testing Production Build Locally

To serve the production build locally before deploying:

```bash
npm start
```

This will serve the files from the `dist` directory at http://localhost:5000 (or another available port).

## Complete Deployment Workflow

After updating data or making changes:

```bash
# Build production site
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket/ --acl public-read --cache-control max-age=3600 --delete --profile your-profile
```
