/**
 * Tracks email processing in session statistics.
 * @param {Object} analysis - The AI analysis results
 * @returns {void}
 */
function trackEmailProcessing(analysis) {
  const sessionKey = "PROCESSING_SESSION_STATS";
  let stats = JSON.parse(getSecret(sessionKey) || "{}");

  // Initialize if not exists
  if (!stats.processed) {
    stats = {
      processed: 0,
      by_category: {},
      by_priority: {},
    };
  }

  // Increment processed count
  stats.processed++;

  // Track by category
  analysis.categories.forEach((category) => {
    const categoryName = CONFIG.LABELS[category]?.name || category;
    stats.by_category[categoryName] =
      (stats.by_category[categoryName] || 0) + 1;
  });

  // Track by priority
  const quadrant = analysis.eisenhower_quadrant;
  stats.by_priority[quadrant] = (stats.by_priority[quadrant] || 0) + 1;

  // Save updated stats
  setSecret(sessionKey, JSON.stringify(stats));
}

/**
 * Gets current session statistics.
 * @returns {Object|null} Session statistics or null if none
 */
function getSessionStatistics() {
  const sessionKey = "PROCESSING_SESSION_STATS";
  const stats = getSecret(sessionKey);
  return stats ? JSON.parse(stats) : null;
}

/**
 * Clears session statistics.
 * @returns {void}
 */
function clearSessionStatistics() {
  const sessionKey = "PROCESSING_SESSION_STATS";
  setSecret(sessionKey, "");
  console.log("🧹 Session statistics cleared");
}

/**
 * Shows current session statistics.
 * @returns {void}
 */
function showSessionStatistics() {
  const stats = getSessionStatistics();
  if (stats && stats.processed > 0) {
    console.log("📊 Current Session Statistics:");
    console.log(`   Processed: ${stats.processed} emails`);
    console.log("   By Category:", JSON.stringify(stats.by_category, null, 2));
    console.log("   By Priority:", JSON.stringify(stats.by_priority, null, 2));
  } else {
    console.log("📊 No session statistics available");
  }
}
