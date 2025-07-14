export function resultsApp() {
  return {
    searchTerm: '',
    selectedYear: '2024',
    results: [],
    showModal: false,
    selectedRunner: {},
    isMobileView: false,

    init() {
      this.loadResultsForYear();
      this.checkViewportWidth();

      // Watch for changes to the selected year
      this.$watch('selectedYear', () => {
        this.loadResultsForYear();
      });

      // Check viewport width on resize
      window.addEventListener('resize', this.checkViewportWidth);
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
        })
        .catch(error => {
          console.error(`Error loading results for ${this.selectedYear}:`, error);
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