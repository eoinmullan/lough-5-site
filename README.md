# Lough 5 Road Race Website

A comprehensive website for a local charity 5 mile race held annually on December 31st in Loughmacrory, Northern Ireland. Built with HTML, CSS, Alpine.js, and Chart.js.

## Quick Links

- **[Development Guide](DEVELOPMENT.md)** - Local development, building, and testing
- **[Data Management Guide](DATA_MANAGEMENT.md)** - Runner database, adding results, managing profiles
- **[Deployment Guide](DEPLOYMENT.md)** - Building and deploying to production
- **[Scripts Documentation](scripts/README.md)** - Detailed technical documentation for data processing scripts

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
│   ├── runner-database-warnings.json # Potential duplicates for review
│   └── runner-profiles.json          # Hand-researched runner profiles (95 runners)
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
│   ├── generate-priority-candidates.js # Generate list of runners needing profiles
│   ├── review-duplicates.js          # Interactive duplicate resolution
│   ├── find-duplicate-runner-ids.js  # Check for duplicate IDs in results files
│   ├── find-highest-participation.js # Analyze participation patterns
│   └── README.md                      # Detailed scripts documentation
├── priority-profile-candidates.json  # Auto-generated list of runners needing profiles
├── priority-profile-candidates.md    # Human-readable version of candidate list
├── cypress/              # E2E testing configuration
│   ├── e2e/              # Test files
│   ├── fixtures/         # Test data
│   └── support/          # Test helpers
├── dist/                 # Production build output
├── package.json          # NPM configuration
└── README.md             # Project documentation
```

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
  - Hand-researched profiles for 95 runners (medal winners and record holders)
    - External achievements (national/international competitions)
    - Power of 10 and World Athletics links where available
    - Collapsible biographical narratives
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
   ```bash
   git clone <repository-url>
   cd lough-5-site
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Quick Start

Run the development server:

```bash
# Terminal 1 - Watch and rebuild JavaScript
npm run dev-js

# Terminal 2 - Start development server
npm run dev
```

Visit http://localhost:3000 to see the site.

For detailed development, testing, and deployment instructions, see the guides linked at the top of this README.

## Technologies Used

- HTML5, CSS3
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework
- [Chart.js](https://www.chartjs.org/) - JavaScript charting library
- [esbuild](https://esbuild.github.io/) - Fast JavaScript bundler
- Node.js and NPM

## License

This project is licensed under the MIT License - see the LICENSE file for details.
