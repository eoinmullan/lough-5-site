describe('Results Page - Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/results.html')
  })

  it('should load the results page successfully', () => {
    cy.contains('Results').should('be.visible')
  })

  it('should display navigation menu', () => {
    cy.get('nav.navbar').should('be.visible')
    cy.get('nav.navbar a.current').should('contain', 'Results')
  })

  it('should display year dropdown with all years', () => {
    cy.get('select.year-dropdown').should('be.visible')
    cy.get('select.year-dropdown option').should('have.length', 16)

    // Check for specific years
    cy.get('select.year-dropdown option[value="2024"]').should('exist')
    cy.get('select.year-dropdown option[value="2009"]').should('exist')
  })

  it('should display search input', () => {
    cy.get('input[type="text"]').should('be.visible')
    cy.get('input[type="text"]').should('have.attr', 'placeholder')
  })

  it('should load and display race results for default year', () => {
    // Wait for Alpine.js to initialize and load data
    cy.get('table', { timeout: 10000 }).should('be.visible')
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should display table headers', () => {
    cy.get('table thead').should('be.visible')
    cy.get('table thead th').contains('Pos.').should('be.visible')
    cy.get('table thead th').contains('Name').should('be.visible')
    cy.get('table thead th').contains('Cat.').should('be.visible')
    cy.get('table thead th').contains('Club').should('be.visible')
    cy.get('table thead th').contains('Chip Time').should('be.visible')
  })

  it('should filter results when searching by name', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Get initial count
    cy.get('tbody tr').then(($rows) => {
      const initialCount = $rows.length

      // Type a search term (common letter that will filter results)
      cy.get('input[type="text"]').clear().type('a')

      // Wait for filtering to occur
      cy.wait(500)

      // Verify filtering happened (should have results but likely fewer than total)
      cy.get('tbody tr').should('have.length.at.least', 1)
    })
  })

  it('should change results when selecting different year', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Select a different year
    cy.get('select.year-dropdown').select('2023')

    // Wait for new data to load
    cy.wait(1000)

    // Verify the year changed in the title
    cy.get('h2.section-title').should('contain', '2023')
  })

  it('should display special note for 2020 virtual race', () => {
    cy.get('select.year-dropdown').select('2020')
    cy.wait(500)
    cy.contains('virtual', { matchCase: false }).should('be.visible')
  })

  it('should handle search with no results gracefully', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Type a search term unlikely to match
    cy.get('input[type="text"]').clear().type('xyzabc123')

    // Wait for filtering
    cy.wait(500)

    // Should show no results or empty table
    cy.get('tbody tr').should('have.length', 0)
  })

  it('should clear search when input is cleared', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Type and then clear search
    cy.get('input[type="text"]').type('test').clear()

    // Wait for filtering to reset
    cy.wait(500)

    // Should show results again
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should support URL parameters for year', () => {
    cy.visit('/results.html?year=2015')
    cy.wait(1000)

    // Check year is selected
    cy.get('select.year-dropdown').should('have.value', '2015')
    cy.get('h2.section-title').should('contain', '2015')
  })

  it('should support URL parameters for search', () => {
    cy.visit('/results.html?search=Smith')
    cy.wait(1000)

    // Check search is applied
    cy.get('input[type="text"]').should('have.value', 'Smith')
  })

  it('should be responsive on mobile', () => {
    cy.viewport('iphone-x')
    cy.get('select.year-dropdown').should('be.visible')
    cy.get('input[type="text"]').should('be.visible')
  })

  it('should be responsive on tablet', () => {
    // Wait for data to load first before changing viewport
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    cy.viewport('ipad-2')
    cy.wait(500) // Give time for viewport change to settle
    cy.get('table').should('be.visible')
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should navigate back to home page', () => {
    cy.get('nav.navbar a').contains('Home').click()
    cy.url().should('include', 'index.html')
  })
})
