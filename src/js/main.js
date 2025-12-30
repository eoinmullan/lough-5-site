import Alpine from 'alpinejs';
import { resultsApp } from './results.js';
import { recordsApp } from './records.js';
import { initCourseMap } from './course.js';
import { runnerSearchPage, runnerStatsPage } from './runner.js';
import { checkFor2025Results, results2025Available } from './results2025.js';

// Make Alpine.js available globally
window.Alpine = Alpine;

// Make page-specific functions available globally
window.resultsApp = resultsApp;
window.recordsApp = recordsApp;
window.runnerSearchPage = runnerSearchPage;
window.runnerStatsPage = runnerStatsPage;
window.results2025Available = results2025Available;

// Initialize Alpine store for 2025 results
Alpine.store('results2025', { available: results2025Available });

// Initialize Alpine.js
Alpine.start();

// Initialize course map if on course page
if (document.getElementById('course-map')) {
  initCourseMap();
}

// Check if 2025 results are available
checkFor2025Results();