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
1. Bundles and minifies all JavaScript using Vite/Rollup
2. Processes all HTML files and injects optimized script/style tags
3. Copies assets with cache-busting hashes (e.g., `main-abc123.js`)
4. Outputs optimized, production-ready files to `dist/`

### Serving the Production Build Locally

To preview the production build locally:

```bash
npm run preview
```

This will serve the files from the `dist` directory at http://localhost:4173.

## Testing

The project includes a comprehensive Cypress e2e test suite with smoke tests for all pages. Test files are located in the `cypress/e2e/` directory.

### Running Tests

The development server must be running before executing tests. In a separate terminal, start the dev server:

```bash
npm start
```

> **Note**: Tests are configured to run against `localhost:5173` (Vite's default port). If you see connection errors, ensure no other process is using port 5173, or kill the conflicting process with `lsof -i :5173` and `kill -9 <PID>`.

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
- [Vite](https://vitejs.dev/) - Next generation frontend tooling with instant HMR
- Node.js - For data processing scripts
- NPM for package management and build scripts
