/**
 * This file contains functions for checking if the 2025 results exist
 * and updating the UI accordingly.
 */

export let results2025Available = false;

export function checkFor2025Results() {
  fetch('results/2025.json')
    .then(response => {
      // First check if response is OK (status 200-299)
      if (!response.ok) {
        throw new Error('Response not OK');
      }
      
      // Check content type to ensure we're getting JSON, not HTML
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Not JSON content');
      }

      // Try to parse as JSON to further validate
      return response.json().then(data => {
        // If we get here, we have valid JSON
        results2025Available = true;
        
        // Notify Alpine.js that the variable has changed
        if (window.Alpine) {
          window.Alpine.store('results2025', {available: true});
        }
      });
    })
    .catch(() => {
      // Ensure results are marked as unavailable
      results2025Available = false;
      
      // Update Alpine store if available
      if (window.Alpine) {
        window.Alpine.store('results2025', {available: false});
      }
    });
}