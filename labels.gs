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

  // 2. Create Google Task if needed (for self-sent emails with actionable items)
  if (
    analysis.is_self_sent &&
    analysis.task_creation &&
    analysis.task_creation.should_create_task
  ) {
    console.log(
      "📝 Self-sent email with actionable items - creating Google Task"
    );
    const createdTask = createGoogleTask(
      analysis,
      thread.getFirstMessageSubject()
    );
    if (createdTask) {
      console.log(`✅ Task created: ${createdTask.title}`);
    } else {
      console.log("❌ Failed to create task");
    }
  }

  // 3. Add labels for ALL life categories
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

  // 4. Add Eisenhower Matrix label (determined by cumulative category flags)
  console.log(
    `🎯 Applying Eisenhower Matrix label: ${analysis.eisenhower_quadrant}`
  );
  const quadrant = CONFIG.EISENHOWER_MATRIX[analysis.eisenhower_quadrant];
  if (quadrant) {
    const priorityLabel = getOrCreateLabel(analysis.eisenhower_quadrant);
    if (priorityLabel) {
      thread.addLabel(priorityLabel);
      console.log(`   ✓ Added priority label: ${priorityLabel.getName()}`);
    }

    // Apply corresponding priority actions
    applyPriorityActions(thread, analysis, quadrant);

    // Handle inbox behavior based on keepInInbox flag
    console.log(`🔍 Quadrant keepInInbox value: ${quadrant.keepInInbox}`);
    console.log(`🔍 Quadrant name: ${quadrant.name}`);

    if (quadrant.keepInInbox) {
      // Keep in inbox for urgent/important items
      console.log(
        `📥 Keeping email in inbox (${analysis.eisenhower_quadrant})`
      );
    } else {
      // Move out of inbox for not urgent + not important items
      console.log(
        `📤 Moving email out of inbox (${analysis.eisenhower_quadrant})`
      );
      thread.moveToArchive();
    }
  }

  // 5. Additional labels based on analysis
  if (analysis.action_needed) {
    applyLabelWithTrashLogic(thread, "REQUIRES_ACTION");
  }

  if (analysis.deadline) {
    applyLabelWithTrashLogic(thread, "HAS_DEADLINE");
  }
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
  console.log(`🔍 getOrCreateLabel called with: ${labelKey}`);

  // Get the hardcoded label name from config
  let labelName;
  let label;

  if (
    typeof labelKey === "string" &&
    (CONFIG.LABELS[labelKey] || CONFIG.EISENHOWER_MATRIX[labelKey])
  ) {
    // Label key (like "REQUIRES_ACTION") - get hardcoded name
    labelName = getLabelName(labelKey);
    console.log(`🔍 Found config for ${labelKey}, labelName: ${labelName}`);
  } else if (typeof labelKey === "string" && labelKey.includes(":")) {
    // Already hardcoded label name (like "010: ⚡ Requires Action")
    labelName = labelKey;
    console.log(`🔍 Using hardcoded labelName: ${labelName}`);
  } else {
    console.error(`❌ Invalid labelKey: ${labelKey}`);
    return null;
  }

  if (!labelName) {
    console.error(`❌ Could not determine label name for: ${labelKey}`);
    return null;
  }

  console.log(`🔍 Looking for existing label: ${labelName}`);
  label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    console.log(`🔍 Label not found, creating: ${labelName}`);
    label = GmailApp.createLabel(labelName);
    console.log(`🏷️ Created label: ${labelName}`);
  } else {
    console.log(`🔍 Found existing label: ${labelName}`);
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
