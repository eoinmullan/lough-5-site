import Alpine from 'alpinejs';
import { resultsApp } from './results.js';
import { recordsApp } from './records.js';
import { initCourseMap } from './course.js';

// Make Alpine.js available globally
window.Alpine = Alpine;

// Make page-specific functions available globally
window.resultsApp = resultsApp;
window.recordsApp = recordsApp;

// Initialize Alpine.js
Alpine.start();

// Initialize course map if on course page
if (document.getElementById('course-map')) {
  initCourseMap();
}