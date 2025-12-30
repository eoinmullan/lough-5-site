export function resultsApp() {
  return {
    searchTerm: '',
    selectedYear: '2025',
    results: [],
    femaleOnly: false,
    highlightPosition: null,
    showModal: false,
    selectedRunner: {},
    isMobileView: false,
    isLoading: true,
    showPopupNotification: false,
    popupTimer: null,

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

      // Watch for changes to the female only toggle
      this.$watch('femaleOnly', () => {
        this.updateUrlParams();
      });

      // Check viewport width on resize
      window.addEventListener('resize', this.checkViewportWidth);

      // Check if we should show the popup notification
      this.$nextTick(() => {
        this.checkPopupNotification();
      });
    },

    // Check if we should show the popup notification
    checkPopupNotification() {
      // Only show the popup on mobile view
      if (this.isMobileView) {
        // Check if the user has already dismissed the popup
        const popupDismissedTimestamp = localStorage.getItem('popupDismissed');
        const currentTime = Date.now();
        const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds

        // Show popup if it's never been dismissed or if it's been more than a year
        const shouldShowPopup = !popupDismissedTimestamp ||
          (currentTime - parseInt(popupDismissedTimestamp) > oneYearInMilliseconds);

        if (shouldShowPopup) {
          // Show the popup after a short delay
          setTimeout(() => {
            this.showPopupNotification = true;

            // Auto-hide the popup after 15 seconds
            this.popupTimer = setTimeout(() => {
              this.dismissPopupNotification();
            }, 15000);
          }, 1500);
        }
      }
    },

    // Dismiss the popup notification
    dismissPopupNotification() {
      this.showPopupNotification = false;

      // Clear the auto-hide timer if it exists
      if (this.popupTimer) {
        clearTimeout(this.popupTimer);
        this.popupTimer = null;
      }

      // Remember when the user dismissed the popup by storing the current timestamp
      localStorage.setItem('popupDismissed', Date.now().toString());
    },

    // Read year and search parameters from URL
    readUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);

      // Set selectedYear from URL parameter if it exists
      const yearParam = urlParams.get('year');
      if (yearParam && ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018',
        '2017', '2016', '2015', '2014', '2013', '2012', '2011',
        '2010', '2009'].includes(yearParam)) {
        this.selectedYear = yearParam;
      }

      // Set searchTerm from URL parameter if it exists
      const searchParam = urlParams.get('search');
      if (searchParam) {
        this.searchTerm = searchParam;
      }

      // Set femaleOnly from URL parameter if it exists
      const femaleParam = urlParams.get('femaleOnly');
      if (femaleParam === 'true') {
        this.femaleOnly = true;
      }

      // Set highlightPosition from URL parameter if it exists
      const positionParam = urlParams.get('position');
      if (positionParam) {
        this.highlightPosition = parseInt(positionParam);
      }
    },

    // Update URL parameters based on current state
    updateUrlParams() {
      const urlParams = new URLSearchParams();

      // Add year parameter if not the default
      if (this.selectedYear !== '2025') {
        urlParams.set('year', this.selectedYear);
      }

      // Add search parameter if not empty
      if (this.searchTerm.trim()) {
        urlParams.set('search', this.searchTerm);
      }

      // Add femaleOnly parameter if true
      if (this.femaleOnly) {
        urlParams.set('femaleOnly', 'true');
      }

      // Update URL without reloading the page
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    },

    // Check if we're in mobile view (less than 1000px)
    checkViewportWidth() {
      const wasMobileView = this.isMobileView;
      this.isMobileView = window.innerWidth < 1000;

      // If we've switched to mobile view, check if we should show the popup
      if (!wasMobileView && this.isMobileView) {
        this.checkPopupNotification();
      }
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

    get showGunTime() {
      return !['2020', '2014', '2009'].includes(this.selectedYear);
    },

    // Show runner details in modal (for displays under 1000px width) or navigate to stats (for larger displays)
    showRunnerDetails(runner) {
      if (this.isMobileView) {
        this.selectedRunner = runner;
        this.showModal = true;
      } else {
        // On desktop, navigate to runner stats page if runner_id exists
        const url = this.getRunnerStatsUrl(runner);
        if (url) {
          window.location.href = url;
        }
      }
    },

    // Get runner stats URL
    getRunnerStatsUrl(runner) {
      if (runner.runner_id) {
        return `runner-stats.html?runner=${runner.runner_id}`;
      }
      return null;
    },

    loadResultsForYear() {
      this.isLoading = true;
      fetch(`results/${this.selectedYear}.json`)
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
              chip_time: runner["Chip Time"] || '',
              gun_time: this.showGunTime ? runner["Gun Time"] || '' : null,
              awards: runner.awards || [],
              highlight: runner.highlight || null,
              category_position: runner.category_position || null,
              gender_position: runner.gender_position || null,
              runner_id: runner.runner_id || null
            };
          }).filter(runner => runner !== null);
          this.isLoading = false;

          // Scroll to highlighted position if specified
          if (this.highlightPosition) {
            this.$nextTick(() => {
              this.scrollToPosition(this.highlightPosition);
            });
          }
        })
        .catch(error => {
          console.error(`Error loading results for ${this.selectedYear}:`, error);
          this.results = [];
          this.isLoading = false;
        });
    },

    scrollToPosition(position) {
      // Find the row with this position
      const rows = document.querySelectorAll('.results-table tbody tr');
      const targetRow = Array.from(rows).find(row => {
        const posCell = row.querySelector('td[data-label="Pos."]');
        return posCell && parseInt(posCell.textContent) === position;
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
      let filtered = this.results;

      // Apply female-only filter
      if (this.femaleOnly) {
        filtered = filtered.filter(runner =>
          runner.age_group && runner.age_group.toUpperCase().startsWith('F')
        );

        // Recalculate positions for female-only results
        filtered = filtered.map((runner, index) => ({
          ...runner,
          position: index + 1
        }));
      }

      // Apply search filter
      if (!this.searchTerm.trim()) {
        return filtered;
      }

      const term = this.searchTerm.toLowerCase().trim();

      return filtered.filter(runner => {
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
