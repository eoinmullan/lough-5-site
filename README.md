# Lough 5 Road Race Website

A simple website for a local charity 5K race, built with HTML, CSS, and Alpine.js.

## Project Overview

This website provides information about the Lough 5 Road Race, including:

- Home page with general information
- Location details with Google Maps integration
- Course information and map
- Complete race results with searchable table
- Records section with fastest runners

## Project Structure

```
├── index.html            # Home page
├── location.html         # Race location information
├── course.html           # Course details and map
├── results.html          # Complete race results
├── records.html          # Top 50 fastest runners
├── assets/
│   ├── style.css         # CSS styles
│   ├── results/          # JSON data for race results by year
│   │   ├── 2024.json
│   │   ├── 2023.json
│   │   └── ...
│   └── records/          # JSON data for Records
│       ├── fastest-50-male.json
│       └── fastest-50-female.json
├── src/
│   └── js/               # JavaScript source files
│       ├── main.js       # Main entry point for JavaScript
│       ├── results.js    # Results page functionality
│       ├── records.js    # Records page functionality
│       └── course.js     # Course map functionality
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

- Responsive design that works on mobile, tablet, and desktop
- Client-side search functionality for race results
- Integration with Google Maps (placeholder)
- Modular structure for easy maintenance

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

To run the development server with live reloading:

```
npm run dev-js
npm run dev
```

This will start a local server at http://localhost:3000 (or another available port) and automatically reload the page when you make changes to the HTML, CSS, or JSON files.

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

## Customization

### Modifying Race Data

To update the race results or Records data, edit the JSON files in the appropriate directories:

- `assets/results/YYYY.json` - Race results for a specific year (e.g., 2024.json)
- `assets/records/fastest-50-male.json` - Top 50 fastest male runners
- `assets/records/fastest-50-female.json` - Top 50 fastest female runners

### Styling

The website's appearance can be customized by modifying the CSS in `assets/style.css`.

## Development Notes

### Browser-Sync and injected.js

When running the development server with `npm run dev`, Browser-Sync automatically injects a small JavaScript file (sometimes visible as "injected.js" in browser dev tools) into the page. This file enables live reloading and other development features.

This is only present during development and is not included in the production build created by `npm run build`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
