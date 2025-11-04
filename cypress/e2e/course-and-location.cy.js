describe('Course and Location Pages - Smoke Tests', () => {
  describe('Course Page', () => {
    beforeEach(() => {
      cy.visit('/course.html')
    })

    it('should load the course page successfully', () => {
      cy.get('section.course-section').should('be.visible')
      cy.get('title').should('contain', 'Course')
    })

    it('should display navigation menu', () => {
      cy.get('nav.navbar').should('be.visible')
      cy.get('nav.navbar a.current').should('contain', 'Course')
    })

    it('should display course map iframe', () => {
      cy.get('iframe', { timeout: 10000 }).should('be.visible')
    })

    it('should have PlotARoute embed in iframe', () => {
      cy.get('iframe').should('have.attr', 'src')
        .and('include', 'plotaroute.com')
    })

    it('should have container for map', () => {
      cy.get('.container').should('be.visible')
      cy.get('iframe.course-iframe').should('be.visible')
    })

    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x')
      cy.get('iframe').should('be.visible')
      cy.get('nav.navbar').should('be.visible')
    })

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2')
      cy.get('iframe').should('be.visible')
    })

    it('should navigate to other pages', () => {
      cy.get('nav.navbar a').contains('Home').click()
      cy.url().should('include', 'index.html')
    })
  })

  describe('Location Page', () => {
    beforeEach(() => {
      cy.visit('/location.html')
    })

    it('should load the location page successfully', () => {
      cy.get('section.location-section').should('be.visible')
      cy.get('title').should('contain', 'Location')
    })

    it('should display navigation menu', () => {
      cy.get('nav.navbar').should('be.visible')
      cy.get('nav.navbar a.current').should('contain', 'Location')
    })

    it('should display Google Maps iframe', () => {
      cy.get('iframe', { timeout: 10000 }).should('be.visible')
    })

    it('should have Google Maps embed in iframe', () => {
      cy.get('iframe').should('have.attr', 'src')
        .and('include', 'google.com/maps')
    })

    it('should have map pointing to Loughmacrory coordinates', () => {
      cy.get('iframe').should('have.attr', 'src')
        .and('match', /54\.626|7\.105/)
    })

    it('should have container for map', () => {
      cy.get('.container').should('be.visible')
      cy.get('iframe.location-iframe').should('be.visible')
    })

    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x')
      cy.get('iframe').should('be.visible')
      cy.get('nav.navbar').should('be.visible')
    })

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2')
      cy.get('iframe').should('be.visible')
    })

    it('should navigate to other pages', () => {
      cy.get('nav.navbar a').contains('Home').click()
      cy.url().should('include', 'index.html')
    })
  })

  describe('Navigation Between Map Pages', () => {
    it('should navigate from location to course', () => {
      cy.visit('/location.html')
      cy.get('nav.navbar a').contains('Course').click()
      cy.url().should('include', 'course.html')
      cy.get('iframe').should('be.visible')
    })

    it('should navigate from course to location', () => {
      cy.visit('/course.html')
      cy.get('nav.navbar a').contains('Location').click()
      cy.url().should('include', 'location.html')
      cy.get('iframe').should('be.visible')
    })
  })
})
