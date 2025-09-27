/**
 * Sends error notification via email to the user.
 * @param {string} error - The error message to send
 * @returns {void}
 */
function sendErrorNotification(error) {
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    "❌ Error in Gmail Automation System",
    `An error occurred:\n\n${error}\n\n${new Date()}`
  );
}
