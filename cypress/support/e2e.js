// Cypress support file for e2e tests
// This file runs before every single spec file

// Import commands.js
import './commands'

// Prevent Cypress from failing tests on uncaught exceptions
// This is useful for third-party scripts that might throw errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // useful for ignoring errors from third-party scripts like maps
  if (err.message.includes('Script error')) {
    return false
  }
  // Ignore viewport/popup notification errors during testing
  if (err.message.includes('checkPopupNotification') || err.message.includes('is not a function')) {
    return false
  }
  // we still want to ensure there are no other unexpected errors
  return true
})
