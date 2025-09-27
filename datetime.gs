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
 * Parses AI-suggested time string into a Date object.
 * @param {string} suggestedTime - The AI-suggested time string
 * @returns {Date} The parsed date object
 */
function parseAISuggestedTime(suggestedTime) {
  const now = new Date();

  console.log("🔍 Parsing AI-suggested time:", suggestedTime);

  // Handle ISO format: "2025-09-28T14:00:00"
  if (suggestedTime.includes("T") && suggestedTime.includes(":")) {
    const parsedDate = new Date(suggestedTime);
    if (!isNaN(parsedDate.getTime())) {
      console.log("🔍 Parsed ISO format:", parsedDate);
      return parsedDate;
    }
  }

  // Handle "tomorrow 2pm", "Friday 3pm" format
  const lowerTime = suggestedTime.toLowerCase();

  // Handle "tomorrow" with specific time
  if (lowerTime.includes("tomorrow")) {
    const timeMatch = lowerTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    let hours = 9; // Default to 9 AM
    let minutes = 0;

    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];

      if (ampm === "pm" && hours !== 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);

    console.log("🔍 Parsed 'tomorrow' time:", tomorrow);
    return tomorrow;
  }

  // Handle "Friday 3pm", "Monday 9am" format
  const dayMatch = lowerTime.match(
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/
  );
  if (dayMatch) {
    const dayName = dayMatch[1];
    let hours = parseInt(dayMatch[2]);
    const minutes = dayMatch[3] ? parseInt(dayMatch[3]) : 0;
    const ampm = dayMatch[4];

    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const targetDay = dayNames.indexOf(dayName);
    const currentDay = now.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    const targetDate = daysUntilTarget === 0 ? 7 : daysUntilTarget; // If today, schedule for next week

    const result = new Date(now);
    result.setDate(now.getDate() + targetDate);
    result.setHours(hours, minutes, 0, 0);

    console.log("🔍 Parsed day format:", result);
    return result;
  }

  // Handle "today" with specific time
  if (lowerTime.includes("today")) {
    const timeMatch = lowerTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    let hours = 14; // Default to 2 PM
    let minutes = 0;

    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];

      if (ampm === "pm" && hours !== 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
    }

    const today = new Date(now);
    today.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (today <= now) {
      today.setDate(today.getDate() + 1);
    }

    console.log("🔍 Parsed 'today' time:", today);
    return today;
  }

  // Handle "asap" or "urgent"
  if (lowerTime.includes("asap") || lowerTime.includes("urgent")) {
    const asap = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    console.log("🔍 Parsed 'ASAP' time:", asap);
    return asap;
  }

  // Default fallback: 2 hours from now
  console.log("🔍 Using fallback time (2 hours from now)");
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

/**
 * Parses estimated time string into milliseconds.
 * @param {string} estimatedTime - The estimated time string (e.g., "1 hour", "30 minutes", "2 hours")
 * @returns {number} Duration in milliseconds
 */
function parseEstimatedTime(estimatedTime) {
  if (!estimatedTime) {
    console.log("🔍 No estimated time provided, using default 15 minutes");
    return 15 * 60 * 1000; // 15 minutes default
  }

  const lowerTime = estimatedTime.toLowerCase();
  console.log("🔍 Parsing estimated time:", estimatedTime);

  // Handle "1 hour", "2 hours", etc.
  const hourMatch = lowerTime.match(/(\d+)\s*hour/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]);
    const duration = hours * 60 * 60 * 1000;
    console.log(`🔍 Parsed ${hours} hour(s): ${duration}ms`);
    return duration;
  }

  // Handle "30 minutes", "45 minutes", etc.
  const minuteMatch = lowerTime.match(/(\d+)\s*minute/);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1]);
    const duration = minutes * 60 * 1000;
    console.log(`🔍 Parsed ${minutes} minute(s): ${duration}ms`);
    return duration;
  }

  // Handle "1h", "2h", etc.
  const hourShortMatch = lowerTime.match(/(\d+)h/);
  if (hourShortMatch) {
    const hours = parseInt(hourShortMatch[1]);
    const duration = hours * 60 * 60 * 1000;
    console.log(`🔍 Parsed ${hours}h: ${duration}ms`);
    return duration;
  }

  // Handle "30m", "45m", etc.
  const minuteShortMatch = lowerTime.match(/(\d+)m/);
  if (minuteShortMatch) {
    const minutes = parseInt(minuteShortMatch[1]);
    const duration = minutes * 60 * 1000;
    console.log(`🔍 Parsed ${minutes}m: ${duration}ms`);
    return duration;
  }

  // Default fallback: 15 minutes
  console.log("🔍 Could not parse estimated time, using default 15 minutes");
  return 15 * 60 * 1000;
}
