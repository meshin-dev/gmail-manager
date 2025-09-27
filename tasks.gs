/**
 * Creates a Google Task based on AI analysis of self-sent emails.
 * @param {Object} analysis - The AI analysis result containing task_creation data
 * @param {string} emailSubject - The email subject for context
 * @returns {Object|null} The created task object or null if failed
 */
function createGoogleTask(analysis, emailSubject) {
  try {
    if (!analysis.task_creation || !analysis.task_creation.should_create_task) {
      console.log("🔍 No task creation needed for this email");
      return null;
    }

    const taskData = analysis.task_creation;
    console.log("📝 Creating Google Task from self-sent email...");
    console.log(`📋 Task: ${taskData.task_title}`);

    // Get the default task list
    const taskList = Tasks.Tasklists.list();
    if (!taskList.items || taskList.items.length === 0) {
      console.error(
        "❌ No task lists found. Please create a task list in Google Tasks."
      );
      return null;
    }

    const defaultTaskListId = taskList.items[0].id;
    console.log(`📋 Using task list: ${taskList.items[0].title}`);

    // Prepare task object
    const task = {
      title: taskData.task_title,
      notes: taskData.task_notes || `Created from email: ${emailSubject}`,
      status: "needsAction",
    };

    // Set due date if provided
    if (taskData.task_due_date) {
      const dueDate = parseTaskDueDate(taskData.task_due_date);
      if (dueDate) {
        task.due = dueDate;
        console.log(`📅 Due date: ${dueDate}`);
      }
    }

    // Set priority
    if (taskData.task_priority) {
      const priorityMap = {
        high: "1",
        normal: "3",
        low: "5",
      };
      task.position = priorityMap[taskData.task_priority] || "3";
      console.log(`⚡ Priority: ${taskData.task_priority}`);
    }

    // Create the task
    const createdTask = Tasks.Tasks.insert(task, defaultTaskListId);

    console.log(`✅ Task created successfully: ${createdTask.title}`);
    console.log(`🔗 Task ID: ${createdTask.id}`);

    return createdTask;
  } catch (error) {
    console.error("❌ Error creating Google Task:", error);
    return null;
  }
}
