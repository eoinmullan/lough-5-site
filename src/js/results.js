export function resultsApp() {
  return {
    searchTerm: '',
    selectedYear: '2024',
    results: [],
    showModal: false,
    selectedRunner: {},
    isMobileView: false,
    isLoading: true,

    init() {
      // Read URL parameters on page load
      this.readUrlParams();

      this.loadResultsForYear();
      this.checkViewportWidth();

      // Watch for changes to the selected year
      this.$watch('selectedYear', () => {
        this.loadResultsForYear();
        this.updateUrlParams();
      });

      // Watch for changes to the search term
      this.$watch('searchTerm', () => {
        this.updateUrlParams();
      });

      // Check viewport width on resize
      window.addEventListener('resize', this.checkViewportWidth);
    },

    // Read year and search parameters from URL
    readUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);

      // Set selectedYear from URL parameter if it exists
      const yearParam = urlParams.get('year');
      if (yearParam && ['2024', '2023', '2022', '2021', '2020', '2019', '2018',
        '2017', '2016', '2015', '2014', '2013', '2012', '2011',
        '2010', '2009'].includes(yearParam)) {
        this.selectedYear = yearParam;
      }

      // Set searchTerm from URL parameter if it exists
      const searchParam = urlParams.get('search');
      if (searchParam) {
        this.searchTerm = searchParam;
      }
    },

    // Update URL parameters based on current state
    updateUrlParams() {
      const urlParams = new URLSearchParams();

      // Add year parameter if not the default
      if (this.selectedYear !== '2024') {
        urlParams.set('year', this.selectedYear);
      }

      // Add search parameter if not empty
      if (this.searchTerm.trim()) {
        urlParams.set('search', this.searchTerm);
      }

      // Update URL without reloading the page
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    },

    // Check if we're in mobile view (less than 1000px)
    checkViewportWidth() {
      this.isMobileView = window.innerWidth < 1000;
    },

    get showBibNumber() {
      return !['2020'].includes(this.selectedYear);
    },

    get showLapOfLough() {
      return !['2020', '2016', '2014', '2009'].includes(this.selectedYear);
    },

    get showTwoMiles() {
      return ['2014', '2013', '2012', '2011', '2010'].includes(this.selectedYear);
    },

    get showChipTime() {
      return ![].includes(this.selectedYear);
    },

    get showGunTime() {
      return !['2020', '2014', '2009'].includes(this.selectedYear);
    },

    // Show runner details in modal (for displays under 1000px width)
    showRunnerDetails(runner) {
      if (this.isMobileView) {
        this.selectedRunner = runner;
        this.showModal = true;
      }
    },

    loadResultsForYear() {
      this.isLoading = true;
      fetch(`assets/results/${this.selectedYear}.json`)
        .then(response => response.json())
        .then(data => {
          // Transform the data to match the expected format
          this.results = data.map(runner => {
            return {
              position: runner.Position || '',
              bib: runner["Bib no."] || '',
              name: runner.Name || '',
              age_group: runner.Category || '',
              club: runner.Club || '',
              two_miles: this.showTwoMiles ? runner["2 Miles"] || '' : null,
              lap_of_lough: this.showLapOfLough ? runner["Lap of Lough"] || '' : null,
              chip_time: this.showChipTime ? runner["Chip Time"] || '' : null,
              gun_time: this.showGunTime ? runner["Gun Time"] || '' : null,
            };
          }).filter(runner => runner !== null);
          this.isLoading = false;
        })
        .catch(error => {
          console.error(`Error loading results for ${this.selectedYear}:`, error);
          this.results = [];
          this.isLoading = false;
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
          (runner.bib && runner.bib.toString().includes(term)) ||
          (runner.age_group && runner.age_group.toLowerCase().includes(term)) ||
          (runner.club && runner.club.toLowerCase().includes(term)) ||
          (runner.two_miles && runner.two_miles.toLowerCase().includes(term)) ||
          (runner.lap_of_lough && runner.lap_of_lough.toLowerCase().includes(term)) ||
          (runner.chip_time && runner.chip_time.toLowerCase().includes(term)) ||
          (runner.gun_time && runner.gun_time.toLowerCase().includes(term))
        );
      });
    }
  };
}
