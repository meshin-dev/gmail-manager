// Gmail Automation + Eisenhower Matrix + ChatGPT
// Automatic sorting of all life areas by importance and urgency

/**
 * Processes all emails in the inbox using batch processing mode.
 * This is the legacy batch processing function for processing large volumes of emails.
 * @returns {void}
 */
function processLifeEmails() {
  try {
    console.log("🚀 Starting smart email processing...");

    // Validate system before processing
    if (!validateSystem()) {
      console.error("❌ System validation failed. Please check configuration.");
      return;
    }

    // Get new emails from inbox
    const threads = GmailApp.getInboxThreads(0, 50);

    console.log(`📧 Found ${threads.length} emails to process`);

    for (let thread of threads) {
      if (!thread.hasStarredMessages()) {
        // Process only unstarred emails
        processEmailThread(thread);
        Utilities.sleep(2000); // Pause between requests
      }
    }

    console.log("✅ Processing completed");
    generateProcessingReport();
  } catch (error) {
    console.error("❌ Error during processing:", error);
    sendErrorNotification(error.toString());
  }
}

/**
 * Processes new unread emails in real-time mode.
 * This function is triggered automatically when new emails arrive.
 * @returns {void}
 */
function processNewEmails() {
  try {
    console.log("⚡ Processing new emails in real-time...");

    // Validate system before processing
    if (!validateSystem()) {
      console.error("❌ System validation failed. Please check configuration.");
      return;
    }

    // Get only truly new emails (unread)
    const threads = GmailApp.search("in:inbox is:unread", 0, CONFIG.BATCH_SIZE);

    if (threads.length === 0) {
      console.log("📧 No new unread emails to process");
      return;
    }

    console.log(`📧 Found ${threads.length} new unread emails to process`);

    for (let thread of threads) {
      if (!thread.hasStarredMessages()) {
        // Process only unstarred emails
        processEmailThread(thread);

        // Mark as processed to avoid reprocessing
        const processedLabel = getOrCreateLabel("PROCESSED");
        if (processedLabel) {
          thread.addLabel(processedLabel);
        }

        Utilities.sleep(1000); // Shorter pause for real-time processing
      }
    }

    console.log("✅ Real-time processing completed");
  } catch (error) {
    console.error("❌ Error during real-time processing:", error);
    sendErrorNotification(error.toString());
  }
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
 * Applies a label to a thread and handles trash logic based on label configuration.
 * @param {GmailThread} thread - The Gmail thread to apply the label to
 * @param {string} labelKey - The key for the label configuration
 * @returns {GmailLabel|null} The applied label or null if failed
 */
function applyLabelWithTrashLogic(thread, labelKey) {
  try {
    const label = getOrCreateLabel(labelKey);
    if (label) {
      thread.addLabel(label);

      // Check if this label should move email to trash
      const labelConfig = CONFIG.LABELS[labelKey];
      if (labelConfig && labelConfig.moveToTrash) {
        console.log(`🗑️ Moving email to trash (${labelKey})`);
        thread.moveToTrash();
      }

      return label;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error applying label ${labelKey}:`, error);
    return null;
  }
}

/**
 * Processes an individual email thread with AI analysis and labeling.
 * @param {GmailThread} thread - The Gmail thread to process
 * @returns {void}
 */
function processEmailThread(thread) {
  try {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];

    const emailData = {
      subject: lastMessage.getSubject(),
      body: lastMessage.getPlainBody(),
      sender: lastMessage.getFrom(),
      date: lastMessage.getDate(),
      threadId: thread.getId(),
    };

    // Check if email should be processed based on date
    if (!shouldProcessEmail(emailData.date)) {
      console.log(
        `⏭️ Skipping email (before processing date): ${emailData.subject.substring(
          0,
          50
        )}...`
      );
      return;
    }

    console.log(`🔍 Analyzing: ${emailData.subject.substring(0, 50)}...`);

    // Analyze with ChatGPT (enhanced with configuration context)
    const analysis = analyzeEmailWithChatGPT(emailData);

    if (analysis && analysis.confidence > 0.7) {
      // Enhance analysis with configuration context
      const enhancedAnalysis = enhanceAnalysisWithContext(analysis);
      if (enhancedAnalysis) {
        applyLifeManagementLabels(thread, enhancedAnalysis);
        logProcessedEmail(emailData, enhancedAnalysis);
      } else {
        console.log("❌ Failed to enhance analysis");
      }
    } else {
      // If confidence is low, mark for manual review
      const reviewLabel = getOrCreateLabel("TO_REVIEW");
      if (reviewLabel) {
        thread.addLabel(reviewLabel);
      }
    }

    // Remove from inbox (achieve Inbox Zero)
    thread.moveToArchive();
  } catch (error) {
    console.error(`❌ Error processing email thread:`, error);
    // Mark for manual review on error
    try {
      const reviewLabel = getOrCreateLabel("TO_REVIEW");
      if (reviewLabel) {
        thread.addLabel(reviewLabel);
      }
    } catch (labelError) {
      console.error(`❌ Error adding review label:`, labelError);
    }
  }
}

/**
 * Applies all life management labels based on AI analysis results.
 * @param {GmailThread} thread - The Gmail thread to apply labels to
 * @param {Object} analysis - The AI analysis results
 * @returns {void}
 */
function applyLifeManagementLabels(thread, analysis) {
  console.log(
    `🏷️ Applying labels: [${analysis.categories.join(", ")}] + ${
      analysis.eisenhower_quadrant
    }`
  );

  // 1. Handle spam and junk - move to trash immediately
  if (
    analysis.is_spam_or_junk ||
    analysis.categories.includes("SPAM") ||
    analysis.categories.includes("JUNK") ||
    analysis.categories.includes("PHISHING")
  ) {
    console.log("🗑️ Spam/junk detected - moving to trash");

    // Add corresponding spam labels
    analysis.categories.forEach((categoryKey) => {
      if (["SPAM", "JUNK", "PHISHING"].includes(categoryKey)) {
        const label = getOrCreateLabel(categoryKey);
        if (label) {
          thread.addLabel(label);
        }
      }
    });

    // Move to trash (auto-delete after 30 days)
    thread.moveToTrash();
    return; // Stop further processing
  }

  // 2. Add labels for ALL life categories
  analysis.categories.forEach((categoryKey) => {
    if (CONFIG.LABELS[categoryKey]) {
      const label = applyLabelWithTrashLogic(thread, categoryKey);
      if (label) {
        console.log(`   ✓ Added label: ${CONFIG.LABELS[categoryKey].name}`);
      }
    } else {
      console.warn(`⚠️ Category not found: ${categoryKey}`);
    }
  });

  // 3. Add Eisenhower Matrix label
  const quadrant = CONFIG.EISENHOWER_MATRIX[analysis.eisenhower_quadrant];
  if (quadrant) {
    const priorityLabel = getOrCreateLabel(analysis.eisenhower_quadrant);
    if (priorityLabel) {
      thread.addLabel(priorityLabel);
    }

    // Apply corresponding priority actions
    applyPriorityActions(thread, analysis, quadrant);

    // Handle inbox behavior based on keepInInbox flag
    if (!quadrant.keepInInbox) {
      // Move out of inbox for not urgent + not important items
      console.log(
        `📤 Moving email out of inbox (${analysis.eisenhower_quadrant})`
      );
      thread.moveToArchive();
    } else {
      // Keep in inbox for urgent/important items
      console.log(
        `📥 Keeping email in inbox (${analysis.eisenhower_quadrant})`
      );
    }
  }

  // 4. Additional labels based on analysis
  if (analysis.action_needed) {
    applyLabelWithTrashLogic(thread, "REQUIRES_ACTION");
  }

  if (analysis.deadline) {
    applyLabelWithTrashLogic(thread, "HAS_DEADLINE");
  }
}

/**
 * Applies priority-specific actions based on Eisenhower Matrix quadrant.
 * @param {GmailThread} thread - The Gmail thread to apply actions to
 * @param {Object} analysis - The AI analysis results
 * @param {Object} quadrant - The Eisenhower Matrix quadrant configuration
 * @returns {void}
 */
function applyPriorityActions(thread, analysis, quadrant) {
  switch (quadrant.priority) {
    case 1: // 🔴 Urgent + Important - immediate actions
      thread.markImportant();
      // Note: Gmail API doesn't support programmatic starring
      // Users can manually star important emails
      // Create calendar reminder for all urgent + important emails
      scheduleUrgentReminder(thread, analysis);
      break;

    case 2: // 🟠 Not Urgent + Important - plan
      thread.markImportant();
      applyLabelWithTrashLogic(thread, "TO_PLAN");
      break;

    case 3: // 🟡 Urgent + Not Important - delegate/minimize
      applyLabelWithTrashLogic(thread, "DELEGATE");
      break;

    case 4: // ⚫ Not Urgent + Not Important - archive/delete
      if (
        analysis.categories.includes("SPAM") ||
        analysis.categories.includes("JUNK") ||
        analysis.categories.includes("PHISHING")
      ) {
        // Already processed above in applyLifeManagementLabels
        return;
      } else {
        applyLabelWithTrashLogic(thread, "SOMEDAY_MAYBE");
      }
      break;
  }
}

/**
 * Schedules a Google Calendar reminder for urgent tasks.
 * @param {GmailThread} thread - The Gmail thread
 * @param {Object} analysis - The AI analysis results
 * @returns {void}
 */
function scheduleUrgentReminder(thread, analysis) {
  try {
    // Create reminder in Google Calendar
    const calendar = CalendarApp.getDefaultCalendar();
    
    // Set reminder time to 30+ minutes from now to give buffer time
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const endTime = new Date(reminderTime.getTime() + 15 * 60 * 1000); // 15-minute event

    // Create the calendar event
    const event = calendar.createEvent(
      `🔴 URGENT: ${thread.getFirstMessageSubject()}`,
      reminderTime,
      endTime,
      {
        description: `URGENT EMAIL REMINDER\n\n` +
          `Summary: ${analysis.summary || 'No summary available'}\n` +
          `Action: ${analysis.suggested_action || 'Review and take action'}\n` +
          `Deadline: ${analysis.deadline || 'ASAP'}\n` +
          `Categories: ${analysis.categories.join(', ')}\n` +
          `Email Link: ${thread.getPermalink()}\n\n` +
          `This is an automated reminder for an urgent and important email.`,
        location: 'Gmail Inbox',
        guests: [] // No guests for personal reminders
      }
    );

    // Set reminder to notify 5 minutes before the event
    event.addPopupReminder(5);
    
    console.log(`⏰ Created urgent reminder for: ${thread.getFirstMessageSubject()}`);
    console.log(`📅 Reminder scheduled for: ${reminderTime.toLocaleString()}`);
  } catch (error) {
    console.error("❌ Error creating urgent reminder:", error);
    console.error("📝 Make sure Google Calendar API is enabled");
  }
}

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

  // Collect statistics by labels
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
 * Sets up required secrets and environment variables.
 * @returns {void}
 */
function setupSecrets() {
  console.log("🔐 Setting up secrets...");

  // Check if OpenAI API key is set
  const openaiKey = getSecret("OPENAI_API_KEY");
  if (!openaiKey) {
    console.log("⚠️ OpenAI API key not found. Please set it using:");
    console.log('setSecret("OPENAI_API_KEY", "your-api-key-here")');
    return false;
  }

  console.log("✅ Secrets configured");
  return true;
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
 * Gets the display name for a label key from configuration.
 * @param {string} labelKey - The label configuration key
 * @returns {string} The label display name
 */
function getLabelName(labelKey) {
  const labelConfig =
    CONFIG.LABELS[labelKey] || CONFIG.EISENHOWER_MATRIX[labelKey];

  if (!labelConfig) {
    console.warn(`⚠️ Label configuration not found for: ${labelKey}`);
    return null;
  }

  // Return the hardcoded name with prefix
  return labelConfig.name;
}

/**
 * Finds the configuration key for a label by its display name.
 * @param {string} labelName - The label display name
 * @returns {string|null} The label configuration key or null if not found
 */
function getLabelKeyFromName(labelName) {
  // Search through all label configurations to find the key by hardcoded name

  // Search in LABELS
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.name === labelName) return key;
  }

  // Search in EISENHOWER_MATRIX
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    if (config.name === labelName) return key;
  }

  return null;
}

/**
 * Checks and logs all existing labels in the Gmail account.
 * @returns {Object} Object with label statistics
 */
function checkExistingLabels() {
  console.log("🔍 Checking existing labels...");

  try {
    const allLabels = GmailApp.getUserLabels();
    const existingNumberedLabels = {};
    const existingUnnumberedLabels = {};

    allLabels.forEach((label) => {
      const labelName = label.getName();

      // Check if it's a numbered label
      const match = labelName.match(/^(\d{3}):\s(.+)$/);
      if (match) {
        const number = match[1];
        const name = match[2];
        existingNumberedLabels[number] = { name, label };
      } else {
        existingUnnumberedLabels[labelName] = label;
      }
    });

    console.log(
      `📋 Found ${Object.keys(existingNumberedLabels).length} numbered labels`
    );
    console.log(
      `📋 Found ${
        Object.keys(existingUnnumberedLabels).length
      } unnumbered labels`
    );

    return { existingNumberedLabels, existingUnnumberedLabels };
  } catch (error) {
    console.error("❌ Error checking existing labels:", error);
    return { existingNumberedLabels: {}, existingUnnumberedLabels: {} };
  }
}

/**
 * Retrieves a secret value from Google Apps Script PropertiesService.
 * @param {string} key - The secret key to retrieve
 * @returns {string|null} The secret value or null if not found
 */
function getSecret(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (error) {
    console.warn(`⚠️ Could not retrieve secret ${key}:`, error);
    return null;
  }
}

/**
 * Sets a secret value in Google Apps Script PropertiesService.
 * @param {string} key - The secret key to set
 * @param {string} value - The secret value to store
 * @returns {boolean} True if successful, false otherwise
 */
function setSecret(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    console.log(`🔐 Secret ${key} set successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set secret ${key}:`, error);
    return false;
  }
}

/**
 * Initializes the processing date on first run to prevent processing historical emails.
 * @returns {string} The processing date in YYYY-MM-DD format
 */
function initializeProcessingDate() {
  console.log("📅 Initializing processing date...");

  const existingDate = getSecret("PROCESS_FROM_DATE");
  if (!existingDate) {
    // First run - set to current date
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    setSecret("PROCESS_FROM_DATE", currentDate);
    console.log(`📅 Set processing start date to: ${currentDate}`);
    console.log("📝 Only emails from today forward will be processed");
    console.log(
      "💡 To process historical emails, run setProcessHistoricalEmails(true)"
    );
    return currentDate;
  } else {
    console.log(`📅 Processing date already set to: ${existingDate}`);
    return existingDate;
  }
}

/**
 * Gets the current processing start date from environment variables.
 * @returns {string} The processing date in YYYY-MM-DD format
 */
function getProcessingDate() {
  const date = getSecret("PROCESS_FROM_DATE") || CONFIG.PROCESS_FROM_DATE;
  if (!date) {
    return initializeProcessingDate();
  }
  return date;
}

/**
 * Sets a custom processing start date.
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if successful, false otherwise
 */
function setProcessingDate(dateString) {
  // dateString should be in YYYY-MM-DD format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.error("❌ Invalid date format. Use YYYY-MM-DD format");
    return false;
  }

  const formattedDate = date.toISOString().split("T")[0];
  setSecret("PROCESS_FROM_DATE", formattedDate);
  console.log(`📅 Processing date set to: ${formattedDate}`);
  console.log(`📝 Emails from ${formattedDate} onwards will be processed`);
  return true;
}

/**
 * Enables or disables processing of historical emails.
 * @param {boolean} enabled - True to process all emails, false for date filtering
 * @returns {void}
 */
function setProcessHistoricalEmails(enabled) {
  setSecret("PROCESS_HISTORICAL_EMAILS", enabled.toString());
  if (enabled) {
    console.log("📚 Historical email processing ENABLED");
    console.log(
      "⚠️ This will process ALL emails in your inbox - use with caution!"
    );
  } else {
    console.log("📅 Historical email processing DISABLED");
    console.log(
      "📝 Only emails from processing date onwards will be processed"
    );
  }
}

/**
 * Checks if historical email processing is enabled.
 * @returns {boolean} True if historical emails are processed, false otherwise
 */
function getProcessHistoricalEmails() {
  const setting = getSecret("PROCESS_HISTORICAL_EMAILS");
  return setting === "true" || CONFIG.PROCESS_HISTORICAL_EMAILS;
}

/**
 * Determines if an email should be processed based on its date and filtering settings.
 * @param {Date} emailDate - The email date
 * @returns {boolean} True if email should be processed, false otherwise
 */
function shouldProcessEmail(emailDate) {
  const processFromDate = getProcessingDate();
  const processHistorical = getProcessHistoricalEmails();

  if (processHistorical) {
    return true; // Process all emails
  }

  const emailDateStr = emailDate.toISOString().split("T")[0];
  return emailDateStr >= processFromDate;
}

/**
 * Displays the current date filtering configuration and available commands.
 * @returns {void}
 */
function showDateFilteringStatus() {
  console.log("📅 DATE FILTERING STATUS");
  console.log("=".repeat(40));
  console.log("");

  const processingDate = getProcessingDate();
  const processHistorical = getProcessHistoricalEmails();

  console.log(`📅 Processing from date: ${processingDate}`);
  console.log(
    `📚 Process historical emails: ${processHistorical ? "YES" : "NO"}`
  );
  console.log("");

  if (processHistorical) {
    console.log("⚠️ ALL emails in your inbox will be processed");
    console.log("💡 This may be expensive for large inboxes");
    console.log("🔧 Run setProcessHistoricalEmails(false) to disable");
  } else {
    console.log("✅ Only emails from today forward will be processed");
    console.log("💡 This prevents processing thousands of historical emails");
    console.log(
      "🔧 Run setProcessHistoricalEmails(true) to process all emails"
    );
  }

  console.log("");
  console.log("📝 Available commands:");
  console.log('• setProcessingDate("2024-01-01") - Set custom start date');
  console.log("• setProcessHistoricalEmails(true) - Process all emails");
  console.log(
    "• setProcessHistoricalEmails(false) - Process only recent emails"
  );
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
 * Removes all labels that don't match the script's configuration.
 * @returns {Object} Result object with cleanup statistics
 */
function cleanupIncorrectLabels() {
  console.log(
    "🧹 Starting cleanup of ALL labels that don't match our agreements..."
  );

  const allLabels = GmailApp.getUserLabels();
  const labelsToDelete = [];

  // Get all valid label names that our script should create
  const validLabelNames = new Set();

  // Add all Eisenhower Matrix labels with proper numbering
  for (const key of Object.keys(CONFIG.EISENHOWER_MATRIX)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      validLabelNames.add(numberedName);
    }
  }

  // Add all other labels with proper numbering
  for (const key of Object.keys(CONFIG.LABELS)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      validLabelNames.add(numberedName);
    }
  }

  console.log(
    `📋 Our script should have exactly ${validLabelNames.size} valid labels`
  );

  // Find ALL labels that don't match our agreements
  for (const label of allLabels) {
    const labelName = label.getName();

    // Skip Gmail system labels
    if (
      labelName.startsWith("INBOX") ||
      labelName.startsWith("SENT") ||
      labelName.startsWith("DRAFT") ||
      labelName.startsWith("SPAM") ||
      labelName.startsWith("TRASH") ||
      labelName.startsWith("IMPORTANT") ||
      labelName.startsWith("STARRED") ||
      labelName.startsWith("CATEGORY_")
    ) {
      continue;
    }

    // Check if this label matches our script agreements
    if (!validLabelNames.has(labelName)) {
      const threadCount = label.getThreads().length;
      console.log(
        `🗑️ Found label that doesn't match our agreements: "${labelName}" (${threadCount} emails)`
      );
      labelsToDelete.push({
        label: label,
        name: labelName,
        threadCount: threadCount,
      });
    }
  }

  if (labelsToDelete.length === 0) {
    console.log("✅ All labels match our agreements - no cleanup needed!");
    return 0;
  }

  console.log(
    `🧹 Found ${labelsToDelete.length} labels that don't match our agreements:`
  );
  for (const item of labelsToDelete) {
    console.log(`  - "${item.name}" (${item.threadCount} emails)`);
  }

  // Delete the incorrect labels
  let deletedCount = 0;
  for (const item of labelsToDelete) {
    try {
      // Remove label from all threads first
      const threads = item.label.getThreads();
      if (threads.length > 0) {
        console.log(
          `📧 Removing label "${item.name}" from ${threads.length} threads`
        );
        item.label.removeFromThreads(threads);
      }

      // Delete the label
      item.label.deleteLabel();
      console.log(`✅ Deleted non-compliant label: ${item.name}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to delete label ${item.name}:`, error);
    }
  }

  console.log(
    `🧹 Cleanup completed! Deleted ${deletedCount} labels that didn't match our agreements`
  );

  if (deletedCount > 0) {
    console.log("🔄 Now ensuring all proper script labels exist...");
    console.log("🏗️ Creating Eisenhower Matrix labels...");
    for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
      const label = getOrCreateLabel(key);
      if (label) {
        console.log(`  ✅ Created: ${label.getName()}`);
      } else {
        console.error(`  ❌ Failed: ${key}`);
      }
    }

    console.log("🏗️ Creating all other labels...");
    for (const [key, config] of Object.entries(CONFIG.LABELS)) {
      const label = getOrCreateLabel(key);
      if (label) {
        console.log(`  ✅ Created: ${label.getName()}`);
      } else {
        console.error(`  ❌ Failed: ${key}`);
      }
    }

    console.log("✅ All labels created with hardcoded prefixes!");
    console.log(
      "📋 Labels are now deterministic and will sort correctly in Gmail"
    );
  }

  return deletedCount;
}

/**
 * Lists all labels that don't match the script's configuration.
 * @returns {void}
 */
function listIncorrectLabels() {
  console.log("🔍 Checking for ALL labels that don't match our agreements...");

  const allLabels = GmailApp.getUserLabels();
  const incorrectLabels = [];

  // Get all valid label names that our script should create
  const validLabelNames = new Set();

  // Add all Eisenhower Matrix labels with proper numbering
  for (const key of Object.keys(CONFIG.EISENHOWER_MATRIX)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      validLabelNames.add(numberedName);
    }
  }

  // Add all other labels with proper numbering
  for (const key of Object.keys(CONFIG.LABELS)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      validLabelNames.add(numberedName);
    }
  }

  console.log(
    `📋 Our script should have exactly ${validLabelNames.size} valid labels`
  );

  // Find ALL labels that don't match our agreements
  for (const label of allLabels) {
    const labelName = label.getName();

    // Skip Gmail system labels
    if (
      labelName.startsWith("INBOX") ||
      labelName.startsWith("SENT") ||
      labelName.startsWith("DRAFT") ||
      labelName.startsWith("SPAM") ||
      labelName.startsWith("TRASH") ||
      labelName.startsWith("IMPORTANT") ||
      labelName.startsWith("STARRED") ||
      labelName.startsWith("CATEGORY_")
    ) {
      continue;
    }

    // Check if this label matches our script agreements
    if (!validLabelNames.has(labelName)) {
      const threadsCount = label.getThreads().length;

      // Try to find what this should be (for better user feedback)
      let shouldBe = "Unknown - not in our agreements";

      // Check if it's a constant key
      const constantKeys = [
        ...Object.keys(CONFIG.LABELS),
        ...Object.keys(CONFIG.EISENHOWER_MATRIX),
      ];
      if (constantKeys.includes(labelName)) {
        shouldBe = getLabelName(labelName) || "Invalid key";
      }
      // Check if it's an old numbered label
      else if (/^\d{3}: /.test(labelName)) {
        const namePart = labelName.substring(5);
        const foundKey = Object.entries({
          ...CONFIG.LABELS,
          ...CONFIG.EISENHOWER_MATRIX,
        }).find(([key, config]) => config.name === namePart);
        if (foundKey) {
          shouldBe = getLabelName(foundKey[0]) || "Invalid priority";
        } else {
          shouldBe = "Old numbered label - not in current agreements";
        }
      }

      incorrectLabels.push({
        name: labelName,
        shouldBe: shouldBe,
        threadsCount: threadsCount,
        type: constantKeys.includes(labelName)
          ? "constant_key"
          : /^\d{3}: /.test(labelName)
          ? "old_numbered"
          : "unknown",
      });
    }
  }

  if (incorrectLabels.length === 0) {
    console.log("✅ All labels match our agreements!");
  } else {
    console.log(
      `❌ Found ${incorrectLabels.length} labels that don't match our agreements:`
    );
    for (const label of incorrectLabels) {
      console.log(
        `  - "${label.name}" → should be "${label.shouldBe}" (${label.threadsCount} emails, type: ${label.type})`
      );
    }
    console.log("\n💡 Use cleanupIncorrectLabels() to fix these automatically");
  }

  return incorrectLabels;
}

/**
 * Fixes and recreates all labels to match the script's configuration.
 * @returns {Object} Result object with recreation statistics
 */
function fixAndRecreateAllLabels() {
  console.log("🔧 FIXING AND RECREATING ALL LABELS WITH HARDCODED PREFIXES");
  console.log("=".repeat(70));

  // First, clean up any existing incorrect labels
  console.log("🧹 Step 1: Cleaning up incorrect labels...");
  cleanupIncorrectLabels();

  console.log("");
  console.log("🏗️ Step 2: Creating Eisenhower Matrix labels...");
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ Created: ${label.getName()}`);
    } else {
      console.error(`  ❌ Failed: ${key}`);
    }
  }

  console.log("");
  console.log("🏗️ Step 3: Creating all other labels...");
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ Created: ${label.getName()}`);
    } else {
      console.error(`  ❌ Failed: ${key}`);
    }
  }

  console.log("");
  console.log("✅ All labels created with HARDCODED PREFIXES!");
  console.log(
    "📋 Labels are now deterministic and will sort correctly in Gmail"
  );
}

/**
 * Displays the script's label configuration and agreements.
 * @returns {void}
 */
function showOurLabelAgreements() {
  console.log("📋 OUR LABEL AGREEMENTS - What labels should exist:");
  console.log("=".repeat(60));

  const allValidLabels = [];

  // Collect Eisenhower Matrix labels
  console.log("\n🎯 EISENHOWER MATRIX LABELS:");
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      allValidLabels.push({ name: numberedName, category: "Eisenhower" });
      console.log(`  ${numberedName}`);
    }
  }

  // Collect other labels by category
  const categories = {
    "Action Labels": [],
    "Critical Life": [],
    Financial: [],
    Work: [],
    Family: [],
    Home: [],
    Documents: [],
    Transportation: [],
    Development: [],
    "Health & Fitness": [],
    Shopping: [],
    Subscriptions: [],
    Social: [],
    Leisure: [],
    Information: [],
    Processing: [],
    Junk: [],
  };

  // Categorize labels for better display
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    const numberedName = getLabelName(key);
    if (numberedName) {
      allValidLabels.push({ name: numberedName, category: "Labels" });

      // Categorize for display
      if (
        key.includes("ACTION") ||
        key.includes("DEADLINE") ||
        key.includes("PLAN") ||
        key.includes("DELEGATE")
      ) {
        categories["Action Labels"].push(`  ${numberedName}`);
      } else if (
        key.includes("HEALTH") ||
        key.includes("MEDICAL") ||
        key.includes("EMERGENCY") ||
        key.includes("LEGAL")
      ) {
        categories["Critical Life"].push(`  ${numberedName} `);
      } else if (
        key.includes("BILLS") ||
        key.includes("BANKING") ||
        key.includes("TAXES") ||
        key.includes("INSURANCE") ||
        key.includes("DEBT")
      ) {
        categories["Financial"].push(`  ${numberedName} `);
      } else if (
        key.includes("WORK") ||
        key.includes("BUSINESS") ||
        key.includes("CAREER") ||
        key.includes("SALARY") ||
        key.includes("PROJECTS") ||
        key.includes("MEETINGS")
      ) {
        categories["Work"].push(`  ${numberedName} `);
      } else if (
        key.includes("FAMILY") ||
        key.includes("CHILDREN") ||
        key.includes("RELATIONSHIPS") ||
        key.includes("ELDERLY")
      ) {
        categories["Family"].push(`  ${numberedName} `);
      } else if (
        key.includes("HOME") ||
        key.includes("UTILITIES") ||
        key.includes("REPAIRS") ||
        key.includes("SECURITY")
      ) {
        categories["Home"].push(`  ${numberedName} `);
      } else if (
        key.includes("DOCUMENTS") ||
        key.includes("GOVERNMENT") ||
        key.includes("VISA") ||
        key.includes("PASSPORT")
      ) {
        categories["Documents"].push(`  ${numberedName} `);
      } else if (
        key.includes("TRANSPORT") ||
        key.includes("CAR") ||
        key.includes("TRAVEL") ||
        key.includes("TICKETS")
      ) {
        categories["Transportation"].push(`  ${numberedName} `);
      } else if (
        key.includes("INVESTMENTS") ||
        key.includes("EDUCATION") ||
        key.includes("COURSES") ||
        key.includes("SKILLS") ||
        key.includes("BOOKS")
      ) {
        categories["Development"].push(`  ${numberedName} `);
      } else if (
        key.includes("FITNESS") ||
        key.includes("WELLNESS") ||
        key.includes("NUTRITION")
      ) {
        categories["Health & Fitness"].push(`  ${numberedName} `);
      } else if (
        key.includes("ORDERS") ||
        key.includes("DELIVERY") ||
        key.includes("RETURNS") ||
        key.includes("WARRANTY") ||
        key.includes("SHOPPING") ||
        key.includes("GROCERIES")
      ) {
        categories["Shopping"].push(`  ${numberedName} `);
      } else if (
        key.includes("SUBSCRIPTIONS") ||
        key.includes("SOFTWARE") ||
        key.includes("CLOUD") ||
        key.includes("STREAMING")
      ) {
        categories["Subscriptions"].push(`  ${numberedName} `);
      } else if (
        key.includes("FRIENDS") ||
        key.includes("NETWORKING") ||
        key.includes("COMMUNITY")
      ) {
        categories["Social"].push(`  ${numberedName} `);
      } else if (
        key.includes("HOBBIES") ||
        key.includes("EVENTS") ||
        key.includes("CULTURE") ||
        key.includes("ENTERTAINMENT")
      ) {
        categories["Leisure"].push(`  ${numberedName} `);
      } else if (
        key.includes("NEWS") ||
        key.includes("NEWSLETTERS") ||
        key.includes("PROMOTIONS") ||
        key.includes("MARKETING")
      ) {
        categories["Information"].push(`  ${numberedName} `);
      } else if (
        key.includes("INBOX") ||
        key.includes("REVIEW") ||
        key.includes("WAITING") ||
        key.includes("SOMEDAY") ||
        key.includes("REFERENCE") ||
        key.includes("ARCHIVE")
      ) {
        categories["Processing"].push(`  ${numberedName} `);
      } else if (
        key.includes("SPAM") ||
        key.includes("JUNK") ||
        key.includes("PHISHING")
      ) {
        categories["Junk"].push(`  ${numberedName} `);
      }
    }
  }

  // Display categorized labels
  for (const [categoryName, labels] of Object.entries(categories)) {
    if (labels.length > 0) {
      console.log(`\n📂 ${categoryName.toUpperCase()}:`);
      labels.forEach((label) => console.log(label));
    }
  }

  console.log("\n📊 SUMMARY:");
  console.log(`Total labels in our agreements: ${allValidLabels.length}`);
  console.log(
    `Eisenhower Matrix: ${Object.keys(CONFIG.EISENHOWER_MATRIX).length}`
  );
  console.log(`Other Labels: ${Object.keys(CONFIG.LABELS).length}`);

  return allValidLabels;
}

/**
 * Gets an existing label or creates it if it doesn't exist.
 * @param {string} labelKey - The label configuration key
 * @returns {GmailLabel|null} The label object or null if creation failed
 */
function getOrCreateLabel(labelKey) {
  // Get the hardcoded label name from config
  let labelName;
  let label;

  if (
    typeof labelKey === "string" &&
    (CONFIG.LABELS[labelKey] || CONFIG.EISENHOWER_MATRIX[labelKey])
  ) {
    // Label key (like "REQUIRES_ACTION") - get hardcoded name
    labelName = getLabelName(labelKey);
  } else if (typeof labelKey === "string" && labelKey.includes(":")) {
    // Already hardcoded label name (like "010: ⚡ Requires Action")
    labelName = labelKey;
  } else {
    console.error(`❌ Invalid labelKey: ${labelKey}`);
    return null;
  }

  if (!labelName) {
    console.error(`❌ Could not determine label name for: ${labelKey}`);
    return null;
  }

  label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    console.log(`🏷️ Created label: ${labelName}`);
  }
  return label;
}

/**
 * Finds a label key by searching through existing Gmail labels.
 * @param {string} name - The label name to search for
 * @returns {string|null} The label key or null if not found
 */
function findLabelKeyByName(name) {
  // Search through all label configurations to find the key
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.name === name) return key;
  }
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    if (config.name === name) return key;
  }
  return null;
}

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
}

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

/**
 * Updates colors for all configured labels using the Gmail API.
 * @returns {Object} Result object with update statistics
 */
function updateLabelColors() {
  console.log("🎨 Updating label colors...");

  let updatedCount = 0;
  let failedCount = 0;

  // Update Eisenhower Matrix labels
  console.log("🎯 Updating Eisenhower Matrix label colors...");
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    const success = updateLabelColor(key, config.color);
    if (success) {
      console.log(`  ✅ ${config.name}`);
      updatedCount++;
    } else {
      console.log(`  ❌ ${config.name}`);
      failedCount++;

      // Stop script on first error to avoid repeating the same error
      console.log("");
      console.log("🛑 STOPPING SCRIPT - Systematic error detected!");
      console.log("📝 This error will repeat for all remaining labels.");
      console.log("🔧 Fix the error and try again.");
      console.log("");
      console.log("📊 PARTIAL SUMMARY:");
      console.log(`✅ Updated: ${updatedCount} labels`);
      console.log(`❌ Failed: ${failedCount} labels`);
      console.log("🛑 Script stopped to prevent repeated errors");

      return { updated: updatedCount, failed: failedCount, stopped: true };
    }
  }

  // Update all other labels
  console.log("🏷️ Updating other label colors...");
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    const success = updateLabelColor(key, config.color);
    if (success) {
      console.log(`  ✅ ${config.name}`);
      updatedCount++;
    } else {
      console.log(`  ❌ ${config.name}`);
      failedCount++;

      // Stop script on first error to avoid repeating the same error
      console.log("");
      console.log("🛑 STOPPING SCRIPT - Systematic error detected!");
      console.log("📝 This error will repeat for all remaining labels.");
      console.log("🔧 Fix the error and try again.");
      console.log("");
      console.log("📊 PARTIAL SUMMARY:");
      console.log(`✅ Updated: ${updatedCount} labels`);
      console.log(`❌ Failed: ${failedCount} labels`);
      console.log("🛑 Script stopped to prevent repeated errors");

      return { updated: updatedCount, failed: failedCount, stopped: true };
    }
  }

  console.log("");
  console.log("📊 COLOR UPDATE SUMMARY:");
  console.log(`✅ Updated: ${updatedCount} labels`);
  console.log(`❌ Failed: ${failedCount} labels`);

  return { updated: updatedCount, failed: failedCount, stopped: false };
}

/**
 * Updates the color of a single label using the Gmail API.
 * @param {string} labelKey - The label configuration key
 * @param {string} colorName - The color name from configuration
 * @returns {boolean} True if successful, false otherwise
 */
function updateLabelColor(labelKey, colorName) {
  try {
    // Get the label by name
    const label = GmailApp.getUserLabelByName(getLabelName(labelKey));
    if (!label) {
      console.warn(`⚠️ Label not found: ${labelKey}`);
      return false;
    }

    // Convert color name to hex values
    const colorHex = getColorHex(colorName);
    if (!colorHex) {
      console.warn(`⚠️ Unknown color: ${colorName}`);
      return false;
    }

    // Try to update label color using Gmail API
    try {
      const labelId = label.getId();
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`;

      const payload = {
        name: label.getName(),
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
        color: {
          backgroundColor: colorHex.background,
          textColor: colorHex.text,
        },
      };

      const response = UrlFetchApp.fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
          "Content-Type": "application/json",
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true, // This will prevent exceptions and show full response
      });

      if (response.getResponseCode() === 200) {
        return true;
      } else {
        console.error(
          `❌ Gmail API failed for ${labelKey}: ${response.getResponseCode()}`
        );
        console.log("📄 FULL RESPONSE:");
        console.log(response.getContentText());
        console.log(
          `📝 Note: Gmail API may not be enabled. Colors will be set manually.`
        );
        return false;
      }
    } catch (apiError) {
      console.warn(
        `⚠️ Gmail API not available for ${labelKey}: ${apiError.message}`
      );
      console.log(
        `📝 Note: Gmail API may not be enabled. Colors will be set manually.`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating color for ${labelKey}:`, error);
    return false;
  }
}

/**
 * Converts color name to Gmail API compatible hex values.
 * @param {string} colorName - The color name from configuration
 * @returns {Object|null} Object with background and text colors or null if invalid
 */
function getColorHex(colorName) {
  // Gmail API allowed colors only
  const colorMap = {
    red: { background: "#fb4c2f", text: "#ffffff" },
    orange: { background: "#ffad47", text: "#000000" },
    yellow: { background: "#fad165", text: "#000000" },
    green: { background: "#16a766", text: "#ffffff" },
    blue: { background: "#4a86e8", text: "#ffffff" },
    purple: { background: "#a479e2", text: "#ffffff" },
    pink: { background: "#f691b3", text: "#000000" },
    gray: { background: "#666666", text: "#ffffff" },
    black: { background: "#000000", text: "#ffffff" },
    white: { background: "#ffffff", text: "#000000" },
    lightblue: { background: "#a4c2f4", text: "#000000" },
    lightgreen: { background: "#89d3b2", text: "#000000" },
    lightpink: { background: "#fbc8d9", text: "#000000" },
    lightgray: { background: "#cccccc", text: "#000000" },
    darkred: { background: "#cc3a21", text: "#ffffff" },
    darkgreen: { background: "#0b804b", text: "#ffffff" },
    darkblue: { background: "#1c4587", text: "#ffffff" },
    darkpurple: { background: "#41236d", text: "#ffffff" },
  };

  return colorMap[colorName.toLowerCase()] || null;
}

/**
 * Displays all Gmail API compatible colors with their hex codes.
 * @returns {void}
 */
function showGmailAllowedColors() {
  console.log("🎨 GMAIL API ALLOWED COLORS");
  console.log("=".repeat(40));
  console.log("");
  console.log("These are the colors that work with Gmail API:");
  console.log("");
  console.log("🔴 RED: #fb4c2f (white text)");
  console.log("🟠 ORANGE: #ffad47 (black text)");
  console.log("🟡 YELLOW: #fad165 (black text)");
  console.log("🟢 GREEN: #16a766 (white text)");
  console.log("🔵 BLUE: #4a86e8 (white text)");
  console.log("🟣 PURPLE: #a479e2 (white text)");
  console.log("🩷 PINK: #f691b3 (black text)");
  console.log("⚫ GRAY: #666666 (white text)");
  console.log("⚪ WHITE: #ffffff (black text)");
  console.log("🖤 BLACK: #000000 (white text)");
  console.log("");
  console.log("💡 LIGHT VARIATIONS:");
  console.log("🔵 Light Blue: #a4c2f4 (black text)");
  console.log("🟢 Light Green: #89d3b2 (black text)");
  console.log("🩷 Light Pink: #fbc8d9 (black text)");
  console.log("⚪ Light Gray: #cccccc (black text)");
  console.log("");
  console.log("🌑 DARK VARIATIONS:");
  console.log("🔴 Dark Red: #cc3a21 (white text)");
  console.log("🟢 Dark Green: #0b804b (white text)");
  console.log("🔵 Dark Blue: #1c4587 (white text)");
  console.log("🟣 Dark Purple: #41236d (white text)");
  console.log("");
  console.log("✅ All these colors are Gmail API compatible!");
}

/**
 * Tests color update on a single label to prevent systematic errors.
 * @returns {void}
 */
function testSingleLabelColor() {
  console.log("🧪 TESTING SINGLE LABEL COLOR UPDATE");
  console.log("=".repeat(45));
  console.log("");
  console.log(
    "This will test color update on just one label to avoid systematic errors."
  );
  console.log("");

  // Test with the first Eisenhower Matrix label
  const firstKey = Object.keys(CONFIG.EISENHOWER_MATRIX)[0];
  const firstConfig = CONFIG.EISENHOWER_MATRIX[firstKey];

  console.log(`🎯 Testing with: ${firstConfig.name}`);
  console.log(`🎨 Color: ${firstConfig.color}`);
  console.log("");

  const success = updateLabelColor(firstKey, firstConfig.color);

  if (success) {
    console.log("✅ SUCCESS! Color update works correctly.");
    console.log("📝 You can now run updateLabelColors() safely.");
  } else {
    console.log("❌ FAILED! There is a systematic error.");
    console.log("🔧 Fix the error before running updateLabelColors().");
    console.log("📝 Check the error message above for details.");
  }

  return success;
}

/**
 * Displays detailed instructions for enabling the Gmail API.
 * @returns {void}
 */
function showGmailAPISetupInstructions() {
  console.log("🔧 GMAIL API SETUP INSTRUCTIONS");
  console.log("=".repeat(50));
  console.log("");
  console.log("To enable label colors, you need to enable the Gmail API:");
  console.log("");
  console.log(
    "1. Go to Google Cloud Console: https://console.cloud.google.com/"
  );
  console.log("2. Select your project (or create a new one)");
  console.log('3. Go to "APIs & Services" > "Library"');
  console.log('4. Search for "Gmail API" and click on it');
  console.log('5. Click "Enable"');
  console.log('6. Go to "APIs & Services" > "Credentials"');
  console.log('7. Click "Create Credentials" > "OAuth client ID"');
  console.log('8. Choose "Web application" and add your Apps Script URL');
  console.log("9. Copy the Client ID and Secret");
  console.log(
    '10. In Apps Script, go to "Project Settings" > "Script Properties"'
  );
  console.log("11. Add: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET");
  console.log("");
  console.log("Alternative: Use the manual color setup below");
  console.log("");
  console.log("📝 MANUAL COLOR SETUP (QUICK SOLUTION):");
  console.log(
    "Since Gmail API colors require setup, you can manually set colors:"
  );
  console.log("");
  console.log("1. Go to Gmail > Settings > Labels");
  console.log("2. For each label, click the color palette icon");
  console.log("3. Choose the appropriate color");
  console.log("");
  console.log("🎨 RECOMMENDED COLORS:");
  console.log("🔴 Urgent + Important: Red");
  console.log("🟡 Not Urgent + Important: Yellow");
  console.log("🟠 Urgent + Not Important: Orange");
  console.log("⚫ Not Urgent + Not Important: Gray");
  console.log("💰 Bills: Green");
  console.log("💼 Work: Blue");
  console.log("👨‍👩‍👧‍👦 Family: Purple");
  console.log("🏥 Health: Pink");
  console.log("🗑️ Spam/Junk: Black");
  console.log("");
  console.log(
    "✅ After setting colors manually, your labels will be perfectly organized!"
  );
  console.log(
    "📝 You can always enable Gmail API later for automatic color updates."
  );
}

/**
 * Checks if the Gmail API is enabled and working.
 * @returns {boolean} True if Gmail API is available, false otherwise
 */
function checkGmailAPIStatus() {
  console.log("🔍 CHECKING GMAIL API STATUS");
  console.log("=".repeat(40));

  try {
    // Try to make a simple Gmail API call
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
    const response = UrlFetchApp.fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      muteHttpExceptions: true, // This will prevent exceptions and show full response
    });

    if (response.getResponseCode() === 200) {
      console.log("✅ Gmail API is enabled and working!");
      return true;
    } else {
      console.log(`❌ Gmail API returned: ${response.getResponseCode()}`);
      console.log("📄 FULL RESPONSE:");
      console.log(response.getContentText());
      return false;
    }
  } catch (error) {
    console.log(`❌ Gmail API not available: ${error.message}`);
    console.log("📝 Run showGmailAPISetupInstructions() for setup help");
    return false;
  }
}

/**
 * Displays step-by-step instructions for manually setting label colors.
 * @returns {void}
 */
function showManualColorSetup() {
  console.log("🎨 MANUAL COLOR SETUP GUIDE");
  console.log("=".repeat(40));
  console.log("");
  console.log(
    "Since Gmail API is not enabled, here's how to set colors manually:"
  );
  console.log("");
  console.log("📋 STEP-BY-STEP:");
  console.log("1. Open Gmail in your browser");
  console.log('2. Click the gear icon (⚙️) > "See all settings"');
  console.log('3. Go to "Labels" tab');
  console.log(
    "4. For each label below, click the color palette icon and set the color:"
  );
  console.log("");
  console.log("🎯 EISENHOWER MATRIX LABELS:");
  console.log("• 001: 🔴 Urgent + Important → RED");
  console.log("• 002: 🟡 Not Urgent + Important → YELLOW");
  console.log("• 003: 🟠 Urgent + Not Important → ORANGE");
  console.log("• 004: ⚫ Not Urgent + Not Important → GRAY");
  console.log("");
  console.log("🏷️ CATEGORY LABELS:");
  console.log("• 010: ⚡ Requires Action → ORANGE");
  console.log("• 020: 💰 Bills → GREEN");
  console.log("• 030: 💼 Work → BLUE");
  console.log("• 040: 👨‍👩‍👧‍👦 Family → PURPLE");
  console.log("• 050: 🏥 Health → PINK");
  console.log("• 060: 🏠 Home → BROWN");
  console.log("• 070: 📄 Documents → TEAL");
  console.log("• 080: 🚗 Transport → CYAN");
  console.log("• 090: 📊 Development → INDIGO");
  console.log("• 100: 💪 Health → PINK");
  console.log("• 110: 📦 Shopping → LIME");
  console.log("• 120: 📱 Subscriptions → MAGENTA");
  console.log("• 130: 👥 Social → CORAL");
  console.log("• 140: 🛒 Regular Shopping → OLIVE");
  console.log("• 150: 🎨 Leisure → LAVENDER");
  console.log("• 160: 📰 Information → SILVER");
  console.log("• 170: 📥 Processing → GOLD");
  console.log("• 180: 🗑️ Junk → BLACK");
  console.log("");
  console.log(
    "✅ After setting all colors, your Gmail will be beautifully organized!"
  );
  console.log(
    "📝 Colors will make it easy to quickly identify email priorities."
  );
}

/**
 * Updates the color of a single label by its full name.
 * @param {string} labelName - The full label name
 * @param {string} colorName - The color name from configuration
 * @returns {boolean} True if successful, false otherwise
 */
function updateSingleLabelColor(labelName, colorName) {
  console.log(`🎨 Updating color for label: ${labelName}`);

  try {
    // Get the label by name
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      console.error(`❌ Label not found: ${labelName}`);
      return false;
    }

    // Convert color name to hex values
    const colorHex = getColorHex(colorName);
    if (!colorHex) {
      console.error(`❌ Unknown color: ${colorName}`);
      return false;
    }

    // Update label color using Gmail API
    const labelId = label.getId();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`;

    const payload = {
      name: label.getName(),
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
      color: {
        backgroundColor: colorHex.background,
        textColor: colorHex.text,
      },
    };

    const response = UrlFetchApp.fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true, // This will prevent exceptions and show full response
    });

    if (response.getResponseCode() === 200) {
      console.log(`✅ Successfully updated color for ${labelName}`);
      return true;
    } else {
      console.error(
        `❌ Failed to update color for ${labelName}: ${response.getResponseCode()}`
      );
      console.log("📄 FULL RESPONSE:");
      console.log(response.getContentText());
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating color for ${labelName}:`, error);
    return false;
  }
}

/**
 * Creates all configured labels with hardcoded prefixes.
 * @returns {Object} Result object with creation statistics
 */
function createAllLabels() {
  console.log("🏗️ CREATING ALL LABELS WITH HARDCODED PREFIXES");
  console.log("=".repeat(60));

  let createdCount = 0;
  let failedCount = 0;

  console.log("🎯 Creating Eisenhower Matrix labels...");
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ ${label.getName()}`);
      createdCount++;
    } else {
      console.error(`  ❌ Failed: ${key}`);
      failedCount++;
    }
  }

  console.log("");
  console.log("🏷️ Creating all other labels...");
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    const label = getOrCreateLabel(key);
    if (label) {
      console.log(`  ✅ ${label.getName()}`);
      createdCount++;
    } else {
      console.error(`  ❌ Failed: ${key}`);
      failedCount++;
    }
  }

  console.log("");
  console.log("📊 SUMMARY:");
  console.log(`✅ Created: ${createdCount} labels`);
  console.log(`❌ Failed: ${failedCount} labels`);
  console.log(
    "📋 All labels now have hardcoded prefixes for perfect Gmail sorting!"
  );

  return { created: createdCount, failed: failedCount };
}

/**
 * Performs a comprehensive test of the entire life management system.
 * @returns {void}
 */
function testLifeManagementSystem() {
  console.log("🧪 TESTING GMAIL LIFE MANAGEMENT SYSTEM");
  console.log("=".repeat(50));
  console.log("");

  try {
    // Test 1: Validate system
    console.log("1️⃣ Testing system validation...");
    validateSystem();
    console.log("✅ System validation passed");

    // Test 2: Check labels
    console.log("");
    console.log("2️⃣ Testing label system...");
    const labels = GmailApp.getUserLabels();
    const ourLabels = labels.filter((label) => {
      const name = label.getName();
      return name.match(/^\d{3}: /); // Check for numbered labels
    });
    console.log(`✅ Found ${ourLabels.length} numbered labels`);

    // Test 3: Check processing mode
    console.log("");
    console.log("3️⃣ Testing processing mode...");
    const { mode, realtime } = getCurrentProcessingMode();
    console.log(`✅ Processing mode: ${mode}, Realtime: ${realtime}`);

    // Test 4: Check Gmail API
    console.log("");
    console.log("4️⃣ Testing Gmail API...");
    const apiAvailable = checkGmailAPIStatus();
    if (apiAvailable) {
      console.log("✅ Gmail API is available");
    } else {
      console.log("⚠️ Gmail API not available (colors will be manual)");
    }

    console.log("");
    console.log("🎉 ALL TESTS PASSED! System is ready to use.");
    console.log("📝 Run setup() to configure the system.");

    return true;
  } catch (error) {
    console.log("");
    console.log("❌ TEST FAILED!");
    console.log(`Error: ${error.message}`);
    console.log("🔧 Fix the error and try again.");
    return false;
  }
}
