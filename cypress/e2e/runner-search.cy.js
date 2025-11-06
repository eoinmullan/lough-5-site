describe('Runner Search and Stats Pages - Smoke Tests', () => {
  describe('Runner Search Page', () => {
    beforeEach(() => {
      cy.visit('/runner-search.html')
    })

    it('should load the runner search page successfully', () => {
      cy.get('h2.section-title').should('contain', 'Runner Search')
    })

    it('should display navigation menu', () => {
      cy.get('nav.navbar').should('be.visible')
      cy.get('nav.navbar a').should('have.length', 5)
    })

    it('should display search input', () => {
      cy.get('input.search-input').should('be.visible')
      cy.get('input.search-input').should('have.attr', 'placeholder').and('include', 'Search by name or club')
    })

    it('should show message when less than 3 characters entered', () => {
      cy.get('input.search-input').type('ab')
      cy.contains('Please enter at least 3 characters to search').should('be.visible')
    })

    it('should display search results when 3+ characters entered', () => {
      // Wait for the runner database to load
      cy.get('input.search-input').type('mul')

      // Should show table with results
      cy.get('.table-container table').should('be.visible')
      cy.get('thead th').contains('Name').should('be.visible')
      cy.get('thead th').contains('Club').should('be.visible')
      cy.get('thead th').contains('Years').should('be.visible')
    })

    it('should filter results by name', () => {
      cy.get('input.search-input').type('eoin mullan')
      cy.get('tbody tr').should('have.length.at.least', 1)
      cy.get('tbody tr').first().should('contain', 'Eoin Mullan')
    })

    it('should show "no results" message for non-existent runner', () => {
      cy.get('input.search-input').type('zzzzzzzzz')
      cy.contains('No runners found').should('be.visible')
    })

    it('should navigate to runner stats page when clicking a result', () => {
      cy.get('input.search-input').type('eoin mullan')
      cy.get('tbody tr').first().click()
      cy.url().should('include', 'runner-stats.html?runner=')
    })

    it('should be responsive', () => {
      // Test mobile viewport
      cy.viewport('iphone-x')
      cy.get('input.search-input').should('be.visible')

      // Test tablet viewport
      cy.viewport('ipad-2')
      cy.get('input.search-input').should('be.visible')

      // Test desktop viewport
      cy.viewport(1920, 1080)
      cy.get('input.search-input').should('be.visible')
    })
  })

  describe('Runner Stats Page', () => {
    beforeEach(() => {
      // Visit runner stats page with a known runner ID
      cy.visit('/runner-stats.html?runner=eoin-mullan')
      // Wait for content to load by checking for the runner name
      cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')
    })

    it('should load the runner stats page successfully', () => {
      cy.get('h2.section-title', { timeout: 10000 }).should('contain', 'Eoin Mullan')
    })

    it('should display navigation menu', () => {
      cy.get('nav.navbar').should('be.visible')
      cy.get('nav.navbar a').should('have.length', 5)
    })

    it('should display runner club name', () => {
      cy.contains('Omagh Harriers', { timeout: 10000 }).should('be.visible')
    })

    it('should display career statistics section', () => {
      cy.contains('Career Statistics', { timeout: 10000 }).should('be.visible')
      cy.contains('Total Races').should('be.visible')
      cy.contains('Best Time').should('be.visible')
      cy.contains('Best Position').should('be.visible')
      cy.contains('Years Active').should('be.visible')
    })

    it('should display achievements section if runner has badges', () => {
      // Wait for page to load
      cy.wait(1000)
      // This runner should have some achievements
      cy.get('body').then(($body) => {
        if ($body.text().includes('Achievements')) {
          cy.contains('Achievements').should('be.visible')
        }
      })
    })

    it('should display race history table', () => {
      cy.contains('Race History', { timeout: 10000 }).should('be.visible')
      cy.get('.table-container table').should('be.visible')
      cy.get('thead th').contains('Year').should('be.visible')
      cy.get('thead th').contains('Pos.').should('be.visible')
      cy.get('thead th').contains('Category').should('be.visible')
      cy.get('thead th').contains('Time').should('be.visible')
    })

    it('should display performance graph for runners with multiple races', () => {
      // Wait for page to load
      cy.wait(1000)
      // Check if the performance chart canvas exists (only for runners with 2+ races)
      cy.get('body').then(($body) => {
        if ($body.find('#performanceChart').length > 0) {
          cy.get('#performanceChart').should('be.visible')
          cy.contains('Performance Over Time').should('be.visible')
        }
      })
    })

    it('should display "Back to Search" button', () => {
      cy.get('a.btn.btn-secondary', { timeout: 10000 }).contains('Back to Search').should('be.visible')
      cy.get('a.btn.btn-secondary').contains('Back to Search').should('have.attr', 'href', 'runner-search.html')
    })

    it('should navigate back to search page when clicking back button', () => {
      cy.get('a.btn.btn-secondary', { timeout: 10000 }).contains('Back to Search').click()
      cy.url().should('include', 'runner-search.html')
    })

    it('should show error message for non-existent runner', () => {
      cy.visit('/runner-stats.html?runner=non-existent-runner-xyz')
      cy.contains('Runner Not Found').should('be.visible')
    })

    it('should show error message when no runner parameter provided', () => {
      cy.visit('/runner-stats.html')
      cy.contains('Runner Not Found').should('be.visible')
    })

    it('should be responsive', () => {
      // Test mobile viewport
      cy.viewport('iphone-x')
      cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')
      cy.contains('Career Statistics', { timeout: 10000 }).should('be.visible')

      // Test tablet viewport
      cy.viewport('ipad-2')
      cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')
      cy.contains('Career Statistics', { timeout: 10000 }).should('be.visible')

      // Test desktop viewport
      cy.viewport(1920, 1080)
      cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')
      cy.contains('Career Statistics', { timeout: 10000 }).should('be.visible')
    })
  })

  describe('Integration: Search to Stats Flow', () => {
    it('should complete full search-to-stats journey', () => {
      // Start on search page
      cy.visit('/runner-search.html')

      // Search for a runner
      cy.get('input.search-input').type('mullan')
      cy.get('tbody tr').should('have.length.at.least', 1)

      // Click on first result
      cy.get('tbody tr').first().click()

      // Should be on stats page - wait for content to load
      cy.url().should('include', 'runner-stats.html?runner=')
      cy.get('h2.section-title', { timeout: 10000 }).should('be.visible')

      // Should show career statistics
      cy.contains('Career Statistics', { timeout: 10000 }).should('be.visible')

      // Go back to search
      cy.get('a.btn.btn-secondary', { timeout: 10000 }).contains('Back to Search').click()
      cy.url().should('include', 'runner-search.html')
    })
  })
})
