# Development Guide

This guide covers local development, building, and customizing the Lough 5 website.

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lough-5-site
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development Workflow

### Running the Development Server

To run the development server with live reloading:

```bash
npm start
```

This will start the Vite dev server at http://localhost:5173 with instant hot module reloading. Changes to HTML, CSS, JavaScript, or JSON files will be reflected immediately in your browser.

## Building for Production

To build the project for production:

```bash
npm run build
```

This will create a `dist` directory with all the necessary files for deployment. The build process:
1. Regenerates `assets/runner-stats/` (gitignored) from the yearly results
2. Bundles and minifies all JavaScript using Vite/Rollup
3. Processes all HTML files and injects optimized script/style tags
4. Copies assets with cache-busting hashes (e.g., `main-abc123.js`)
5. Outputs optimized, production-ready files to `dist/`

### Serving the Production Build Locally

To preview the production build locally:

```bash
npm run preview
```

This will serve the files from the `dist` directory at http://localhost:4173.

## Customization

### Styling

The website's appearance can be customized by modifying the CSS in `assets/style.css`. The design uses a color scheme based on amber yellow and charcoal gray.

### URL Parameters

The results and records pages support URL parameters for bookmarking specific searches:

- **Results page**: `?year=2024&search=Smith`
- **Records page**: `?category=fastest-50-male`

This allows users to share direct links to specific search results.

## Technologies Used

- HTML5
- CSS3
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework for client-side interactivity
- [Chart.js](https://www.chartjs.org/) - Simple yet flexible JavaScript charting library
- [Vite](https://vitejs.dev/) - Next generation frontend tooling with instant HMR
- Node.js - For data processing scripts
- NPM for package management and build scripts
