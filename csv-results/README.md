The results files in here are exported as csvs from Herbie's xlsx. Note, they're not necessarily the source of truth as updates will typically be made to the .json file that's created.

To use:
- Export Herbie's results here, exclude the top (title) row and any superfluous data.
- Fix categories if Herbie has set top 3 to Open
- node scripts/csv-to-json.js csv-results/2025.csv assets/results/2025.json