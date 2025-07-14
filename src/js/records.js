export function recordsApp() {
  return {
    searchTerm: '',
    selectedCategory: Math.random() < 0.5 ? 'Fastest 50 Male' : 'Fastest 50 Female',
    results: [],
    showModal: false,
    selectedRunner: {},
    isMobileView: false,

    init() {
      this.loadRecordsForCategory();
      this.checkViewportWidth();

      // Watch for changes to the selected category
      this.$watch('selectedCategory', () => {
        this.loadRecordsForCategory();
      });

      // Check viewport width on resize
      window.addEventListener('resize', this.checkViewportWidth);
    },

    // Check if we're in mobile view (less than 1000px)
    checkViewportWidth() {
      this.isMobileView = window.innerWidth < 1000;
    },

    // Show runner details in modal (for displays under 1000px width)
    showRunnerDetails(runner) {
      if (this.isMobileView) {
        this.selectedRunner = runner;
        this.showModal = true;
      }
    },

    loadRecordsForCategory() {
      let filename = '';

      // Determine which file to load based on the selected category
      if (this.selectedCategory === 'Fastest 50 Male') {
        filename = 'fastest-50-male.json';
      } else if (this.selectedCategory === 'Fastest 50 Female') {
        filename = 'fastest-50-female.json';
      } else if (this.selectedCategory === 'Masters Records') {
        filename = 'masters-records.json';
      }

      fetch(`assets/records/${filename}`)
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
            };
          }).filter(record => record !== null);
        })
        .catch(error => {
          console.error(`Error loading records for ${this.selectedCategory}:`, error);
          this.results = [];
        });
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