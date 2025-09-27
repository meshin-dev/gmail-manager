/**
 * Applies priority-specific actions based on Eisenhower Matrix quadrant.
 * @param {GmailThread} thread - The Gmail thread to apply actions to
 * @param {Object} analysis - The AI analysis results
 * @param {Object} quadrant - The Eisenhower Matrix quadrant configuration
 * @returns {void}
 */
function applyPriorityActions(thread, analysis, quadrant) {
  console.log("🔍 applyPriorityActions called with quadrant:", quadrant);
  console.log("🔍 Analysis eisenhower_quadrant:", analysis.eisenhower_quadrant);

  // Use the quadrant name to determine priority actions
  switch (analysis.eisenhower_quadrant) {
    case "URGENT_IMPORTANT": // 🔴 Urgent + Important - immediate actions
      console.log(
        "🔍 Processing URGENT_IMPORTANT - calling scheduleUrgentReminder"
      );
      thread.markImportant();
      // Note: Gmail API doesn't support programmatic starring
      // Users can manually star important emails
      // Create calendar reminder for all urgent + important emails
      scheduleUrgentReminder(thread, analysis);
      break;

    case "NOT_URGENT_IMPORTANT": // 🟠 Not Urgent + Important - plan
      console.log("🔍 Processing NOT_URGENT_IMPORTANT - planning");
      thread.markImportant();
      applyLabelWithTrashLogic(thread, "TO_PLAN");
      break;

    case "URGENT_NOT_IMPORTANT": // 🟡 Urgent + Not Important - delegate/minimize
      console.log("🔍 Processing URGENT_NOT_IMPORTANT - delegate");
      applyLabelWithTrashLogic(thread, "DELEGATE");
      break;

    case "NOT_URGENT_NOT_IMPORTANT": // ⚫ Not Urgent + Not Important - archive/delete
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
 * Parses task due date from various formats.
 * @param {string} dueDateString - The due date string (e.g., "tomorrow", "2025-09-28", "next Friday")
 * @returns {string|null} ISO date string or null if parsing failed
 */
function parseTaskDueDate(dueDateString) {
  if (!dueDateString) return null;

  const lowerDate = dueDateString.toLowerCase().trim();
  const now = new Date();

  try {
    // Handle "tomorrow"
    if (lowerDate === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    // Handle "next friday", "next monday", etc.
    if (lowerDate.startsWith("next ")) {
      const dayName = lowerDate.replace("next ", "");
      const dayMap = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };

      if (dayMap[dayName]) {
        const nextDay = new Date(now);
        const daysUntilTarget = (dayMap[dayName] - now.getDay() + 7) % 7;
        nextDay.setDate(
          nextDay.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget)
        );
        return nextDay.toISOString().split("T")[0];
      }
    }

    // Handle ISO date format (YYYY-MM-DD)
    if (lowerDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return lowerDate;
    }

    // Handle "this friday", "this monday", etc.
    if (lowerDate.startsWith("this ")) {
      const dayName = lowerDate.replace("this ", "");
      const dayMap = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };

      if (dayMap[dayName]) {
        const thisDay = new Date(now);
        const daysUntilTarget = (dayMap[dayName] - now.getDay() + 7) % 7;
        thisDay.setDate(
          thisDay.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget)
        );
        return thisDay.toISOString().split("T")[0];
      }
    }

    // Try to parse as a regular date
    const parsedDate = new Date(dueDateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split("T")[0];
    }

    console.log(`⚠️ Could not parse due date: ${dueDateString}`);
    return null;
  } catch (error) {
    console.error(`❌ Error parsing due date "${dueDateString}":`, error);
    return null;
  }
}
