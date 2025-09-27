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

    // Note: Inbox behavior is now handled by keepInInbox logic in processEmailThread
    // This ensures emails stay in inbox when keepInInbox: true
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
