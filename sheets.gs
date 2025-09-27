/**
 * Generates a processing report with email statistics.
 * @returns {Object} Report object with processing statistics
 */
function generateProcessingReport() {
  console.log("📊 Starting generateProcessingReport...");

  const today = new Date();
  const report = {
    date: today.toISOString().split("T")[0],
    processed: 0,
    by_category: {},
    by_priority: {},
  };

  console.log("📊 Initial report object:", report);

  // Get session statistics from PropertiesService
  console.log("📊 Getting session statistics...");
  const sessionStats = getSessionStatistics();
  console.log("📊 Session stats:", sessionStats);

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

  // Note: Daily report emails are sent via scheduled trigger, not after every processing session
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

/**
 * Retrieves processing report from Google Sheets for a specific date.
 * @param {string} date - The date to retrieve report for (YYYY-MM-DD format)
 * @returns {Object} Report object with processing statistics
 */
function getReportFromSheets(date) {
  try {
    const spreadsheetId = getSecret("SPREADSHEET_ID");
    if (!spreadsheetId) {
      console.log("📊 No spreadsheet ID found, using empty report");
      return {
        date: date,
        processed: 0,
        by_category: {},
        by_priority: {},
      };
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getActiveSheet();

    if (!sheet) {
      console.log("📊 No active sheet found, using empty report");
      return {
        date: date,
        processed: 0,
        by_category: {},
        by_priority: {},
      };
    }

    const data = sheet.getDataRange().getValues();
    console.log(`📊 Total rows in sheet: ${data.length}`);
    console.log(`📊 Last few rows:`, data.slice(-3));

    // Get the LAST row (most recent data)
    const lastRow = data[data.length - 1];
    console.log(`📊 Last row data:`, lastRow);
    const lastRowDate = lastRow[0];
    const lastRowDateString =
      lastRowDate instanceof Date
        ? `${lastRowDate.getFullYear()}-${String(
            lastRowDate.getMonth() + 1
          ).padStart(2, "0")}-${String(lastRowDate.getDate()).padStart(2, "0")}`
        : lastRowDate;

    // Check if last row is from today
    console.log(
      `📊 Comparing dates: lastRowDateString="${lastRowDateString}" vs date="${date}"`
    );
    if (lastRowDateString !== date) {
      console.log(
        `📊 Last row date (${lastRowDateString}) is not today (${date}), not sending email`
      );
      return null;
    }

    return {
      date: lastRow[0],
      processed: lastRow[1],
      by_category: JSON.parse(lastRow[2] || "{}"),
      by_priority: JSON.parse(lastRow[3] || "{}"),
    };
  } catch (error) {
    console.error("❌ Error retrieving report from sheets:", error);
    return {
      date: date,
      processed: 0,
      by_category: {},
      by_priority: {},
    };
  }
}
