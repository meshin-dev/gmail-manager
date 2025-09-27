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
You are an expert email management AI specializing in precise categorization, urgency/importance assessment, and intelligent spam detection. Analyze this email with extreme attention to detail.

${configContext}

EMAIL TO ANALYZE:
Subject: ${emailData.subject}
From: ${emailData.from || emailData.sender}
To: ${emailData.to || "Not specified"}
Sender: ${emailData.sender}
Text: ${emailData.body.substring(0, 2000)}

CRITICAL ANALYSIS INSTRUCTIONS:

1. **SPAM & FRAUD DETECTION (PRIORITY #1)**:
   - CRITICAL: If From and To are the same email address (self-sent email), SKIP spam detection entirely and proceed to regular categorization
   - Self-sent emails are NEVER spam - they are personal reminders, notes, or tasks
   - ONLY if NOT self-sent: check if this email is spam, junk, phishing, or fraud
   - IMMEDIATELY categorize as SPAM, JUNK, or PHISHING if detected (but NEVER for self-sent emails)
   - Common spam indicators:
     * Suspicious sender domains (fake, misspelled, random characters)
     * Generic greetings ("Dear Customer", "Dear Sir/Madam")
     * Urgent money offers, prizes, lottery winnings
     * Requests for personal information, passwords, bank details
     * Poor grammar, excessive capitalization, multiple exclamation marks
     * Suspicious links, attachments, or "click here" requests
     * Claims of "limited time offers", "act now", "urgent response required"
     * Fake invoices, bills, or payment requests from unknown sources
     * Impersonation of banks, government agencies, or well-known companies
     * Cryptocurrency, investment scams, get-rich-quick schemes
     * Romance scams, fake dating profiles
     * Tech support scams, fake virus warnings
     * Phishing attempts asking to "verify account", "update information"
   - Multilingual spam detection:
     * Russian: "выиграли", "приз", "деньги", "срочно переведите", "подтвердите данные"
     * English: "congratulations", "winner", "claim prize", "verify account", "urgent transfer"
     * Common across languages: suspicious URLs, poor translation, urgent tone
   - Sender reputation analysis:
     * Unknown senders with suspicious domains
     * Senders impersonating legitimate companies
     * Generic email addresses (noreply@random-domain.com)
   - Content analysis:
     * Requests for money, personal info, or urgent action
     * Too-good-to-be-true offers
     * Threatening language or false urgency
     * Mismatched sender and content (bank email from gmail.com)

2. **CATEGORY IDENTIFICATION** (if not spam):
   - Read the email content CAREFULLY
   - Identify the PRIMARY life area this email relates to
   - Look for keywords, context, and subject matter
   - Consider the sender and their relationship to you
   - Family emails: birthdays, family events, relatives, family planning, family health
   - Work emails: projects, meetings, deadlines, colleagues, business
   - Health emails: medical appointments, health concerns, fitness
   - Financial emails: bills, investments, banking, taxes, money management

3. **URGENCY ASSESSMENT** (if not spam):
   - URGENT = Has immediate deadline, requires quick action, time-sensitive
   - NOT URGENT = Can be planned, scheduled, or done later
   - Look for words like: "urgent", "asap", "deadline", "today", "immediately", "quickly"
   - Consider if the task can wait or must be done now
   - SPAM/FRAUD emails are NEVER truly urgent (even if they claim to be)

4. **IMPORTANCE ASSESSMENT** (if not spam):
   - IMPORTANT = Affects your life goals, relationships, health, finances, career
   - NOT IMPORTANT = Trivial, entertainment, low-priority tasks
   - Family matters are usually IMPORTANT
   - Work deadlines are usually IMPORTANT
   - Health issues are usually IMPORTANT
   - Financial matters are usually IMPORTANT
   - SPAM/FRAUD emails are NEVER important

5. **SPECIAL CONSIDERATIONS**:
   - Family-related emails (birthdays, family events, relatives) = FAMILY category + IMPORTANT
   - Work-related emails = WORK category + usually IMPORTANT
   - Health-related emails = HEALTH category + usually IMPORTANT
   - Financial emails = FINANCIAL category + usually IMPORTANT
   - SPAM/JUNK/PHISHING = automatically mark as trash-worthy, NOT urgent, NOT important

6. **CALENDAR SCHEDULING FOR URGENT + IMPORTANT** (NEVER for spam):
   - If email is identified as URGENT + IMPORTANT, analyze the content for timing cues
   - ONLY suggest calendar timing if the email clearly states a FINAL date/time
   - DO NOT create calendar events for emails that are:
     * SPAM, JUNK, or PHISHING (NEVER create calendar events for these)
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

6. **TASK CREATION ANALYSIS** (for self-sent emails):
   - If email is self-sent and contains actionable items, consider creating a Google Task
   - Look for task indicators: "need to", "should", "must", "remind me to", "don't forget", "todo", "task"
   - Russian task indicators: "нужно", "должен", "напомни", "не забудь", "задача", "делать"
   - Create task if email contains specific actionable items that need to be done
   - Task title should be clear and actionable (e.g., "Add family birthdays to calendar")
   - **CRITICAL: Task notes must preserve EVERY detail from the original email with grammar/spelling corrections:**
     * Include the COMPLETE original email content with corrected grammar and spelling
     * Fix any typos, grammatical errors, or unclear sentences
     * Include ALL names, dates, times, locations, amounts, phone numbers
     * Include ALL specific requirements, deadlines, and constraints
     * Include the original subject line (also corrected if needed)
     * Include any references to attachments, links, or external resources
     * NEVER summarize, condense, or lose any information
     * Format: "ORIGINAL EMAIL (CORRECTED):\nSubject: [corrected subject]\nContent: [corrected email body with proper grammar and spelling]\n\nTASK CONTEXT: [additional context]"
   - Set due date if mentioned in email, otherwise leave empty
   - Priority: high for urgent+important, normal for important, low for others

7. **LANGUAGE ANALYSIS**:
   - Russian text: "Важное напоминание себе" = "Important reminder to myself"
   - "Нужно забить все дни рождения" = "Need to enter all birthdays"
   - "родственников и друзей" = "relatives and friends" = FAMILY category
   - "Срочно и важно" = "Urgent and important" = URGENT + IMPORTANT
   - Russian spam: "выиграли приз" = "won prize", "подтвердите данные" = "confirm data"

Return JSON with precise analysis:
{
  "categories": ["PRIMARY_CATEGORY_KEY"],
  "confidence": 0.95,
  "reasoning": "Detailed step-by-step analysis: 1) Self-sent check, 2) Spam detection (if not self-sent), 3) Content analysis, 4) Category identification, 5) Urgency assessment, 6) Importance assessment, 7) Final decision",
  "is_self_sent": true|false,
  "is_spam_or_junk": true|false,
  "spam_indicators": ["list of detected spam indicators if any"],
  "action_needed": true|false,
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
  },
  "task_creation": {
    "should_create_task": true|false,
    "task_title": "specific task title if task should be created",
    "task_notes": "ORIGINAL EMAIL (CORRECTED):\nSubject: [corrected subject]\nContent: [corrected email body with proper grammar and spelling, preserving ALL details]\n\nTASK CONTEXT: [any additional context]",
    "task_due_date": "specific due date if mentioned (e.g., '2025-09-28', 'tomorrow', 'next Friday')",
    "task_priority": "high|normal|low based on urgency and importance"
  }
}

CRITICAL: Use ONLY the category KEYS (like "FAMILY", "WORK", "HEALTH", "SPAM", "JUNK", "PHISHING") in the categories array, NOT the full label names with numbers and emojis.

SELF-SENT EMAIL RULES:
- If From and To email addresses are identical, set is_self_sent: true
- Self-sent emails are NEVER spam (is_spam_or_junk: false, spam_indicators: [])
- Self-sent emails should be analyzed for regular importance and urgency based on content
- Self-sent emails are typically personal reminders, notes, or tasks - analyze accordingly

SPAM DETECTION RULES (ONLY for non-self-sent emails):
- If email is detected as spam/junk/phishing, set is_spam_or_junk: true
- Spam emails should be categorized as SPAM, JUNK, or PHISHING
- Spam emails are NEVER urgent or important (ai_urgent: false, ai_important: false)
- Always set ignoreCalendarEventCreation: true for spam emails
- Include specific spam_indicators array with detected red flags

URGENCY/IMPORTANCE ASSESSMENT:
- ai_urgent: Set to true if the email requires immediate action, has deadlines, or is time-sensitive (NEVER true for spam)
- ai_important: Set to true if the email affects your life goals, relationships, health, finances, or career (NEVER true for spam)
- These will be used as baseline, then overridden by any TRUE values from assigned category labels
- SPAM/FRAUD emails override all urgency/importance to FALSE

CALENDAR EVENT CREATION ASSESSMENT:
- ignoreCalendarEventCreation: Set to true if the email is:
  * SPAM, JUNK, or PHISHING (ALWAYS true for these)
  * From Google Calendar, Outlook, or other calendar systems
  * About events already scheduled/planned
  * Reminders for existing calendar events
  * Meeting invitations or calendar notifications
  * Any email that mentions "already scheduled", "in your calendar", "event created"
  * Vague timing like "sometime this week", "when convenient", "let's meet"
- Set to false only if the email clearly states a FINAL, specific date/time for a NEW task/event AND is not spam

TASK CREATION ASSESSMENT:
- should_create_task: Set to true if the email is:
  * Self-sent (From = To) AND contains actionable items
  * Contains task indicators: "need to", "should", "must", "remind me to", "don't forget", "todo", "task"
  * Russian indicators: "нужно", "должен", "напомни", "не забудь", "задача", "делать"
  * Has specific actionable items that need to be completed
- task_title: Create clear, actionable title (e.g., "Add family birthdays to calendar")
- task_notes: CRITICAL - Preserve ALL details from the original email with grammar/spelling corrections:
  * Include the FULL original email content with corrected grammar and spelling
  * Fix any typos, grammatical errors, or unclear sentences
  * Include ALL context, deadlines, specific requirements
  * Include ALL names, dates, locations, amounts, or other specific details
  * Include the original subject line (also corrected if needed)
  * Include any attachments or references mentioned
  * NEVER summarize or lose any information from the original email
  * Format: "ORIGINAL EMAIL (CORRECTED):\nSubject: [corrected subject]\nContent: [corrected email body with proper grammar and spelling]\n\nTASK CONTEXT: [additional context if needed]"
- task_due_date: Set if mentioned in email, otherwise leave empty
- task_priority: Set based on urgency/importance (high for urgent+important, normal for important, low for others)

CRITICAL: CALENDAR TIME FORMAT REQUIREMENTS:
- ALWAYS return specific, parseable dates in suggested_time
- PREFERRED formats: "2025-09-28T14:00:00" or "tomorrow 2pm" or "Friday 3pm"
- NEVER use vague terms like "after lunch", "sometime", "when convenient"
- If email says "tomorrow after lunch", convert to "tomorrow 2pm"
- If email says "this Friday", convert to "Friday 9am" or specific time
- If email says "next week", convert to specific date like "2025-10-03T09:00:00"
- NEVER suggest calendar events for SPAM/JUNK/PHISHING emails
`;

  const payload = {
    model: CONFIG.GPT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert email categorization AI with deep understanding of urgency, importance, life categories, and advanced spam detection. You excel at identifying spam, phishing, and fraud attempts across multiple languages. CRITICAL: You understand that self-sent emails (where From and To are the same) are NEVER spam - they are personal reminders or notes that should be analyzed for regular importance/urgency. You understand that spam emails should never be considered urgent or important, regardless of their claims. You always provide detailed reasoning for your decisions and focus on the PRIMARY category that best fits the email content. Your first priority is checking if an email is self-sent, then spam detection for non-self-sent emails. TASK CREATION CRITICAL RULE: When creating tasks from self-sent emails, you MUST preserve EVERY detail from the original email in the task_notes field while fixing grammar and spelling errors. Include the complete original email content with corrected grammar and spelling, all names, dates, amounts, locations, phone numbers, and any other specific details. Fix any typos, grammatical errors, or unclear sentences. NEVER summarize or lose any information - the task notes should be as detailed as the original email itself but with proper grammar and spelling.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1800,
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
  context += "- Spam email = SPAM (trash-worthy, never urgent/important)\n";
  context +=
    "- Phishing email = PHISHING (trash-worthy, never urgent/important)\n";
  context += "- Junk email = JUNK (trash-worthy, never urgent/important)\n";
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
  context +=
    "- Spam: 'выиграли', 'приз', 'деньги', 'подтвердите данные', 'срочно переведите'\n";
  context += "\n";

  // Spam detection context
  context += "SPAM DETECTION PRIORITY:\n";
  context +=
    "- ALWAYS check for spam/junk/phishing FIRST before any other analysis\n";
  context +=
    "- Spam emails are NEVER urgent or important, regardless of claims\n";
  context +=
    "- Common spam domains: suspicious TLDs, misspelled company names, random characters\n";
  context +=
    "- Spam content: money offers, prizes, urgent transfers, account verification requests\n";
  context +=
    "- Phishing: fake banks, government agencies, tech support, password resets\n";
  context +=
    "- Fraud: romance scams, investment schemes, cryptocurrency offers\n";
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

  // Check if this is spam/junk/phishing - these are never urgent or important
  const spamCategories = ["SPAM", "JUNK", "PHISHING"];
  const hasSpamCategory = categories.some((cat) =>
    spamCategories.includes(cat)
  );

  if (hasSpamCategory || analysis?.is_spam_or_junk) {
    console.log(
      "🎯 Detected spam/junk/phishing - forcing NOT_URGENT_NOT_IMPORTANT"
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
      from: "hospital@example.com",
      to: "user@example.com",
      body: "Your medical bill of $500 is due tomorrow. Please pay online.",
    },
    {
      subject: "Congratulations! You've won $1,000,000!",
      sender: "winner@fake-lottery.com",
      from: "winner@fake-lottery.com",
      to: "user@example.com",
      body: "Click here to claim your prize! Limited time offer! Send your bank details now!",
    },
    {
      subject: "Urgent: Verify your account immediately",
      sender: "security@bank-fake.com",
      from: "security@bank-fake.com",
      to: "user@example.com",
      body: "Your account will be suspended unless you verify your information by clicking this link.",
    },
    {
      subject: "Meeting tomorrow at 2pm",
      sender: "colleague@company.com",
      from: "colleague@company.com",
      to: "user@example.com",
      body: "Let's discuss the project tomorrow at 2pm in conference room A.",
    },
    {
      subject: "Important reminder to myself",
      sender: "user@example.com",
      from: "user@example.com",
      to: "user@example.com",
      body: "Need to add all family birthdays to calendar this weekend. This is urgent and important for family relationships.",
    },
    {
      subject: "Task: Review project proposal",
      sender: "user@example.com",
      from: "user@example.com",
      to: "user@example.com",
      body: "Don't forget to review the project proposal by tomorrow. This is important for work and needs to be done before the meeting.",
    },
  ];

  for (const email of testEmails) {
    console.log(`\n📧 Testing: ${email.subject}`);
    const analysis = analyzeEmailWithChatGPT(email);
    if (analysis) {
      console.log(`✅ Categories: ${analysis.categories.join(", ")}`);
      console.log(`📊 Quadrant: ${analysis.eisenhower_quadrant}`);
      console.log(`👤 Self-sent: ${analysis.is_self_sent || false}`);
      console.log(`🚨 Spam: ${analysis.is_spam_or_junk || false}`);
      console.log(
        `🎯 Priority: ${analysis.priorityInsights?.priorityLevel || "unknown"}`
      );
      if (analysis.spam_indicators && analysis.spam_indicators.length > 0) {
        console.log(
          `⚠️ Spam indicators: ${analysis.spam_indicators.join(", ")}`
        );
      }
      if (analysis.task_creation && analysis.task_creation.should_create_task) {
        console.log(`📝 Task creation: ${analysis.task_creation.task_title}`);
        console.log(`📋 Task notes: ${analysis.task_creation.task_notes}`);
        console.log(
          `📅 Due date: ${analysis.task_creation.task_due_date || "Not set"}`
        );
        console.log(`⚡ Priority: ${analysis.task_creation.task_priority}`);
      }
    } else {
      console.log("❌ Analysis failed");
    }
  }
}
