# Lough 5 Road Race Website

A simple website for a local charity 5K race held annually on December 31st in Loughmacrory, Northern Ireland. Built with HTML, CSS, and Alpine.js.

## Project Overview

This website provides information about the Lough 5 Road Race, including:

- Home page with race information, schedule, and registration details
- Location details with embedded Google Maps
- Interactive course map with PlotARoute integration
- Complete race results (2009-2024) with searchable, filterable tables
- Records section featuring:
  - Top 50 fastest male and female runners
  - Masters records (men and women)

## Project Structure

```
├── index.html            # Home page
├── location.html         # Race location information
├── course.html           # Course details and map
├── results.html          # Complete race results
├── records.html          # Records page (fastest 50 + masters)
├── assets/
│   ├── style.css         # CSS styles
│   ├── lough-background.jpg # Hero background image
│   ├── favicon.ico       # Site favicon
│   ├── results/          # JSON data for race results by year
│   │   ├── 2024.json
│   │   ├── 2023.json
│   │   └── ... (2009-2024, 16 years)
│   └── records/          # JSON data for records
│       ├── fastest-50-male.json
│       ├── fastest-50-female.json
│       ├── masters-men.json
│       └── masters-women.json
├── src/
│   └── js/               # JavaScript source files
│       ├── main.js       # Main entry point for JavaScript
│       ├── results.js    # Results page functionality
│       ├── records.js    # Records page functionality
│       └── course.js     # Course map functionality
├── scripts/              # Utility scripts for data processing
│   ├── find-highest-participation.js  # Analyze participation patterns
│   ├── generate-masters-records.js    # Generate masters records
│   └── missing-masters-times.csv      # Reference data
├── cypress/              # E2E testing configuration
│   ├── e2e/              # Test files
│   ├── fixtures/         # Test data
│   └── support/          # Test helpers
├── dist/                 # Production build output
├── package.json          # NPM configuration
└── README.md             # Project documentation
```

## Technologies Used

- HTML5
- CSS3
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework for client-side interactivity
- [esbuild](https://esbuild.github.io/) - Fast JavaScript bundler
- NPM for package management and build scripts

## Features

- **Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Searchable Results**: Client-side search and filtering across 16 years of race data (2009-2024)
  - Search by name, bib number, category, club, or times
  - Year selector to view historical results
  - URL parameters for bookmarkable searches
- **Records Tracking**: Four categories of performance records with search functionality
- **Interactive Maps**:
  - Google Maps integration for race location
  - PlotARoute embedded course map
- **Mobile-Friendly**: Modal popups for detailed runner information on mobile devices
- **Fast Performance**: Lightweight Alpine.js framework with minimal JavaScript bundle
- **Data-Driven**: Easy to update with new race results via JSON files

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd lough-5-site
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Development

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

### Building for Production

To build the project for production:

```
npm run build
```

This will create a `dist` directory with all the necessary files for deployment. The build process:
1. Creates the dist directory structure
2. Copies all HTML files and assets to the dist directory
3. Bundles and minifies all JavaScript files into a single bundle.js file using esbuild

### Deploying to Production

aws s3 sync dist/ s3://<bucket-name>/ --acl public-read --cache-control max-age=3600 --profile <profile-name> --delete

### Serving the Production Build

To serve the production build locally:

```
npm start
```

This will serve the files from the `dist` directory at http://localhost:5000 (or another available port).

## Data Management

### Adding New Race Results

To add results for a new year:

1. Create a new JSON file in `assets/results/` named `YYYY.json` (e.g., `2025.json`)
2. Follow the existing data structure:

```json
[
  {
    "Position": 1,
    "Bib no.": 123,
    "Name": "Runner Name",
    "Category": "MO",
    "Club": "Club Name",
    "Lap of Lough": "0:05:59",
    "Chip Time": "0:25:15",
    "Gun Time": "0:25:15",
    "2 Miles": "0:10:30"
  }
]
```

**Note**: Some fields like "2 Miles" are optional and only present in certain years.

### Updating Records

Records files are located in `assets/records/`:

- `fastest-50-male.json` - Top 50 fastest male runners (all-time)
- `fastest-50-female.json` - Top 50 fastest female runners (all-time)
- `masters-men.json` - Masters records for men (age 35+)
- `masters-women.json` - Masters records for women (age 35+)

To regenerate masters records from race results, use:
```bash
node scripts/generate-masters-records.js
```

### Analyzing Participation

To find runners with the highest participation across all years:
```bash
node scripts/find-highest-participation.js
```

This analyzes all race results and identifies frequent participants.

## Customization

### Styling

The website's appearance can be customized by modifying the CSS in `assets/style.css`. The design uses a color scheme based on amber yellow and charcoal gray.

## Development Notes

### Browser-Sync and injected.js

When running the development server with `npm run dev`, Browser-Sync automatically injects a small JavaScript file (sometimes visible as "injected.js" in browser dev tools) into the page. This file enables live reloading and other development features.

This is only present during development and is not included in the production build created by `npm run build`.

### Testing

The project includes Cypress for end-to-end testing. Test files are located in the `cypress/` directory.

```bash
npm test
```

**Note**: Test suite is currently not fully implemented.

### URL Parameters

The results and records pages support URL parameters for bookmarking specific searches:

- **Results page**: `?year=2024&search=Smith`
- **Records page**: `?category=fastest-50-male`

This allows users to share direct links to specific search results.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
