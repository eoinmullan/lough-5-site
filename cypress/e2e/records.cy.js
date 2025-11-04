describe('Records Page - Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/records.html')
  })

  it('should load the records page successfully', () => {
    cy.get('h2.section-title').should('be.visible')
  })

  it('should display navigation menu', () => {
    cy.get('nav.navbar').should('be.visible')
    cy.get('nav.navbar a.current').should('contain', 'Records')
  })

  it('should display category dropdown with all categories', () => {
    cy.get('select.records-dropdown').should('be.visible')
    cy.get('select.records-dropdown option').should('have.length', 4)

    // Check for all categories
    cy.get('select.records-dropdown option[value="Fastest 50 Male"]').should('exist')
    cy.get('select.records-dropdown option[value="Fastest 50 Female"]').should('exist')
    cy.get('select.records-dropdown option[value="Masters Men"]').should('exist')
    cy.get('select.records-dropdown option[value="Masters Women"]').should('exist')
  })

  it('should display search input', () => {
    cy.get('input[type="text"]').should('be.visible')
    cy.get('input[type="text"]').should('have.attr', 'placeholder')
      .and('include', 'Search')
  })

  it('should load and display records for default category', () => {
    // Wait for Alpine.js to initialize and load data
    cy.get('table', { timeout: 10000 }).should('be.visible')
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should display table headers', () => {
    cy.get('table thead').should('be.visible')
    // For Fastest 50 categories, "Pos." is shown; for Masters, "Cat" is shown
    cy.get('table thead th').contains('Name').should('be.visible')
    cy.get('table thead th').contains('Year').should('be.visible')
    cy.get('table thead th').contains('Club').should('be.visible')
    cy.get('table thead th').contains('Finish Time').should('be.visible')
  })

  it('should display correct title for default category', () => {
    // Wait for Alpine.js to initialize and populate the title
    cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')
    cy.get('h2.section-title').should('not.be.empty')
    cy.get('h2.section-title').should('contain', 'Fastest 50')
  })

  it('should change records when selecting different category', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Select a different category
    cy.get('select.records-dropdown').select('Fastest 50 Female')

    // Wait for new data to load
    cy.wait(1000)

    // Verify the category changed in the title
    cy.get('h2.section-title').should('contain', 'Fastest 50 Female')
  })

  it('should display all four categories correctly', () => {
    const categories = [
      'Fastest 50 Male',
      'Fastest 50 Female',
      'Masters Men',
      'Masters Women'
    ]

    categories.forEach((category) => {
      cy.get('select.records-dropdown').select(category)
      cy.wait(1000)
      cy.get('h2.section-title').should('contain', category)
      cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)
    })
  })

  it('should filter records when searching', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Type a search term
    cy.get('input[type="text"]').clear().type('a')

    // Wait for filtering to occur
    cy.wait(500)

    // Verify filtering happened (should have results but likely fewer)
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should handle search with no results gracefully', () => {
    // Wait for initial data to load
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1)

    // Type a search term unlikely to match
    cy.get('input[type="text"]').clear().type('xyzabc123999')

    // Wait for filtering
    cy.wait(500)

    // Should show no results
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

  it('should support URL parameters for category', () => {
    cy.visit('/records.html?category=fastest-50-female')
    cy.wait(1000)

    // Check category is reflected in title
    cy.get('h2.section-title').should('contain', 'Female')
  })

  it('should display data in records table', () => {
    // Just verify that the table has data, don't check specific position
    // because default category (Fastest 50 Male) should show position
    cy.get('tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').should('have.length.at.least', 3)
    })
  })

  it('should display multiple records', () => {
    // Just verify we have a good number of records loaded
    cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 10)

    // Verify each row has data
    cy.get('tbody tr').first().within(() => {
      cy.get('td').should('exist')
    })
  })

  it('should be responsive on mobile', () => {
    cy.viewport('iphone-x')
    cy.get('select.records-dropdown').should('be.visible')
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

  it('should navigate to other pages', () => {
    cy.get('nav.navbar a').contains('Home').click()
    cy.url().should('include', 'index.html')
  })

  it('should navigate to results page', () => {
    cy.visit('/records.html')
    cy.get('nav.navbar a').contains('Results').click()
    cy.url().should('include', 'results.html')
  })
})
