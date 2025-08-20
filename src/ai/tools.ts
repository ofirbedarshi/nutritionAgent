/**
 * OpenAI function calling tools for the Food Coach
 */

export const tools = [
  {
    type: "function" as const,
    function: {
      name: "set_preferences",
      description: "Update user coaching preferences",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["fat_loss", "muscle_gain", "maintenance", "general"],
            description: "User's fitness goal"
          },
          tone: {
            type: "string", 
            enum: ["friendly", "clinical", "funny"],
            description: "Communication tone preference"
          },
          reportTime: {
            type: "string",
            pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
            description: "Daily report time in HH:mm format (24-hour)"
          },
          focus: {
            type: "array",
            items: {
              type: "string",
              enum: ["protein", "veggies", "carbs", "late_eating", "home_cooking"]
            },
            description: "Areas of nutritional focus"
          },
          dietaryRestrictions: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Dietary restrictions or allergies"
          },
          storeMedia: {
            type: "boolean",
            description: "Whether to store media files (placeholder for future)"
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "log_meal",
      description: "Log a meal from free text description",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The meal description text"
          },
          when: {
            type: "string",
            description: "ISO 8601 datetime when the meal was consumed (optional, defaults to now)"
          }
        },
        required: ["text"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "request_summary",
      description: "Request a concise nutrition summary",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["daily", "weekly"],
            description: "Summary time period"
          },
          date: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Date for the summary in YYYY-MM-DD format (optional, defaults to today)"
          }
        },
        required: ["period"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "ask_coach",
      description: "General Q&A when no structured tool fits",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The user's question or request"
          }
        },
        required: ["question"],
        additionalProperties: false
      }
    }
  }
];

// Types are now centralized in src/types/index.ts 