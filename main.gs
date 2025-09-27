// Gmail Automation + Eisenhower Matrix + ChatGPT
// Automatic sorting of all life areas by importance and urgency

/**
 * Processes emails with configurable mode (batch or real-time).
 * This is the unified email processing function that handles both batch and real-time processing.
 * @param {string} mode - Processing mode: 'batch' for historical emails, 'realtime' for new emails
 * @returns {void}
 */
function processEmails(mode = "batch") {
  try {
    console.log(`🚀 Starting smart email processing (${mode} mode)...`);

    // Validate system before processing
    if (!validateSystem()) {
      console.error("❌ System validation failed. Please check configuration.");
      return;
    }

    let threads;
    let searchQuery;

    if (mode === "realtime") {
      // Real-time processing: only unread emails not already processed
      searchQuery = "in:inbox";
      try {
        const processedLabelName = CONFIG.LABELS.PROCESSED.name;
        const processedLabel = GmailApp.getUserLabelByName(processedLabelName);
        if (processedLabel) {
          // Use proper Gmail search syntax to exclude processed emails
          // Gmail search requires quotes around label names with spaces/special chars
          searchQuery += ` -label:"${processedLabelName}"`;
          console.log(
            `🔍 Excluding processed emails with label: ${processedLabelName}`
          );
        }
      } catch (e) {
        console.log("📋 PROCESSED label doesn't exist yet, using basic search");
      }
      console.log(`🔍 Real-time search query: ${searchQuery}`);
      threads = GmailApp.search(searchQuery, 0, CONFIG.BATCH_SIZE);
    } else {
      // Batch processing: only unprocessed emails
      searchQuery = "in:inbox";
      try {
        const processedLabelName = CONFIG.LABELS.PROCESSED.name;
        const processedLabel = GmailApp.getUserLabelByName(processedLabelName);
        if (processedLabel) {
          // Use proper Gmail search syntax to exclude processed emails
          // Gmail search requires quotes around label names with spaces/special chars
          searchQuery += ` -label:"${processedLabelName}"`;
          console.log(
            `🔍 Excluding processed emails with label: ${processedLabelName}`
          );
        }
      } catch (e) {
        console.log("📋 PROCESSED label doesn't exist yet, using basic search");
      }
      console.log(`🔍 Batch search query: ${searchQuery}`);
      threads = GmailApp.search(searchQuery, 0, 50);
    }

    if (threads.length === 0) {
      console.log("📧 No emails to process");
      return;
    }

    console.log(`📧 Found ${threads.length} emails to process`);

    for (let thread of threads) {
      if (!thread.hasStarredMessages()) {
        // Check if email is already processed before processing
        const processedLabelName = CONFIG.LABELS.PROCESSED.name;
        const processedLabel = GmailApp.getUserLabelByName(processedLabelName);
        const isAlreadyProcessed =
          processedLabel &&
          thread
            .getLabels()
            .some((label) => label.getName() === processedLabelName);

        if (isAlreadyProcessed) {
          console.log(
            `⏭️ Skipping already processed email: ${thread
              .getFirstMessageSubject()
              .substring(0, 50)}...`
          );
          continue;
        }

        // Process only unstarred emails
        processEmailThread(thread);

        // Mark as processed to avoid reprocessing
        console.log("🔍 Attempting to get/create PROCESSED label...");
        const processedLabelForMarking = getOrCreateLabel("PROCESSED");
        console.log(
          "🔍 PROCESSED label result:",
          processedLabelForMarking ? "SUCCESS" : "FAILED"
        );

        if (processedLabelForMarking) {
          thread.addLabel(processedLabelForMarking);
          console.log(
            `   ✓ Marked as processed: ${thread
              .getFirstMessageSubject()
              .substring(0, 50)}...`
          );
        } else {
          console.error("❌ Failed to get/create PROCESSED label");
        }

        Utilities.sleep(mode === "realtime" ? 1000 : 2000); // Shorter pause for real-time
      }
    }

    console.log("✅ Processing completed");
    // Note: Daily reports are generated via scheduled trigger, not after every processing session
  } catch (error) {
    console.error("❌ Error during processing:", error);
    sendErrorNotification(error.toString());
  }
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use processEmails('realtime') instead
 * @returns {void}
 */
function processNewEmails() {
  console.log(
    "⚠️ processNewEmails() is deprecated. Use processEmails('realtime') instead."
  );
  processEmails("realtime");
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use processEmails('batch') instead
 * @returns {void}
 */
function processLifeEmails() {
  console.log(
    "⚠️ processLifeEmails() is deprecated. Use processEmails('batch') instead."
  );
  processEmails("batch");
}

/**
 * Validates that all required system components are properly configured.
 * Checks API keys, Gmail access, and other prerequisites.
 * @returns {boolean} True if system is ready, false otherwise
 */
function validateSystem() {
  try {
    // Check if OpenAI API key is configured
    const apiKey = getSecret("OPENAI_API_KEY") || CONFIG.OPENAI_API_KEY;
    if (!apiKey || apiKey === "sk-your-openai-api-key-here") {
      console.error("❌ OpenAI API key not configured");
      return false;
    }

    // Check if Gmail access is available
    try {
      GmailApp.getInboxThreads(0, 1);
    } catch (error) {
      console.error("❌ Gmail access not available:", error);
      return false;
    }

    console.log("✅ System validation passed");
    return true;
  } catch (error) {
    console.error("❌ System validation error:", error);
    return false;
  }
}

/**
 * Main setup function that initializes the entire Gmail automation system.
 * Creates labels, sets up triggers, and configures date filtering.
 * @returns {void}
 */
function setup() {
  console.log("🏗️ Setting up Gmail automation system...");
  console.log("=".repeat(60));

  // Step 1: Initialize processing date (first run only)
  console.log("📅 Step 1: Initializing processing date...");
  initializeProcessingDate();

  // Step 2: Clean up any incorrect labels
  console.log("🧹 Step 2: Cleaning up incorrect labels...");
  cleanupIncorrectLabels();
  console.log("");

  // Step 3: Create all labels using hardcoded names
  console.log("🏗️ Step 3: Creating all labels with hardcoded prefixes...");

  // Create Eisenhower Matrix labels
  console.log("🎯 Creating Eisenhower Matrix labels...");
  Object.keys(CONFIG.EISENHOWER_MATRIX).forEach((key) => {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ ${label.getName()}`);
    } else {
      console.error(`  ❌ Failed: ${key}`);
    }
  });

  // Create ALL other labels
  console.log("🏷️ Creating all other labels...");
  Object.keys(CONFIG.LABELS).forEach((key) => {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ ${label.getName()}`);
    } else {
      console.error(`  ❌ Failed: ${key}`);
    }
  });

  console.log("");
  console.log("✅ All labels created with hardcoded prefixes");
  console.log(
    "📋 Labels will be automatically sorted by Gmail based on their hardcoded numbers"
  );

  // Step 4: Update label colors
  console.log("");
  console.log("🎨 Step 4: Updating label colors...");

  // Check if Gmail API is available
  const apiAvailable = checkGmailAPIStatus();
  if (apiAvailable) {
    const colorResult = updateLabelColors();
    if (colorResult.stopped) {
      console.log("⚠️ Color update stopped due to systematic error");
      console.log("📝 Fix the error and run updateLabelColors() again");
    }
  } else {
    console.log(
      "⚠️ Gmail API not available - colors will need to be set manually"
    );
    console.log("📝 Run showGmailAPISetupInstructions() for setup help");
  }

  // Step 5: Set up automatic triggers
  console.log("");
  console.log("⚙️ Step 5: Setting up automatic triggers...");
  setupAutoTriggers();

  console.log("");
  console.log("🎉 Setup completed successfully!");
}

/**
 * Completes the setup process with final configuration.
 * @returns {void}
 */
function completeSetup() {
  console.log("🚀 Starting complete setup...");

  // Step 1: Validate secrets
  if (!setupSecrets()) {
    console.error("❌ Setup failed: Secrets not configured");
    return false;
  }

  // Step 2: Validate system
  if (!validateSystem()) {
    console.error("❌ Setup failed: System validation failed");
    return false;
  }

  // Step 3: Setup labels and triggers
  setup();

  // Step 4: Test the system
  console.log("🧪 Testing system...");
  testLifeManagementSystem();

  console.log("✅ Complete setup finished successfully!");

  // Show current processing mode
  const { mode, realtime } = getCurrentProcessingMode();
  if (mode === "realtime" && realtime) {
    console.log(
      "⚡ The system will now process new emails in real-time (every 10 minutes)"
    );
  } else {
    console.log("⏰ The system will now process emails every 30 minutes");
  }

  return true;
}

/**
 * Sets up automatic triggers for email processing based on current mode.
 * @returns {void}
 */
function setupAutoTriggers() {
  // Remove old triggers
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Get processing mode from environment variable or config
  const processingMode = getSecret("PROCESSING_MODE") || CONFIG.PROCESSING_MODE;
  const realtimeEnabled =
    getSecret("REALTIME_ENABLED") || CONFIG.REALTIME_ENABLED;

  console.log(
    `🔧 Setting up triggers for mode: ${processingMode}, realtime: ${realtimeEnabled}`
  );

  if (processingMode === "realtime" && realtimeEnabled) {
    // Real-time processing mode
    console.log("⚡ Setting up real-time email processing...");

    // Process new emails every 1 minute for real-time feel
    ScriptApp.newTrigger("processNewEmails")
      .timeBased()
      .everyMinutes(CONFIG.REALTIME_FREQUENCY)
      .create();

    console.log("⚡ Real-time processing triggers configured");
  } else {
    // Scheduled processing mode (legacy)
    console.log("⏰ Setting up scheduled email processing...");

    // Main processing every 30 minutes
    ScriptApp.newTrigger("processLifeEmails")
      .timeBased()
      .everyMinutes(30)
      .create();

    console.log("⏰ Scheduled processing triggers configured");
  }

  // Daily report at end of day (both modes)
  ScriptApp.newTrigger("generateProcessingReport")
    .timeBased()
    .everyDays(1)
    .atHour(22)
    .create();

  console.log("📊 Daily report trigger configured");
}

/**
 * Sets the processing mode for the automation system.
 * @param {string} mode - 'realtime' or 'scheduled'
 * @returns {void}
 */
function setProcessingMode(mode) {
  // mode: 'realtime' or 'scheduled'
  if (mode !== "realtime" && mode !== "scheduled") {
    console.error('❌ Invalid processing mode. Use "realtime" or "scheduled"');
    return false;
  }

  const success = setSecret("PROCESSING_MODE", mode);
  if (success) {
    console.log(`🔧 Processing mode set to: ${mode}`);
    console.log("🔄 Please run setupAutoTriggers() to apply the new mode");
  }
  return success;
}

/**
 * Enables or disables real-time processing.
 * @param {boolean} enabled - True to enable real-time processing, false to disable
 * @returns {void}
 */
function setRealtimeEnabled(enabled) {
  // enabled: true or false
  const success = setSecret("REALTIME_ENABLED", enabled.toString());
  if (success) {
    console.log(`⚡ Real-time processing ${enabled ? "enabled" : "disabled"}`);
    console.log("🔄 Please run setupAutoTriggers() to apply the new setting");
  }
  return success;
}

/**
 * Gets the current processing mode and configuration.
 * @returns {Object} Object with current mode and settings
 */
function getCurrentProcessingMode() {
  const mode = getSecret("PROCESSING_MODE") || CONFIG.PROCESSING_MODE;
  const realtime = getSecret("REALTIME_ENABLED") || CONFIG.REALTIME_ENABLED;

  console.log(`📊 Current processing mode: ${mode}`);
  console.log(`⚡ Real-time processing: ${realtime}`);

  return { mode, realtime };
}

/**
 * Enables real-time email processing mode.
 * @returns {void}
 */
function enableRealtimeMode() {
  console.log("⚡ Enabling real-time email processing...");
  setProcessingMode("realtime");
  setRealtimeEnabled(true);
  setupAutoTriggers();
  console.log(
    "✅ Real-time mode enabled! New emails will be processed every 1 minute"
  );
}

/**
 * Enables scheduled email processing mode.
 * @returns {void}
 */
function enableScheduledMode() {
  console.log("⏰ Enabling scheduled email processing...");
  setProcessingMode("scheduled");
  setRealtimeEnabled(false);
  setupAutoTriggers();
  console.log(
    "✅ Scheduled mode enabled! Emails will be processed every 30 minutes"
  );
}

/**
 * Quick function to switch to real-time processing mode.
 * @returns {void}
 */
function switchToRealtime() {
  enableRealtimeMode();
}

/**
 * Quick function to switch to scheduled processing mode.
 * @returns {void}
 */
function switchToScheduled() {
  enableScheduledMode();
}

/**
 * Sends daily processing report via email.
 * @param {Object} report - Optional report object, if not provided will get from sheets
 * @returns {void}
 */
function sendDailyReportEmail(report = null) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const subject = `Daily Email Processing Report - ${todayString}`;

    // Use provided report or get from sheets
    if (!report) {
      report = getReportFromSheets(todayString);
      console.log("📧 Report from sheets:", report);

      if (!report) {
        console.log("📧 No report data for today, skipping email");
        return;
      }
    }

    console.log("📧 Generated report:", report);

    // Format the report data
    let emailBody = `DAILY EMAIL PROCESSING REPORT\n`;
    emailBody += `Date: ${report.date}\n`;
    emailBody += `Total Processed: ${report.processed} emails\n\n`;

    // Add category breakdown
    if (Object.keys(report.by_category).length > 0) {
      emailBody += `BY CATEGORY:\n`;
      Object.entries(report.by_category)
        .sort(([, a], [, b]) => b - a) // Sort by count descending
        .forEach(([category, count]) => {
          // Remove emojis and clean up category name
          const cleanCategory = category
            .replace(/[^\x00-\x7F]/g, "")
            .replace(/^\d+:\s*/, "")
            .trim();
          emailBody += `   ${cleanCategory}: ${count}\n`;
        });
      emailBody += `\n`;
    }

    // Add priority breakdown
    if (Object.keys(report.by_priority).length > 0) {
      emailBody += `BY PRIORITY:\n`;
      Object.entries(report.by_priority)
        .sort(([, a], [, b]) => b - a) // Sort by count descending
        .forEach(([priority, count]) => {
          emailBody += `   ${priority}: ${count}\n`;
        });
      emailBody += `\n`;
    }

    // Add summary insights
    emailBody += `SUMMARY:\n`;
    if (report.processed > 0) {
      const urgentImportant = report.by_priority["URGENT_IMPORTANT"] || 0;
      const notUrgentImportant =
        report.by_priority["NOT_URGENT_IMPORTANT"] || 0;
      const totalImportant = urgentImportant + notUrgentImportant;

      emailBody += `   • ${urgentImportant} urgent + important emails (immediate action needed)\n`;
      emailBody += `   • ${notUrgentImportant} important but not urgent emails (planning)\n`;
      emailBody += `   • ${totalImportant} total important emails (${Math.round(
        (totalImportant / report.processed) * 100
      )}% of all emails)\n`;
    } else {
      emailBody += `   • No emails processed today\n`;
    }

    emailBody += `\nGenerated by Gmail Life Management System\n`;
    emailBody += `Report includes both real-time and batch processed emails\n`;

    // Send the email
    GmailApp.sendEmail(userEmail, subject, emailBody);
    console.log(`📧 Daily report email sent to ${userEmail}`);
  } catch (error) {
    console.error("❌ Error sending daily report email:", error);
  }
}
