# Lough 5 Road Race Website

A comprehensive website for a local charity 5 mile race held annually on December 31st in Loughmacrory, Northern Ireland. Built with HTML, CSS, Alpine.js, and Chart.js.

## Project Overview

This website provides information about the Lough 5 Road Race, including:

- Home page with race information, schedule, and registration details
- Location details with embedded Google Maps
- Interactive course map with PlotARoute integration
- Complete race results (2009-2024) with searchable, filterable tables
- Records section featuring:
  - Top 50 fastest male and female runners (by personal best)
  - Masters records (men and women, age 35-90)
- Runner database with unique identification across years
- Individual runner statistics pages with:
  - Career statistics and performance graphs
  - Badges and achievements
  - Complete race history
- Runner search functionality

## Project Structure

```
├── index.html            # Home page
├── location.html         # Race location information
├── course.html           # Course details and map
├── results.html          # Complete race results
├── records.html          # Records page (fastest 50 + masters)
├── runner-search.html    # Runner search page
├── runner-stats.html     # Individual runner statistics page
├── assets/
│   ├── style.css         # CSS styles
│   ├── lough-background.jpg # Hero background image
│   ├── favicon.ico       # Site favicon
│   ├── js/
│   │   └── bundle.js     # Compiled JavaScript bundle
│   ├── results/          # JSON data for race results by year (with runner_id)
│   │   ├── 2024.json
│   │   ├── 2023.json
│   │   └── ... (2009-2024, 16 years)
│   ├── records/          # JSON data for records
│   │   ├── fastest-50-male.json
│   │   ├── fastest-50-female.json
│   │   ├── masters-men.json
│   │   └── masters-women.json
│   ├── runner-stats/     # Individual runner statistics (4000+ files)
│   │   ├── {runner-id}.json
│   │   └── ...
│   ├── runner-database.json          # Main runner database
│   └── runner-database-warnings.json # Potential duplicates for review
├── src/
│   └── js/               # JavaScript source files
│       ├── main.js       # Main entry point for JavaScript
│       ├── results.js    # Results page functionality
│       ├── records.js    # Records page functionality
│       ├── runner.js     # Runner search and stats functionality
│       └── course.js     # Course map functionality
├── scripts/              # Data processing and management scripts
│   ├── assign-runner-ids.js          # Assign unique IDs to runners
│   ├── generate-runner-database.js   # Generate runner database
│   ├── generate-masters-records.js   # Generate masters records
│   ├── generate-fastest-50.js        # Generate fastest 50 lists
│   ├── generate-runner-stats.js      # Generate individual runner stats
│   ├── review-duplicates.js          # Interactive duplicate resolution
│   ├── find-highest-participation.js # Analyze participation patterns
│   └── README.md                      # Detailed scripts documentation
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
- [Chart.js](https://www.chartjs.org/) - Simple yet flexible JavaScript charting library
- [esbuild](https://esbuild.github.io/) - Fast JavaScript bundler
- Node.js - For data processing scripts
- NPM for package management and build scripts

## Features

- **Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Runner Database**: Unique identification system tracking 4000+ runners across 16 years
  - Fuzzy name matching with configurable similarity thresholds
  - Interactive duplicate resolution tool
  - Deterministic database generation from source files
- **Runner Statistics**: Individual profile pages for each runner with:
  - Career statistics (total races, best time, best position, average time)
  - Performance graphs showing progression over time (Chart.js)
  - Badges and achievements (fastest all-time, podium finishes, age group records)
  - Complete race history with detailed results
- **Runner Search**: Client-side search by name or club (minimum 3 characters)
- **Searchable Results**: Client-side search and filtering across 16 years of race data (2009-2024)
  - Search by name, bib number, category, club, or times
  - Year selector to view historical results
  - URL parameters for bookmarkable searches
- **Records Tracking**: Four categories of performance records with search functionality
  - Fastest 50 male and female runners (by personal best)
  - Masters records for men and women (age 35-90)
- **Interactive Maps**:
  - Google Maps integration for race location
  - PlotARoute embedded course map
- **Mobile-Friendly**: Responsive tables and optimized layouts for all devices
- **Fast Performance**: Lightweight Alpine.js framework with efficient data loading
- **Data-Driven**: Easy to update with new race results via JSON files
- **Automated Processing**: Scripts for ID assignment, database generation, and record calculation

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

### Runner Database System

The website uses a comprehensive runner identification system that tracks runners across years. See [`scripts/README.md`](scripts/README.md) for complete documentation.

**Key Concepts:**
- Each runner has a unique `runner_id` stored in yearly results files
- The database is generated from these source files (deterministic)
- Fuzzy matching helps identify runners across years despite name variations
- Interactive tools help resolve potential duplicates

### Adding New Race Results

**Quick Start:**
1. Add new results file: `assets/results/YYYY.json` (without runner_ids)
2. Assign runner IDs: `npm run assign-runner-ids`
3. Review any duplicate warnings: `npm run review-duplicates`
4. Generate all databases and records: `npm run generate-all`

**Data Structure:**

New results should follow this structure (without `runner_id` - it will be assigned):

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
    "Gun Time": "0:25:15"
  }
]
```

**Note**: Some fields are optional and only present in certain years (e.g., "2 Miles", "Lap of Lough", "Gun Time").

After assignment, results will include a `runner_id` field:
```json
{
  "Position": 1,
  "Name": "Runner Name",
  "runner_id": "runner-name",
  "Category": "MO",
  "Chip Time": "0:25:15"
}
```

### Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run assign-runner-ids` | Assign unique IDs to runners in results files |
| `npm run assign-runner-ids:dry-run` | Preview ID assignments without writing |
| `npm run review-duplicates` | Interactively review and resolve duplicate runners |
| `npm run generate-db` | Generate runner database from results files |
| `npm run generate-masters-records` | Generate masters age group records |
| `npm run generate-fastest-50` | Generate fastest 50 male/female lists |
| `npm run generate-runner-stats` | Generate individual runner statistics files |
| `npm run generate-all` | Run all generation scripts in sequence |

### Common Workflows

**After adding new year results:**
```bash
npm run assign-runner-ids        # Assign IDs to new results
npm run review-duplicates         # Resolve any duplicates (if needed)
npm run generate-all              # Regenerate all databases and records
```

**After fixing typos or updating data:**
```bash
npm run generate-all              # Regenerate everything from source files
```

**Finding participation patterns:**
```bash
node scripts/find-highest-participation.js
```

For detailed documentation on the runner database system and scripts, see [`scripts/README.md`](scripts/README.md).

## Customization

### Styling

The website's appearance can be customized by modifying the CSS in `assets/style.css`. The design uses a color scheme based on amber yellow and charcoal gray.

## Development Notes

### Browser-Sync and injected.js

When running the development server with `npm run dev`, Browser-Sync automatically injects a small JavaScript file (sometimes visible as "injected.js" in browser dev tools) into the page. This file enables live reloading and other development features.

This is only present during development and is not included in the production build created by `npm run build`.

### Testing

The project includes a comprehensive Cypress e2e test suite with smoke tests for all pages. Test files are located in the `cypress/e2e/` directory.

**Running Tests:**

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

**Test Coverage:**

- **home.cy.js** - Home page smoke tests (navigation, content, responsiveness)
- **results.cy.js** - Results page tests (search, filtering, year selection, URL parameters)
- **records.cy.js** - Records page tests (category switching, search, filtering)
- **course-and-location.cy.js** - Map pages tests (iframe loading, navigation)

### URL Parameters

The results and records pages support URL parameters for bookmarking specific searches:

- **Results page**: `?year=2024&search=Smith`
- **Records page**: `?category=fastest-50-male`

This allows users to share direct links to specific search results.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
