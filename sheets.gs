/**
 * Generates a processing report with email statistics.
 * @returns {Object} Report object with processing statistics
 */
function generateProcessingReport() {
  const today = new Date();
  const report = {
    date: today.toISOString().split("T")[0],
    processed: 0,
    by_category: {},
    by_priority: {},
  };

  // Get session statistics from PropertiesService
  const sessionStats = getSessionStatistics();

  // Use session statistics if available, otherwise fall back to label counts
  if (sessionStats && sessionStats.processed > 0) {
    report.processed = sessionStats.processed;
    report.by_category = sessionStats.by_category || {};
    report.by_priority = sessionStats.by_priority || {};
    console.log("📊 Using session statistics for report");
  } else {
    // Fallback: Collect statistics by labels (total counts)
    console.log("📊 No session data found, using label counts");
    Object.values(CONFIG.LABELS).forEach((config) => {
      try {
        const label = GmailApp.getUserLabelByName(config.name);
        if (label) {
          const count = label.getThreads(0, 1000).length;
          report.by_category[config.name] = count;
          report.processed += count;
        }
      } catch (e) {}
    });
  }

  console.log("📊 Processing report:", JSON.stringify(report, null, 2));

  // Save report to Google Sheets (optional)
  saveReportToSheets(report);
}


/**
 * Saves the processing report to a Google Sheets spreadsheet.
 * @param {Object} report - The processing report to save
 * @returns {void}
 */
function saveReportToSheets(report) {
  try {
    // Get or create statistics spreadsheet
    let spreadsheet;
    const spreadsheetId = getSecret("SPREADSHEET_ID");

    if (spreadsheetId) {
      try {
        spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      } catch (error) {
        console.warn("⚠️ Could not open spreadsheet by ID, creating new one");
        spreadsheet = SpreadsheetApp.create("Gmail Automation Stats");
        setSecret("SPREADSHEET_ID", spreadsheet.getId());
        console.log(
          `📊 Created new statistics spreadsheet: ${spreadsheet.getUrl()}`
        );
      }
    } else {
      spreadsheet = SpreadsheetApp.create("Gmail Automation Stats");
      setSecret("SPREADSHEET_ID", spreadsheet.getId());
      console.log(`📊 Created statistics spreadsheet: ${spreadsheet.getUrl()}`);
    }

    const sheet = spreadsheet.getActiveSheet();

    // Add row with data
    sheet.appendRow([
      report.date,
      report.processed,
      JSON.stringify(report.by_category),
      JSON.stringify(report.by_priority),
    ]);
  } catch (error) {
    console.error("❌ Error saving report:", error);
  }
}
