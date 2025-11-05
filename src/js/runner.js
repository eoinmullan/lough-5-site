import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function runnerSearchPage() {
  return {
    searchTerm: '',
    runners: {},
    isLoading: true,

    init() {
      this.loadRunners();
    },

    loadRunners() {
      this.isLoading = true;
      fetch('assets/runner-database.json')
        .then(response => response.json())
        .then(data => {
          this.runners = data.runners;
          this.isLoading = false;
        })
        .catch(error => {
          console.error('Error loading runner database:', error);
          this.runners = {};
          this.isLoading = false;
        });
    },

    get filteredResults() {
      // Only show results if 3+ characters entered
      if (!this.searchTerm.trim() || this.searchTerm.trim().length < 3) {
        return [];
      }

      const term = this.searchTerm.toLowerCase().trim();

      // Convert runners object to array and filter
      return Object.values(this.runners).filter(runner => {
        return (
          (runner.canonical_name && runner.canonical_name.toLowerCase().includes(term)) ||
          (runner.most_common_club && runner.most_common_club.toLowerCase().includes(term))
        );
      });
    },

    formatYears(years) {
      if (!years || years.length === 0) return '';
      if (years.length === 1) return years[0].toString();
      return `${years[0]}-${years[years.length - 1]}`;
    },

    navigateToRunner(runnerId) {
      window.location.href = `runner-stats.html?runner=${runnerId}`;
    }
  };
}

export function runnerStatsPage() {
  return {
    runner: null,
    isLoading: true,
    error: null,
    chart: null,

    init() {
      // Get runner_id from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const runnerId = urlParams.get('runner');

      if (!runnerId) {
        this.error = 'No runner specified in URL.';
        this.isLoading = false;
        return;
      }

      this.loadRunnerStats(runnerId);
    },

    loadRunnerStats(runnerId) {
      this.isLoading = true;
      fetch(`assets/runner-stats/${runnerId}.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Runner not found');
          }
          return response.json();
        })
        .then(data => {
          this.runner = data;
          this.isLoading = false;

          // Create chart after data is loaded and DOM is ready
          this.$nextTick(() => {
            if (this.runner.results.length > 1) {
              this.createPerformanceChart();
            }
          });
        })
        .catch(error => {
          console.error('Error loading runner stats:', error);
          this.error = 'Runner not found. Please check the URL or search for another runner.';
          this.isLoading = false;
        });
    },

    timeToSeconds(timeStr) {
      if (!timeStr) return null;

      // Remove any decimals or commas
      timeStr = timeStr.replace(/\.\d+/, '').replace(/,\d+/, '');

      const parts = timeStr.split(':');
      if (parts.length === 2) {
        // Format: "MM:SS"
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
        // Format: "H:MM:SS"
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
      return null;
    },

    secondsToTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    createPerformanceChart() {
      const ctx = document.getElementById('performanceChart');
      if (!ctx) return;

      // Destroy existing chart if it exists
      if (this.chart) {
        this.chart.destroy();
      }

      // Create a map of year -> time
      const yearTimeMap = {};
      this.runner.results.forEach(r => {
        yearTimeMap[r.year] = this.timeToSeconds(r.chip_time);
      });

      // Generate all years from first to last
      const years = this.runner.results.map(r => r.year).sort((a, b) => a - b);
      const firstYear = years[0];
      const lastYear = years[years.length - 1];

      const allYears = [];
      const times = [];

      for (let year = firstYear; year <= lastYear; year++) {
        allYears.push(year);
        // Add time if runner participated that year, otherwise null
        times.push(yearTimeMap[year] || null);
      }

      // Create chart
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: allYears,
          datasets: [{
            label: 'Finish Time',
            data: times,
            borderColor: 'rgba(255, 202, 40, 0.8)',
            backgroundColor: 'rgba(255, 202, 40, 0.2)',
            tension: 0.1,
            pointRadius: 5,
            pointHoverRadius: 7,
            spanGaps: true, // Don't connect points with null values between them
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  if (context.parsed.y === null) return null;
                  return 'Time: ' + this.secondsToTime(context.parsed.y);
                }
              }
            }
          },
          scales: {
            y: {
              reverse: true, // Lower times (faster) at the top
              ticks: {
                callback: (value) => {
                  // Round to whole seconds to avoid decimal precision issues
                  return this.secondsToTime(Math.round(value));
                },
                stepSize: 1, // Force 1 second steps as minimum
                precision: 0 // No decimal places
              },
              title: {
                display: true,
                text: 'Finish Time'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Year'
              }
            }
          }
        }
      });
    },

    formatYearsActive(yearsActive) {
      if (!yearsActive) return 'N/A';
      if (yearsActive.first === yearsActive.last) {
        return yearsActive.first.toString();
      }
      return `${yearsActive.first}-${yearsActive.last}`;
    },

    hasBadges() {
      if (!this.runner || !this.runner.badges) return false;

      return (
        this.runner.badges.fastest_all_time ||
        (this.runner.badges.overall_podiums && this.runner.badges.overall_podiums.length > 0) ||
        (this.runner.badges.category_podiums && this.runner.badges.category_podiums.length > 0) ||
        (this.runner.badges.age_group_records && this.runner.badges.age_group_records.length > 0)
      );
    },

    getOrdinal(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
  };
}
