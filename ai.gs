/**
 * Analyzes an email using ChatGPT with enhanced configuration context.
 * @param {Object} emailData - The email data object containing subject, sender, body, etc.
 * @returns {Object|null} The AI analysis result or null if failed
 */
function analyzeEmailWithChatGPT(emailData) {
  const categoriesList = Object.entries(CONFIG.LABELS)
    .map(([key, config]) => `${key}: ${config.name}`)
    .join("\n");

  // Build configuration context for GPT
  const configContext = buildConfigurationContext();

  const prompt = `
You are an expert email management AI with access to a comprehensive configuration system. Your task is to analyze emails and categorize them accurately based on the provided configuration.

${configContext}

EMAIL TO ANALYZE:
Subject: ${emailData.subject}
Sender: ${emailData.sender}
Text: ${emailData.body.substring(0, 2000)}

ANALYSIS REQUIREMENTS:
1. Identify ALL relevant life categories (emails can have multiple categories)
2. Be aware of urgency/importance flags for each category
3. Consider trash-worthy categories (SPAM, JUNK, PHISHING)
4. Look for action items, deadlines, and priority indicators
5. Consider sender reputation and email content quality

Return JSON:
{
  "categories": ["array_of_category_keys", "can_be_multiple"],
  "confidence": 0.95,
  "reasoning": "detailed explanation of category choices and urgency/importance assessment",
  "is_spam_or_junk": false,
  "action_needed": true|false,
  "deadline": "deadline if exists",
  "estimated_time": "time to complete",
  "suggested_action": "what needs to be done",
  "summary": "brief email summary"
}
`;

  const payload = {
    model: CONFIG.GPT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert in productivity and email management. Analyze emails and categorize them by ALL relevant life areas. Be aware of the configuration context provided and make accurate decisions about urgency, importance, and appropriate categorization. One email can relate to multiple categories simultaneously.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 800,
    temperature: 0.1,
  };

  try {
    // Get API key from secrets or fallback to config
    const apiKey = getSecret("OPENAI_API_KEY") || CONFIG.OPENAI_API_KEY;

    if (!apiKey || apiKey === "your-openai-api-key-here") {
      console.error(
        '❌ OpenAI API key not configured. Please set it using setSecret("OPENAI_API_KEY", "your-key")'
      );
      return null;
    }

    const response = UrlFetchApp.fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        payload: JSON.stringify(payload),
      }
    );

    const responseText = response.getContentText();
    const data = JSON.parse(responseText);

    if (data.error) {
      console.error("❌ OpenAI API Error:", data.error);
      return null;
    }

    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          // Determine Eisenhower quadrant based on isUrgent/isImportant flags
          analysis.eisenhower_quadrant = determineEisenhowerQuadrant(
            analysis.categories
          );
          return analysis;
        } catch (parseError) {
          console.error("❌ Error parsing ChatGPT response:", parseError);
          return null;
        }
      }
    }
  } catch (error) {
    console.error("❌ ChatGPT API Error:", error);
    return null;
  }
}

/**
 * Builds a comprehensive configuration context string for ChatGPT analysis.
 * @returns {string} The configuration context string
 */
function buildConfigurationContext() {
  let context = "CONFIGURATION CONTEXT:\n\n";

  // Eisenhower Matrix context
  context += "EISENHOWER MATRIX QUADRANTS:\n";
  for (const [key, config] of Object.entries(CONFIG.EISENHOWER_MATRIX)) {
    context += `- ${key}: ${config.name} (keepInInbox: ${config.keepInInbox})\n`;
  }
  context += "\n";

  // High priority categories (urgent + important)
  context += "HIGH PRIORITY CATEGORIES (Urgent + Important):\n";
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.isUrgent && config.isImportant) {
      context += `- ${key}: ${config.name}\n`;
    }
  }
  context += "\n";

  // Important but not urgent categories
  context += "IMPORTANT CATEGORIES (Not Urgent + Important):\n";
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (!config.isUrgent && config.isImportant) {
      context += `- ${key}: ${config.name}\n`;
    }
  }
  context += "\n";

  // Urgent but not important categories
  context += "URGENT CATEGORIES (Urgent + Not Important):\n";
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.isUrgent && !config.isImportant) {
      context += `- ${key}: ${config.name}\n`;
    }
  }
  context += "\n";

  // Trash-worthy categories
  context += "TRASH-WORTHY CATEGORIES (Will be moved to trash):\n";
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.moveToTrash) {
      context += `- ${key}: ${config.name}\n`;
    }
  }
  context += "\n";

  // Low priority categories
  context += "LOW PRIORITY CATEGORIES (Not Urgent + Not Important):\n";
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (!config.isUrgent && !config.isImportant && !config.moveToTrash) {
      context += `- ${key}: ${config.name}\n`;
    }
  }
  context += "\n";

  // Category examples for better understanding
  context += "CATEGORY EXAMPLES:\n";
  context +=
    "- Medical bill = HEALTH + BILLS + MEDICAL (all urgent+important)\n";
  context +=
    "- Work trip = WORK + TRAVEL + TICKETS (work important, travel urgent)\n";
  context +=
    "- Family insurance = FAMILY + INSURANCE + CHILDREN (all important)\n";
  context += "- Spam email = SPAM (trash-worthy)\n";
  context += "- Newsletter = NEWSLETTERS (low priority)\n";
  context += "- Meeting request = MEETINGS (urgent but not important)\n";
  context +=
    "- Investment opportunity = INVESTMENTS (important but not urgent)\n";

  return context;
}

/**
 * Determines the Eisenhower Matrix quadrant based on category urgency and importance flags.
 * @param {Array<string>} categories - Array of category keys
 * @returns {string} The Eisenhower Matrix quadrant key
 */
function determineEisenhowerQuadrant(categories) {
  if (!categories || categories.length === 0) {
    return "NOT_URGENT_NOT_IMPORTANT";
  }

  let isUrgent = false;
  let isImportant = false;

  // Check each category's isUrgent and isImportant flags
  for (const category of categories) {
    const labelConfig = CONFIG.LABELS[category];
    if (labelConfig) {
      if (labelConfig.isUrgent) isUrgent = true;
      if (labelConfig.isImportant) isImportant = true;
    }
  }

  // Determine quadrant based on flags
  if (isUrgent && isImportant) {
    return "URGENT_IMPORTANT";
  } else if (!isUrgent && isImportant) {
    return "NOT_URGENT_IMPORTANT";
  } else if (isUrgent && !isImportant) {
    return "URGENT_NOT_IMPORTANT";
  } else {
    return "NOT_URGENT_NOT_IMPORTANT";
  }
}

/**
 * Validates the AI analysis result to ensure it contains valid categories.
 * @param {Object} analysis - The AI analysis result
 * @returns {boolean} True if analysis is valid, false otherwise
 */
function validateAnalysisResult(analysis) {
  if (
    !analysis ||
    !analysis.categories ||
    !Array.isArray(analysis.categories)
  ) {
    return false;
  }

  // Check if categories exist in config
  for (const category of analysis.categories) {
    if (!CONFIG.LABELS[category]) {
      console.warn(`⚠️ Unknown category in analysis: ${category}`);
      return false;
    }
  }

  return true;
}

/**
 * Enhances the AI analysis with configuration context and validation.
 * @param {Object} analysis - The raw AI analysis result
 * @returns {Object|null} The enhanced analysis or null if invalid
 */
function enhanceAnalysisWithContext(analysis) {
  if (!analysis) return null;

  // Add configuration awareness
  analysis.configAware = true;

  // Validate categories against config
  const validCategories = analysis.categories.filter(
    (category) => CONFIG.LABELS[category]
  );
  if (validCategories.length !== analysis.categories.length) {
    console.warn("⚠️ Some categories were filtered out as invalid");
    analysis.categories = validCategories;
  }

  // Add priority insights
  analysis.priorityInsights = generatePriorityInsights(analysis.categories);

  return analysis;
}

/**
 * Generates priority insights based on category urgency and importance flags.
 * @param {Array<string>} categories - Array of category keys
 * @returns {Object} Object containing priority insights
 */
function generatePriorityInsights(categories) {
  const insights = {
    hasUrgentItems: false,
    hasImportantItems: false,
    hasTrashItems: false,
    priorityLevel: "low",
  };

  for (const category of categories) {
    const config = CONFIG.LABELS[category];
    if (config) {
      if (config.isUrgent) insights.hasUrgentItems = true;
      if (config.isImportant) insights.hasImportantItems = true;
      if (config.moveToTrash) insights.hasTrashItems = true;
    }
  }

  // Determine priority level
  if (insights.hasUrgentItems && insights.hasImportantItems) {
    insights.priorityLevel = "critical";
  } else if (insights.hasUrgentItems || insights.hasImportantItems) {
    insights.priorityLevel = "high";
  } else if (insights.hasTrashItems) {
    insights.priorityLevel = "trash";
  }

  return insights;
}

/**
 * Tests the AI analysis capabilities with sample emails.
 * @returns {void}
 */
function testAIAnalysis() {
  console.log("🧪 Testing AI analysis capabilities...");

  const testEmails = [
    {
      subject: "Medical bill due tomorrow",
      sender: "hospital@example.com",
      body: "Your medical bill of $500 is due tomorrow. Please pay online.",
    },
    {
      subject: "Spam: Win $1000 now!",
      sender: "spam@fake.com",
      body: "Click here to win $1000! Limited time offer!",
    },
    {
      subject: "Meeting tomorrow at 2pm",
      sender: "colleague@company.com",
      body: "Let's discuss the project tomorrow at 2pm in conference room A.",
    },
  ];

  for (const email of testEmails) {
    console.log(`\n📧 Testing: ${email.subject}`);
    const analysis = analyzeEmailWithChatGPT(emailData);
    if (analysis) {
      console.log(`✅ Categories: ${analysis.categories.join(", ")}`);
      console.log(`📊 Quadrant: ${analysis.eisenhower_quadrant}`);
      console.log(
        `🎯 Priority: ${analysis.priorityInsights?.priorityLevel || "unknown"}`
      );
    } else {
      console.log("❌ Analysis failed");
    }
  }
}
