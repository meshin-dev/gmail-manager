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
You are an expert email management AI specializing in precise categorization and urgency/importance assessment. Analyze this email with extreme attention to detail.

${configContext}

EMAIL TO ANALYZE:
Subject: ${emailData.subject}
Sender: ${emailData.sender}
Text: ${emailData.body.substring(0, 2000)}

CRITICAL ANALYSIS INSTRUCTIONS:

1. **CATEGORY IDENTIFICATION**: 
   - Read the email content CAREFULLY
   - Identify the PRIMARY life area this email relates to
   - Look for keywords, context, and subject matter
   - Consider the sender and their relationship to you
   - Family emails: birthdays, family events, relatives, family planning, family health
   - Work emails: projects, meetings, deadlines, colleagues, business
   - Health emails: medical appointments, health concerns, fitness
   - Financial emails: bills, investments, banking, taxes, money management

2. **URGENCY ASSESSMENT**:
   - URGENT = Has immediate deadline, requires quick action, time-sensitive
   - NOT URGENT = Can be planned, scheduled, or done later
   - Look for words like: "urgent", "asap", "deadline", "today", "immediately", "quickly"
   - Consider if the task can wait or must be done now

3. **IMPORTANCE ASSESSMENT**:
   - IMPORTANT = Affects your life goals, relationships, health, finances, career
   - NOT IMPORTANT = Trivial, entertainment, low-priority tasks
   - Family matters are usually IMPORTANT
   - Work deadlines are usually IMPORTANT
   - Health issues are usually IMPORTANT
   - Financial matters are usually IMPORTANT

4. **SPECIAL CONSIDERATIONS**:
   - Family-related emails (birthdays, family events, relatives) = FAMILY category + IMPORTANT
   - Work-related emails = WORK category + usually IMPORTANT
   - Health-related emails = HEALTH category + usually IMPORTANT
   - Financial emails = FINANCIAL category + usually IMPORTANT
   - Spam/junk/phishing = mark as trash-worthy

5. **CALENDAR SCHEDULING FOR URGENT + IMPORTANT**:
   - If email is identified as URGENT + IMPORTANT, analyze the content for timing cues
   - ONLY suggest calendar timing if the email clearly states a FINAL date/time
   - DO NOT create calendar events for emails that are:
     * From Google Calendar, Outlook, or other calendar systems
     * About events already scheduled/planned
     * Reminders for existing calendar events
     * Meeting invitations or calendar notifications
     * Any email that mentions "already scheduled", "in your calendar", "event created"
   - CRITICAL: Return SPECIFIC, PARSEABLE dates in ISO format or specific time format
   - Examples of CORRECT suggested_time format:
     * "2025-09-28T14:00:00" (ISO format)
     * "tomorrow 2pm" (specific time)
     * "2025-09-28 14:00" (date and time)
     * "Friday 3pm" (day and time)
   - Examples of INCORRECT suggested_time format:
     * "tomorrow after lunch" (too vague)
     * "sometime this week" (too vague)
     * "when convenient" (too vague)

6. **LANGUAGE ANALYSIS**:
   - Russian text: "Важное напоминание себе" = "Important reminder to myself"
   - "Нужно забить все дни рождения" = "Need to enter all birthdays"
   - "родственников и друзей" = "relatives and friends" = FAMILY category
   - "Срочно и важно" = "Urgent and important" = URGENT + IMPORTANT

Return JSON with precise analysis:
{
  "categories": ["PRIMARY_CATEGORY_KEY"],
  "confidence": 0.95,
  "reasoning": "Detailed step-by-step analysis: 1) Content analysis, 2) Category identification, 3) Urgency assessment, 4) Importance assessment, 5) Final decision",
  "is_spam_or_junk": false,
  "action_needed": true,
  "deadline": "specific deadline if mentioned",
  "estimated_time": "realistic time estimate",
  "suggested_action": "specific action to take",
  "summary": "concise email summary",
  "ai_urgent": true|false,
  "ai_important": true|false,
  "calendar_scheduling": {
    "suggested_time": "SPECIFIC parseable date/time (e.g., '2025-09-28T14:00:00', 'tomorrow 2pm', 'Friday 3pm') - NO vague terms like 'after lunch'",
    "scheduling_reason": "explanation of why this timing was chosen",
    "is_ai_suggested": true|false,
    "ignoreCalendarEventCreation": true|false
  }
}

CRITICAL: Use ONLY the category KEYS (like "FAMILY", "WORK", "HEALTH") in the categories array, NOT the full label names with numbers and emojis.

URGENCY/IMPORTANCE ASSESSMENT:
- ai_urgent: Set to true if the email requires immediate action, has deadlines, or is time-sensitive
- ai_important: Set to true if the email affects your life goals, relationships, health, finances, or career
- These will be used as baseline, then overridden by any TRUE values from assigned category labels

CALENDAR EVENT CREATION ASSESSMENT:
- ignoreCalendarEventCreation: Set to true if the email is:
  * From Google Calendar, Outlook, or other calendar systems
  * About events already scheduled/planned
  * Reminders for existing calendar events
  * Meeting invitations or calendar notifications
  * Any email that mentions "already scheduled", "in your calendar", "event created"
  * Vague timing like "sometime this week", "when convenient", "let's meet"
- Set to false only if the email clearly states a FINAL, specific date/time for a NEW task/event

CRITICAL: CALENDAR TIME FORMAT REQUIREMENTS:
- ALWAYS return specific, parseable dates in suggested_time
- PREFERRED formats: "2025-09-28T14:00:00" or "tomorrow 2pm" or "Friday 3pm"
- NEVER use vague terms like "after lunch", "sometime", "when convenient"
- If email says "tomorrow after lunch", convert to "tomorrow 2pm"
- If email says "this Friday", convert to "Friday 9am" or specific time
- If email says "next week", convert to specific date like "2025-10-03T09:00:00"
`;

  const payload = {
    model: CONFIG.GPT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert email categorization AI with deep understanding of urgency, importance, and life categories. You excel at analyzing email content, identifying primary categories, and making precise urgency/importance assessments. You understand multiple languages including Russian and can accurately translate and categorize content. You always provide detailed reasoning for your decisions and focus on the PRIMARY category that best fits the email content.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0.05,
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
          // Determine Eisenhower quadrant based on AI assessment and label flags
          analysis.eisenhower_quadrant = determineEisenhowerQuadrant(
            analysis.categories,
            analysis
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

  // Category keys reference
  context += "AVAILABLE CATEGORY KEYS (use these in your response):\n";
  const allKeys = Object.keys(CONFIG.LABELS);
  context += allKeys.join(", ") + "\n";
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
  context += "- Family birthdays = FAMILY (important, not urgent)\n";
  context += "- Russian family emails = FAMILY (important, not urgent)\n";
  context += "\n";

  // Russian keywords for better categorization
  context += "RUSSIAN KEYWORDS FOR CATEGORIZATION:\n";
  context +=
    "- Family: 'родственников', 'друзей', 'семья', 'дни рождения', 'семейные'\n";
  context += "- Urgent: 'срочно', 'urgent', 'asap', 'немедленно'\n";
  context += "- Important: 'важно', 'important', 'важное', 'критично'\n";
  context += "- Work: 'работа', 'проект', 'встреча', 'дедлайн'\n";
  context += "- Health: 'здоровье', 'врач', 'больница', 'медицинский'\n";
  context += "\n";

  context +=
    "- Investment opportunity = INVESTMENTS (important but not urgent)\n";

  return context;
}

/**
 * Finds the category key from a full label name (e.g., "150: 👨‍👩‍👧‍👦 Family" -> "FAMILY").
 * @param {string} labelName - The full label name with number prefix
 * @returns {string|null} The category key or null if not found
 */
function findCategoryKeyFromLabelName(labelName) {
  // Search through all labels to find one that matches the name
  for (const [key, config] of Object.entries(CONFIG.LABELS)) {
    if (config.name === labelName) {
      return key;
    }
  }
  return null;
}

/**
 * Determines the Eisenhower Matrix quadrant based on AI assessment and category flags.
 * @param {Array<string>} categories - Array of category keys or full label names
 * @param {Object} analysis - The AI analysis object with ai_urgent and ai_important flags
 * @returns {string} The Eisenhower Matrix quadrant key
 */
function determineEisenhowerQuadrant(categories, analysis = null) {
  if (!categories || categories.length === 0) {
    console.log(
      "🎯 No categories provided - defaulting to NOT_URGENT_NOT_IMPORTANT"
    );
    return "NOT_URGENT_NOT_IMPORTANT";
  }

  // Start with AI assessment as baseline
  let isUrgent = analysis?.ai_urgent || false;
  let isImportant = analysis?.ai_important || false;
  const urgentCategories = [];
  const importantCategories = [];

  console.log(
    `🎯 Analyzing categories for urgency/importance: [${categories.join(", ")}]`
  );
  console.log(`🎯 AI baseline: urgent=${isUrgent}, important=${isImportant}`);

  // Check each category's isUrgent and isImportant flags
  for (const category of categories) {
    // Try to find the category key - it might be a full label name or just the key
    let categoryKey = category;
    let labelConfig = CONFIG.LABELS[category];

    // If not found, try to extract the key from the full label name
    if (!labelConfig) {
      categoryKey = findCategoryKeyFromLabelName(category);
      if (categoryKey) {
        labelConfig = CONFIG.LABELS[categoryKey];
        console.log(
          `   🔍 Extracted key "${categoryKey}" from label name "${category}"`
        );
      }
    }

    if (labelConfig) {
      // Override with TRUE values from labels (but don't override FALSE to TRUE from AI)
      if (labelConfig.isUrgent) {
        isUrgent = true;
        urgentCategories.push(categoryKey);
      }
      if (labelConfig.isImportant) {
        isImportant = true;
        importantCategories.push(categoryKey);
      }
      console.log(
        `   ${categoryKey}: urgent=${labelConfig.isUrgent}, important=${labelConfig.isImportant}`
      );
    } else {
      console.warn(`⚠️ Category config not found: ${category}`);
    }
  }

  // Log cumulative results
  console.log(
    `🎯 Cumulative analysis: urgent=${isUrgent}, important=${isImportant}`
  );
  if (urgentCategories.length > 0) {
    console.log(`   Urgent categories: [${urgentCategories.join(", ")}]`);
  }
  if (importantCategories.length > 0) {
    console.log(`   Important categories: [${importantCategories.join(", ")}]`);
  }

  // Determine quadrant based on flags
  let quadrant;
  if (isUrgent && isImportant) {
    quadrant = "URGENT_IMPORTANT";
  } else if (!isUrgent && isImportant) {
    quadrant = "NOT_URGENT_IMPORTANT";
  } else if (isUrgent && !isImportant) {
    quadrant = "URGENT_NOT_IMPORTANT";
  } else {
    quadrant = "NOT_URGENT_NOT_IMPORTANT";
  }

  console.log(`🎯 Final quadrant: ${quadrant}`);
  return quadrant;
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
