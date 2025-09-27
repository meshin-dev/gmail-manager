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
