// ===== CONFIGURATION =====
const CONFIG = {
  // Your OpenAI API token - use PropertiesService for production
  OPENAI_API_KEY: "your-openai-api-key-here",

  // Processing configuration
  PROCESSING_MODE: "realtime", // 'realtime' or 'scheduled'
  REALTIME_ENABLED: true,
  REALTIME_FREQUENCY: 1, // minutes - as frequent as possible for real-time feel

  // Email processing limits
  BATCH_SIZE: 5,
  MAX_EMAILS_PER_RUN: 25,

  // Date Filtering Configuration
  PROCESS_FROM_DATE: null, // Will be set to current date on first run
  PROCESS_HISTORICAL_EMAILS: false, // Set to true to process emails before PROCESS_FROM_DATE

  // ChatGPT configuration
  GPT_MODEL: "gpt-4o", // Use smarter model for better accuracy

  // Eisenhower Matrix labels with hardcoded prefixes
  EISENHOWER_MATRIX: {
    URGENT_IMPORTANT: {
      name: "001: 🔴 Urgent + Important",
      color: "red",
      description: "Crises, burning deadlines, emergency situations",
      keepInInbox: true,
    },
    NOT_URGENT_IMPORTANT: {
      name: "002: 🟠 Not Urgent + Important",
      color: "orange",
      description: "Planning, development, relationship building",
      keepInInbox: true,
    },
    URGENT_NOT_IMPORTANT: {
      name: "003: 🟡 Urgent + Not Important",
      color: "yellow",
      description: "Interruptions, some calls, some meetings",
      keepInInbox: true,
    },
    NOT_URGENT_NOT_IMPORTANT: {
      name: "004: ⚫ Not Urgent + Not Important",
      color: "gray",
      description: "Time wasters, excessive TV, excessive social media",
      keepInInbox: false,
    },
  },

  // Label definitions with HARDCODED PREFIXES for deterministic sorting
  LABELS: {
    // Action labels for task management (010-025 range) - 5 distance
    REQUIRES_ACTION: {
      name: "010: ⚡ Requires Action",
      color: "red",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    HAS_DEADLINE: {
      name: "015: ⏰ Has Deadline",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    TO_PLAN: {
      name: "020: 📅 To Plan",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    DELEGATE: {
      name: "025: 👥 Delegate",
      color: "green",
      isUrgent: true,
      isImportant: false,
      moveToTrash: false,
    },

    // Critical life areas (030-045 range) - 5 distance
    EMERGENCY: {
      name: "030: 🚨 Emergency",
      color: "red",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    HEALTH: {
      name: "035: 🏥 Health",
      color: "red",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    MEDICAL: {
      name: "040: ⚕️ Medical",
      color: "red",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    LEGAL: {
      name: "045: ⚖️ Legal",
      color: "red",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },

    // Financial critical (050-074 range) - 5 distance
    BILLS: {
      name: "050: 💰 Bills",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    BANKING: {
      name: "055: 🏦 Banking",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    TAXES: {
      name: "060: 📑 Taxes",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    INSURANCE: {
      name: "065: 🛡️ Insurance",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    DEBT: {
      name: "070: 💳 Debt",
      color: "orange",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },

    // Work and income (080-140 range) - 10+ distance
    WORK: {
      name: "080: 💼 Work",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    BUSINESS: {
      name: "090: 🏢 Business",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    CAREER: {
      name: "100: 📈 Career",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    SALARY: {
      name: "110: 💵 Salary",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    PROJECTS: {
      name: "120: 📋 Projects",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    MEETINGS: {
      name: "130: 🤝 Meetings",
      color: "blue",
      isUrgent: true,
      isImportant: false,
      moveToTrash: false,
    },

    // Family and relationships (150-190 range) - 10+ distance
    FAMILY: {
      name: "150: 👨‍👩‍👧‍👦 Family",
      color: "green",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    CHILDREN: {
      name: "160: 👶 Children",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    RELATIONSHIPS: {
      name: "170: 💕 Relationships",
      color: "green",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    ELDERLY_CARE: {
      name: "180: 👴 Elderly Care",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },

    // Home and essentials (200-230 range) - 10+ distance
    HOME: {
      name: "200: 🏠 Home",
      color: "green",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    UTILITIES: {
      name: "210: 🔧 Utilities",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    REPAIRS: {
      name: "220: 🔨 Repairs",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    SECURITY: {
      name: "230: 🔒 Security",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },

    // Documents and government (250-280 range) - 10+ distance
    DOCUMENTS: {
      name: "250: 📄 Documents",
      color: "green",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    GOVERNMENT: {
      name: "260: 🏛️ Government",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    VISA_PASSPORT: {
      name: "270: 🛂 Visa/Passport",
      color: "green",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },

    // Transportation (300-330 range) - 10+ distance
    TRANSPORT: {
      name: "300: 🚗 Transport",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    CAR_SERVICE: {
      name: "310: 🔧 Car Service",
      color: "yellow",
      isUrgent: true,
      isImportant: true,
      moveToTrash: false,
    },
    TRAVEL: {
      name: "320: ✈️ Travel",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    TICKETS: {
      name: "330: 🎫 Tickets",
      color: "yellow",
      isUrgent: true,
      isImportant: false,
      moveToTrash: false,
    },

    // Development and investment (350-390 range) - 10+ distance
    INVESTMENTS: {
      name: "350: 📊 Investments",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    EDUCATION: {
      name: "360: 📚 Education",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    COURSES: {
      name: "370: 🎓 Courses",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    SKILLS: {
      name: "380: 🛠️ Skills",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    BOOKS: {
      name: "390: 📖 Books",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },

    // Health and fitness (400-420 range) - 10+ distance
    FITNESS: {
      name: "400: 💪 Fitness",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    WELLNESS: {
      name: "410: 🧘 Wellness",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    NUTRITION: {
      name: "420: 🥗 Nutrition",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },

    // Shopping and orders (450-480 range) - 10+ distance
    ORDERS: {
      name: "450: 📦 Orders",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    DELIVERY: {
      name: "460: 🚚 Delivery",
      color: "gray",
      isUrgent: true,
      isImportant: false,
      moveToTrash: false,
    },
    RETURNS: {
      name: "470: ↩️ Returns",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    WARRANTY: {
      name: "480: 🛡️ Warranty",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Subscriptions and services (500-530 range) - 10+ distance
    SUBSCRIPTIONS: {
      name: "500: 📱 Subscriptions",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    SOFTWARE: {
      name: "510: 💻 Software",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    CLOUD_SERVICES: {
      name: "520: ☁️ Cloud Services",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    STREAMING: {
      name: "530: 📺 Streaming",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Social connections (550-570 range) - 10+ distance
    FRIENDS: {
      name: "550: 👥 Friends",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    NETWORKING: {
      name: "560: 🤝 Networking",
      color: "gray",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    COMMUNITY: {
      name: "570: 🏘️ Community",
      color: "gray",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },

    // Regular shopping (580-590 range) - 10+ distance
    SHOPPING: {
      name: "580: 🛒 Shopping",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    GROCERIES: {
      name: "590: 🛍️ Groceries",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Leisure and entertainment (600-630 range) - 10+ distance
    HOBBIES: {
      name: "600: 🎨 Hobbies",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    EVENTS: {
      name: "610: 🎪 Events",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    CULTURE: {
      name: "620: 🎭 Culture",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    ENTERTAINMENT: {
      name: "630: 🎮 Entertainment",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Information (650-680 range) - 10+ distance
    NEWS: {
      name: "650: 📰 News",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    NEWSLETTERS: {
      name: "660: 📧 Newsletters",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    PROMOTIONS: {
      name: "670: 🏷️ Promotions",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    MARKETING: {
      name: "680: 📢 Marketing",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Processing labels for workflow management (700-750 range) - 10+ distance
    PROCESSED: {
      name: "700: ✅ Processed",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    INBOX_ZERO: {
      name: "710: 📥 Inbox Zero",
      color: "blue",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    TO_REVIEW: {
      name: "720: 👀 To Review",
      color: "yellow",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    WAITING_FOR: {
      name: "730: ⏰ Waiting For",
      color: "orange",
      isUrgent: false,
      isImportant: true,
      moveToTrash: false,
    },
    SOMEDAY_MAYBE: {
      name: "740: 🤔 Someday Maybe",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    REFERENCE: {
      name: "750: 📚 Reference",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },
    ARCHIVE_READY: {
      name: "760: 📦 Archive Ready",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: false,
    },

    // Junk and spam labels (800-820 range) - 10+ distance
    SPAM: {
      name: "800: 🗑️ Spam",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: true,
    },
    JUNK: {
      name: "810: ❌ Junk",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: true,
    },
    PHISHING: {
      name: "820: 🎣 Phishing",
      color: "gray",
      isUrgent: false,
      isImportant: false,
      moveToTrash: true,
    },
  },

  // Spreadsheet configuration
  SPREADSHEET_ID: "your-spreadsheet-id-here", // Will be overridden by getSecret in functions
};
