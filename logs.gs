/**
 * Logs processed email information for tracking and debugging.
 * @param {Object} emailData - The email data object
 * @param {Object} analysis - The AI analysis results
 * @returns {void}
 */
function logProcessedEmail(emailData, analysis) {
  const categoriesStr = analysis.categories
    .map((cat) => CONFIG.LABELS[cat]?.name || cat)
    .join(" + ");
  console.log(
    `✅ Processed: ${emailData.subject} -> [${categoriesStr}] (${analysis.eisenhower_quadrant})`
  );

  // Track in session statistics
  trackEmailProcessing(analysis);
}
