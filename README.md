# Charity 5K Race Website

A simple website for a local charity 5K race, built with HTML, CSS, and Alpine.js.

## Project Overview

This website provides information about a local charity 5K race, including:

- Home page with general information
- Location details with Google Maps integration
- Course information and map
- Complete race results with searchable table
- Fastest 50 runners with searchable table

## Project Structure

```
├── index.html            # Home page
├── location.html         # Race location information
├── course.html           # Course details and map
├── results.html          # Complete race results
├── fastest-50.html       # Top 50 fastest runners
├── assets/
│   ├── style.css         # CSS styles
│   ├── results.json      # JSON data for full results
│   └── fastest50.json    # JSON data for fastest 50
├── package.json          # NPM configuration
└── README.md             # Project documentation
```

## Technologies Used

- HTML5
- CSS3
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework for client-side interactivity
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
   cd charity-5k-race
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Development

To run the development server with live reloading:

```
npm run dev
```

This will start a local server at http://localhost:3000 (or another available port) and automatically reload the page when you make changes to the HTML, CSS, or JSON files.

### Building for Production

To build the project for production:

```
npm run build
```

This will create a `dist` directory with all the necessary files for deployment.

### Serving the Production Build

To serve the production build locally:

```
npm start
```

This will serve the files from the current directory at http://localhost:5000 (or another available port).

## Customization

### Modifying Race Data

To update the race results or fastest 50 data, edit the JSON files in the `assets` directory:

- `assets/results.json` - Full race results
- `assets/fastest50.json` - Top 50 fastest runners

### Styling

The website's appearance can be customized by modifying the CSS in `assets/style.css`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.