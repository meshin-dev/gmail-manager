
/**
 * Schedules a Google Calendar reminder for urgent tasks.
 * @param {GmailThread} thread - The Gmail thread
 * @param {Object} analysis - The AI analysis results
 * @returns {void}
 */
function scheduleUrgentReminder(thread, analysis) {
  try {
    console.log(
      "🔍 scheduleUrgentReminder called for:",
      thread.getFirstMessageSubject()
    );
    console.log("🔍 Analysis object:", JSON.stringify(analysis, null, 2));

    // Check if calendar event creation should be ignored
    if (
      analysis.calendar_scheduling &&
      analysis.calendar_scheduling.ignoreCalendarEventCreation
    ) {
      console.log(
        "🔍 Skipping calendar event creation - email is from calendar system or already scheduled"
      );
      console.log(
        "🔍 Reason: Email appears to be from existing calendar system or about already scheduled events"
      );
      return;
    }

    // Create reminder in Google Calendar
    const calendar = CalendarApp.getDefaultCalendar();
    console.log("🔍 Calendar object:", calendar ? "SUCCESS" : "FAILED");

    // Determine scheduling time based on AI suggestion or default
    let reminderTime, endTime;

    if (
      analysis.calendar_scheduling &&
      analysis.calendar_scheduling.is_ai_suggested &&
      analysis.calendar_scheduling.suggested_time
    ) {
      console.log(
        "🔍 Using AI-suggested timing:",
        analysis.calendar_scheduling.suggested_time
      );
      console.log(
        "🔍 Scheduling reason:",
        analysis.calendar_scheduling.scheduling_reason
      );

      // Parse AI-suggested time (basic implementation - can be enhanced)
      reminderTime = parseAISuggestedTime(
        analysis.calendar_scheduling.suggested_time
      );

      // Calculate event duration based on AI's estimated_time
      const estimatedDuration = parseEstimatedTime(analysis.estimated_time);
      endTime = new Date(reminderTime.getTime() + estimatedDuration);
    } else {
      console.log("🔍 Using default timing (30 minutes from now)");
      // Default: 30+ minutes from now to give buffer time
      const now = new Date();
      reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      // Calculate event duration based on AI's estimated_time
      const estimatedDuration = parseEstimatedTime(analysis.estimated_time);
      endTime = new Date(reminderTime.getTime() + estimatedDuration);
    }

    // Create the calendar event
    const event = calendar.createEvent(
      `🔴 URGENT: ${thread.getFirstMessageSubject()}`,
      reminderTime,
      endTime,
      `URGENT EMAIL REMINDER\n\n` +
        `Summary: ${analysis.summary || "No summary available"}\n` +
        `Action: ${analysis.suggested_action || "Review and take action"}\n` +
        `Deadline: ${analysis.deadline || "ASAP"}\n` +
        `Categories: ${analysis.categories.join(", ")}\n` +
        `Email Link: ${thread.getPermalink()}\n\n` +
        `This is an automated reminder for an urgent and important email.`
    );

    // Set reminder to notify 5 minutes before the event
    event.addPopupReminder(5);

    console.log(
      `⏰ Created urgent reminder for: ${thread.getFirstMessageSubject()}`
    );
    console.log(`📅 Reminder scheduled for: ${reminderTime.toLocaleString()}`);
  } catch (error) {
    console.error("❌ Error creating urgent reminder:", error);
    console.error("📝 Make sure Google Calendar API is enabled");
  }
}

