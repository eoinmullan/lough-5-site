describe('Home Page - Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the home page successfully', () => {
    cy.get('h1').should('contain', 'Lough 5 Road Race')
  })

  it('should display navigation menu with all links', () => {
    cy.get('nav.navbar').should('be.visible')
    cy.get('nav.navbar a').should('have.length', 5)

    // Check all navigation links are present
    cy.get('nav.navbar a').contains('Home').should('be.visible')
    cy.get('nav.navbar a').contains('Results').should('be.visible')
    cy.get('nav.navbar a').contains('Records').should('be.visible')
    cy.get('nav.navbar a').contains('Location').should('be.visible')
    cy.get('nav.navbar a').contains('Course').should('be.visible')
  })

  it('should have the current page highlighted in navigation', () => {
    cy.get('nav.navbar a.current').should('contain', 'Home')
  })

  it('should display registration button', () => {
    cy.get('a.btn').should('be.visible')
    cy.get('a.btn').should('contain', 'Enter Now')
    cy.get('a.btn').should('have.attr', 'href').and('include', 'njuko.com')
  })

  it('should display race information section', () => {
    cy.contains('About the Race').should('be.visible')
    cy.contains('5 Mile Race').should('be.visible')
    cy.contains('December 31st').should('be.visible')
    cy.contains('Loughmacrory').should('be.visible')
  })

  it('should display male and female records', () => {
    cy.contains('Male Record').should('be.visible')
    cy.contains('Female Record').should('be.visible')
    cy.contains('Mark McKinstry').should('be.visible')
    cy.contains('Ciara Mageean').should('be.visible')
  })

  it('should display kids fun run information', () => {
    cy.contains('Kids Fun Run').should('be.visible')
  })

  it('should display race day schedule', () => {
    cy.contains('Race Day').should('be.visible')
  })

  it('should display charity information', () => {
    cy.contains('Charity').should('be.visible')
  })

  it('should have Facebook link', () => {
    cy.get('a[href*="facebook.com"]').should('be.visible')
    cy.get('a[href*="facebook.com"]').should('have.attr', 'href').and('include', 'lough5run')
  })

  it('should be responsive', () => {
    // Test mobile viewport
    cy.viewport('iphone-x')
    cy.get('h1').should('be.visible')
    cy.get('nav.navbar').should('be.visible')

    // Test tablet viewport
    cy.viewport('ipad-2')
    cy.get('h1').should('be.visible')
    cy.get('nav.navbar').should('be.visible')

    // Test desktop viewport
    cy.viewport(1920, 1080)
    cy.get('h1').should('be.visible')
    cy.get('nav.navbar').should('be.visible')
  })

  it('should navigate to results page', () => {
    cy.get('nav.navbar a').contains('Results').click()
    cy.url().should('include', 'results.html')
  })

  it('should navigate to records page', () => {
    cy.get('nav.navbar a').contains('Records').click()
    cy.url().should('include', 'records.html')
  })
})
