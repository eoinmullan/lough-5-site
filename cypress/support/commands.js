// Custom Cypress commands for the Lough 5 website

/**
 * Check if navigation links work correctly
 */
Cypress.Commands.add('checkNavigation', () => {
  cy.get('nav').should('be.visible')
  cy.get('nav a').should('have.length.at.least', 4)
})

/**
 * Wait for Alpine.js to be loaded and initialized
 */
Cypress.Commands.add('waitForAlpine', () => {
  cy.window().should('have.property', 'Alpine')
})
