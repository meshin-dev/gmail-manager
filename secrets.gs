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
