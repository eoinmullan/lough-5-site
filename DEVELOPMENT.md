# Development Guide

This guide covers local development, building, testing, and customizing the Lough 5 website.

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

To run the development server with live reloading, you'll need to run two commands in separate terminal windows:

**Terminal 1** - Watch and rebuild JavaScript:
```bash
npm run dev-js
```

**Terminal 2** - Start the development server:
```bash
npm run dev
```

This will start a local server at http://localhost:3000 (or another available port) and automatically reload the page when you make changes to the HTML, CSS, or JSON files. The `dev-js` command watches for JavaScript changes and rebuilds the bundle automatically.

### Browser-Sync and injected.js

When running the development server with `npm run dev`, Browser-Sync automatically injects a small JavaScript file (sometimes visible as "injected.js" in browser dev tools) into the page. This file enables live reloading and other development features.

This is only present during development and is not included in the production build created by `npm run build`.

## Building for Production

To build the project for production:

```bash
npm run build
```

This will create a `dist` directory with all the necessary files for deployment. The build process:
1. Creates the dist directory structure
2. Copies all HTML files and assets to the dist directory
3. Bundles and minifies all JavaScript files into a single bundle.js file using esbuild

### Serving the Production Build Locally

To serve the production build locally:

```bash
npm start
```

This will serve the files from the `dist` directory at http://localhost:5000 (or another available port).

## Testing

The project includes a comprehensive Cypress e2e test suite with smoke tests for all pages. Test files are located in the `cypress/e2e/` directory.

### Running Tests

The development server must be running before executing tests. In a separate terminal, start the dev server:

```bash
npm run dev
```

Then run the tests:

```bash
# Run all tests in headless mode (CI-friendly)
npm test

# Open Cypress Test Runner (interactive mode)
npm run test:open

# Run tests with browser visible
npm run test:headed

# Run tests in specific browsers
npm run test:chrome
npm run test:firefox
```

### Test Coverage

- **home.cy.js** - Home page smoke tests (navigation, content, responsiveness)
- **results.cy.js** - Results page tests (search, filtering, year selection, URL parameters)
- **records.cy.js** - Records page tests (category switching, search, filtering)
- **course-and-location.cy.js** - Map pages tests (iframe loading, navigation)

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
- [esbuild](https://esbuild.github.io/) - Fast JavaScript bundler
- Node.js - For data processing scripts
- NPM for package management and build scripts
