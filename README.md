# Lough 5 Road Race Website

A comprehensive website for a local charity 5 mile race held annually on December 31st in Loughmacrory, Northern Ireland.

## Quick Links

- **[Adding New Year Results](NEW_YEAR.md)** - Step-by-step guide for adding a new race year
- **[Development Guide](DEVELOPMENT.md)** - Local development, building, and testing
- **[Data Management Guide](DATA_MANAGEMENT.md)** - Runner database and data processing
- **[Deployment Guide](DEPLOYMENT.md)** - Building and deploying to production
- **[Scripts Documentation](scripts/README.md)** - Technical documentation for data scripts

## Features

- **Race Results**: Searchable results from 2009-2025 (17 years, 4000+ runners)
- **Runner Profiles**: Individual statistics, performance graphs, and career history
- **Records**: Masters records (age 35-90) and fastest 50 male/female runners
- **Runner Database**: Unique identification system tracks runners across all years
- **Runner Search**: Find any runner by name or club
- **Interactive Maps**: Course map and race location with GPS integration

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Visit http://localhost:5173
```

## Technologies

- **Frontend**: HTML5, CSS3, Alpine.js, Chart.js
- **Build**: Vite
- **Data**: JSON files, Node.js scripts
- **Testing**: Cypress

## Common Tasks

### Adding New Year Results

See **[NEW_YEAR.md](NEW_YEAR.md)** for detailed guide.

Quick workflow:
```bash
node scripts/csv-to-json.js csv-results/2026.csv assets/results/2026.json
npm run assign-ids-new-year 2026
npm run review-warnings 2026
npm run generate-all
```

### Local Development

```bash
npm start              # Dev server with hot reload
npm run build          # Production build
npm run preview        # Preview production build
npm test               # Run Cypress tests
```

### Data Management

```bash
npm run generate-all   # Regenerate all derived data
npm run check-duplicates  # Find duplicate runner IDs
```

## Project Structure

```
├── assets/
│   ├── results/           # Race results by year (2009-2025)
│   ├── records/           # Masters and fastest 50 records
│   ├── runner-stats/      # Individual runner stats (4000+ files)
│   └── runner-database.json  # Main runner database
├── scripts/               # Data processing scripts
├── src/js/                # JavaScript source files
├── cypress/               # E2E tests
└── dist/                  # Production build output
```

## Documentation

- **[NEW_YEAR.md](NEW_YEAR.md)** - Adding new race year results
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Local development and testing
- **[DATA_MANAGEMENT.md](DATA_MANAGEMENT.md)** - Runner database and data workflows
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment
- **[scripts/README.md](scripts/README.md)** - Technical script documentation

## License

MIT License - see LICENSE file for details.
