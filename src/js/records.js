export function recordsApp() {
  return {
    searchTerm: '',
    selectedCategory: Math.random() < 0.5 ? 'Fastest 50 Male' : 'Fastest 50 Female',
    results: [],
    showModal: false,
    selectedRunner: {},
    isMobileView: false,
    isLoading: true,
    highlightRunnerId: null,

    init() {
      // Check URL parameters for category and runner_id
      const urlParams = new URLSearchParams(window.location.search);
      const categoryParam = urlParams.get('category');
      const runnerIdParam = urlParams.get('runner');

      // Set the category from URL parameter if it exists and is valid
      if (categoryParam) {
        // Convert kebab-case URL parameter to title case
        const categoryMap = {
          'fastest-50-male': 'Fastest 50 Male',
          'fastest-50-female': 'Fastest 50 Female',
          'masters-men': 'Masters Men',
          'masters-women': 'Masters Women'
        };

        // Support both kebab-case and title case formats
        const validCategories = ['Fastest 50 Male', 'Fastest 50 Female', 'Masters Men', 'Masters Women'];
        if (categoryMap[categoryParam]) {
          this.selectedCategory = categoryMap[categoryParam];
        } else if (validCategories.includes(categoryParam)) {
          this.selectedCategory = categoryParam;
        }
      }

      // Set highlightRunnerId from URL parameter
      if (runnerIdParam) {
        this.highlightRunnerId = runnerIdParam;
      }

      this.loadRecordsForCategory();
      this.checkViewportWidth();

      // Watch for changes to the selected category
      this.$watch('selectedCategory', () => {
        this.loadRecordsForCategory();

        // Update URL when category changes (use kebab-case for cleaner URLs)
        const url = new URL(window.location);
        const categoryToKebab = {
          'Fastest 50 Male': 'fastest-50-male',
          'Fastest 50 Female': 'fastest-50-female',
          'Masters Men': 'masters-men',
          'Masters Women': 'masters-women'
        };
        url.searchParams.set('category', categoryToKebab[this.selectedCategory] || this.selectedCategory);
        window.history.pushState({}, '', url);
      });

      // Check viewport width on resize
      window.addEventListener('resize', this.checkViewportWidth);
    },

    // Check if we're in mobile view (less than 1000px)
    checkViewportWidth() {
      this.isMobileView = window.innerWidth < 1000;
    },

    // Show runner details in modal (for displays under 1000px width) or navigate to stats (for larger displays)
    showRunnerDetails(runner) {
      if (this.isMobileView) {
        this.selectedRunner = runner;
        this.showModal = true;
      } else {
        // On desktop, navigate to runner stats page if runner_id exists
        if (runner.runner_id) {
          window.location.href = `runner-stats.html?runner=${runner.runner_id}`;
        }
      }
    },

    get isMastersRecords() {
      return ['Masters Men', 'Masters Women'].includes(this.selectedCategory);
    },

    loadRecordsForCategory() {
      this.isLoading = true;
      let filename = '';

      // Determine which file to load based on the selected category
      if (this.selectedCategory === 'Fastest 50 Male') {
        filename = 'fastest-50-male.json';
      } else if (this.selectedCategory === 'Fastest 50 Female') {
        filename = 'fastest-50-female.json';
      } else if (this.selectedCategory === 'Masters Men') {
        filename = 'masters-men.json';
      } else if (this.selectedCategory === 'Masters Women') {
        filename = 'masters-women.json';
      }

      fetch(`records/${filename}`)
        .then(response => response.json())
        .then(data => {
          // Transform the data to match the expected format
          this.results = data.map(record => {
            return {
              position: record.Position || '',
              year: record.Year || '',
              name: record.Name || '',
              club: record.Club || '',
              category: record.Category || '',
              finish_time: record["Finish Time"] || '',
              runner_id: record.runner_id || null
            };
          }).filter(record => record !== null);
          this.isLoading = false;

          // Scroll to highlighted runner if specified
          if (this.highlightRunnerId) {
            this.$nextTick(() => {
              this.scrollToRunner(this.highlightRunnerId);
            });
          }
        })
        .catch(error => {
          console.error(`Error loading records for ${this.selectedCategory}:`, error);
          this.results = [];
          this.isLoading = false;
        });
    },

    scrollToRunner(runnerId) {
      // Find the row with this runner_id
      const rows = document.querySelectorAll('.records-table tbody tr');
      const targetRow = Array.from(rows).find(row => {
        const nameCell = row.querySelector('td[data-label="Name"]');
        // Find the runner in results by matching the name
        const rowIndex = Array.from(rows).indexOf(row);
        return this.filteredResults[rowIndex]?.runner_id === runnerId;
      });

      if (targetRow) {
        // Scroll the row into view
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight class
        targetRow.classList.add('highlight-row');

        // Remove highlight after 3 seconds
        setTimeout(() => {
          targetRow.classList.remove('highlight-row');
        }, 3000);
      }
    },

    get filteredResults() {
      if (!this.searchTerm.trim()) {
        return this.results;
      }

      const term = this.searchTerm.toLowerCase().trim();

      return this.results.filter(runner => {
        return (
          (runner.name && runner.name.toLowerCase().includes(term)) ||
          (runner.year && runner.year.toString().includes(term)) ||
          (runner.category && runner.category.toLowerCase().includes(term)) ||
          (runner.club && runner.club.toLowerCase().includes(term))
        );
      });
    }
  };
}
